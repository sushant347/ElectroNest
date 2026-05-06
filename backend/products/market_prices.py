import logging
import os
import re
from concurrent.futures import ThreadPoolExecutor, TimeoutError, as_completed
from statistics import mean
from typing import Any

import requests
from django.core.cache import cache
from rapidfuzz import fuzz

from .price_matching import normalize_product_name

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 60 * 60
MIN_MATCH_SCORE = 58
PROVIDER_TIMEOUT_SECONDS = float(os.environ.get("MARKET_PRICE_PROVIDER_TIMEOUT", "6"))
TOTAL_TIMEOUT_SECONDS = float(os.environ.get("MARKET_PRICE_TOTAL_TIMEOUT", "12"))
DEFAULT_GADGETBYTE_URLS = (
    "https://www.gadgetbytenepal.com/category/mobile-price-in-nepal/,"
    "https://www.gadgetbytenepal.com/category/laptop-price-in-nepal/"
)


def _clean_name(name: str) -> str:
    return re.sub(r"\s*\([^)]*\)\s*$", "", name or "").strip()


def _price_to_float(value: Any) -> float | None:
    if value in (None, ""):
        return None
    text = str(value)
    match = re.search(r"(\d[\d,]*(?:\.\d+)?)", text.replace("NPR", "").replace("Rs.", ""))
    if not match:
        return None
    try:
        return float(match.group(1).replace(",", ""))
    except ValueError:
        return None


def _offer(name: str, price: Any, store: str, url: str = "") -> dict[str, Any] | None:
    parsed_price = _price_to_float(price)
    if not name or parsed_price is None or parsed_price <= 0:
        return None
    return {
        "name": str(name).strip(),
        "price": round(parsed_price, 2),
        "store": store,
        "url": url,
    }


def _extract_offers(payload: Any, store: str) -> list[dict[str, Any]]:
    if isinstance(payload, dict):
        for key in ("offers", "results", "items", "products", "data"):
            if key in payload:
                return _extract_offers(payload[key], store)
        name = payload.get("name") or payload.get("title") or payload.get("productName")
        price = payload.get("price") or payload.get("selling_price") or payload.get("salePrice")
        url = payload.get("url") or payload.get("link") or payload.get("productUrl") or ""
        item_store = payload.get("store") or payload.get("merchant") or payload.get("seller") or store
        offer = _offer(name, price, item_store, url)
        return [offer] if offer else []

    if isinstance(payload, list):
        offers = []
        for item in payload:
            offers.extend(_extract_offers(item, store))
        return offers

    return []


def _match_offers(product_name: str, offers: list[dict[str, Any]]) -> list[dict[str, Any]]:
    source = normalize_product_name(_clean_name(product_name))
    matched = []
    for offer in offers:
        candidate = normalize_product_name(_clean_name(offer["name"]))
        score = fuzz.token_set_ratio(source, candidate)
        if score >= MIN_MATCH_SCORE:
            matched.append({**offer, "score": round(score / 100, 4)})
    return sorted(matched, key=lambda item: (-item["score"], item["price"]))


def _fetch_custom_market_url(query: str) -> list[dict[str, Any]]:
    market_url = os.environ.get("MARKET_PRODUCTS_URL", "").strip()
    if not market_url:
        return []
    try:
        response = requests.get(market_url, params={"q": query}, timeout=PROVIDER_TIMEOUT_SECONDS)
        response.raise_for_status()
        return _extract_offers(response.json(), "Configured Market API")
    except (requests.RequestException, ValueError) as exc:
        logger.warning("Configured market API failed: %s", exc)
        return []


def _fetch_pricesapi(query: str) -> list[dict[str, Any]]:
    api_key = os.environ.get("PRICESAPI_KEY", "").strip()
    if not api_key:
        return []
    try:
        response = requests.get(
            "https://api.pricesapi.io/api/v1/products/search",
            params={"q": query, "api_key": api_key},
            timeout=PROVIDER_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        return _extract_offers(response.json(), "PricesAPI")
    except (requests.RequestException, ValueError) as exc:
        logger.warning("PricesAPI fetch failed: %s", exc)
        return []


def _fetch_daraz_apify(query: str) -> list[dict[str, Any]]:
    token = os.environ.get("APIFY_TOKEN", "").strip()
    actor = os.environ.get("APIFY_DARAZ_ACTOR", "mellow_mint/daraz-scraper").strip()
    if not token:
        return []
    actor_id = actor.replace("/", "~")
    url = f"https://api.apify.com/v2/acts/{actor_id}/run-sync-get-dataset-items"
    payload = {
        "search": query,
        "searchUrls": [f"https://www.daraz.com.np/catalog/?q={requests.utils.quote(query)}"],
        "maxItems": 8,
    }
    try:
        response = requests.post(url, params={"token": token}, json=payload, timeout=TOTAL_TIMEOUT_SECONDS)
        response.raise_for_status()
        return _extract_offers(response.json(), "Daraz Nepal")
    except (requests.RequestException, ValueError) as exc:
        logger.warning("Daraz Apify fetch failed: %s", exc)
        return []


def _strip_tags(html: str) -> str:
    text = re.sub(r"<script[\s\S]*?</script>|<style[\s\S]*?</style>", " ", html, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _fetch_gadgetbyte(query: str) -> list[dict[str, Any]]:
    urls = [
        item.strip()
        for item in os.environ.get("GADGETBYTE_PRICE_URLS", DEFAULT_GADGETBYTE_URLS).split(",")
        if item.strip()
    ]
    offers: list[dict[str, Any]] = []
    headers = {"User-Agent": "ElectroNest price comparison bot/1.0"}
    for url in urls:
        try:
            response = requests.get(url, headers=headers, timeout=PROVIDER_TIMEOUT_SECONDS)
            response.raise_for_status()
        except requests.RequestException as exc:
            logger.warning("GadgetByte fetch failed for %s: %s", url, exc)
            continue

        rows = re.findall(r"<tr[\s\S]*?</tr>", response.text, flags=re.I)
        for row in rows:
            text = _strip_tags(row)
            if "Rs" not in text:
                continue
            price_match = re.search(r"Rs\.?\s*([\d,]+(?:\.\d+)?)", text, flags=re.I)
            if not price_match:
                continue
            score = fuzz.token_set_ratio(normalize_product_name(query), normalize_product_name(text))
            if score < MIN_MATCH_SCORE:
                continue
            offer = _offer(text, price_match.group(1), "GadgetByte Nepal", url)
            if offer:
                offers.append(offer)
    return offers


def get_market_price_snapshot(product) -> dict[str, Any]:
    query = _clean_name(product.name)
    cache_key = f"market_price_snapshot:{product.id}:{normalize_product_name(query)}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    all_offers = []
    fetchers = (_fetch_custom_market_url, _fetch_pricesapi, _fetch_daraz_apify, _fetch_gadgetbyte)
    executor = ThreadPoolExecutor(max_workers=len(fetchers))
    try:
        future_map = {executor.submit(fetcher, query): fetcher.__name__ for fetcher in fetchers}
        try:
            completed = as_completed(future_map, timeout=TOTAL_TIMEOUT_SECONDS)
            for future in completed:
                try:
                    all_offers.extend(future.result(timeout=0))
                except Exception as exc:
                    logger.warning("%s failed while fetching market prices: %s", future_map[future], exc)
        except TimeoutError:
            logger.warning("Market price fetch timed out for %s", query)
        finally:
            for future in future_map:
                future.cancel()
    finally:
        executor.shutdown(wait=False, cancel_futures=True)

    matched = _match_offers(product.name, all_offers)
    unique = []
    seen = set()
    for offer in matched:
        key = (offer["store"], offer["name"], offer["price"])
        if key in seen:
            continue
        seen.add(key)
        unique.append(offer)

    prices = [offer["price"] for offer in unique[:8]]
    volatility = 0
    if len(prices) > 1:
        average_price = mean(prices)
        if average_price:
            volatility = round(((max(prices) - min(prices)) / average_price) * 100, 1)
    snapshot = {
        "market_price": round(mean(prices), 2) if prices else None,
        "lowest_market_price": min(prices) if prices else None,
        "highest_market_price": max(prices) if prices else None,
        "market_volatility_percent": volatility,
        "offers": unique[:8],
        "source": "live_market_api" if prices else "fallback",
    }
    cache.set(cache_key, snapshot, CACHE_TTL_SECONDS)
    return snapshot
