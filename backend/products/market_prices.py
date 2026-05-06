import logging
import os
import re
from html import unescape
from concurrent.futures import ThreadPoolExecutor, TimeoutError, as_completed
from statistics import mean
from typing import Any

import requests
from django.core.cache import cache
from rapidfuzz import fuzz

from .price_matching import normalize_product_name

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 60 * 60
MATCH_VERSION = "v2"
MIN_MATCH_SCORE = 72
STRICT_CORE_SCORE = 90
PROVIDER_TIMEOUT_SECONDS = float(os.environ.get("MARKET_PRICE_PROVIDER_TIMEOUT", "6"))
TOTAL_TIMEOUT_SECONDS = float(os.environ.get("MARKET_PRICE_TOTAL_TIMEOUT", "12"))
COLOR_WORDS = {
    "black", "white", "silver", "gold", "blue", "red", "green", "orange", "purple", "pink",
    "gray", "grey", "yellow", "midnight", "starlight", "titanium", "graphite", "cream",
    "alpine", "volcano", "desert", "phantom", "natural", "space",
}
NON_MODEL_WORDS = {
    "price", "in", "nepal", "china", "expected", "new", "official", "latest", "with",
    "and", "or", "rs", "npr", "cny", "gb", "tb", "ram", "rom",
}
DEFAULT_GADGETBYTE_URLS = (
    "https://www.gadgetbytenepal.com/category/mobile-price-in-nepal/,"
    "https://www.gadgetbytenepal.com/category/laptop-price-in-nepal/"
)


def _clean_name(name: str) -> str:
    return re.sub(r"\s*\([^)]*\)\s*$", "", unescape(name or "")).strip()


def _core_product_name(name: str) -> str:
    text = unescape(name or "").lower()
    text = re.sub(r"\([^)]*\)", " ", text)
    text = re.sub(r"\b\d+\s*(?:gb|tb)\s*/\s*\d+\s*(?:gb|tb)?\b", " ", text)
    text = re.sub(r"\b\d+\s*/\s*\d+\s*(?:gb|tb)?\b", " ", text)
    text = re.sub(r"\b\d+\s*(?:gb|tb|mm|inch|hz|mah|w)\b", " ", text)
    text = re.sub(r"\b\d+\+\d+\s*(?:gb|tb)?\b", " ", text)
    text = re.sub(r"\b(?:rs|npr|cny)\s*[\d,]+(?:\.\d+)?\b", " ", text)
    text = re.sub(r"[^a-z0-9\s+-]", " ", text)
    words = []
    for word in re.sub(r"\s+", " ", text).strip().split():
        cleaned = word.strip("+-")
        if not cleaned or cleaned in COLOR_WORDS or cleaned in NON_MODEL_WORDS:
            continue
        words.append(cleaned)
    return " ".join(words)


def _core_tokens(name: str) -> set[str]:
    return {token for token in _core_product_name(name).split() if token}


def _has_same_core_product(source_name: str, candidate_name: str) -> bool:
    source_core = _core_product_name(source_name)
    candidate_core = _core_product_name(candidate_name)
    source_tokens = _core_tokens(source_name)
    candidate_tokens = _core_tokens(candidate_name)
    if not source_core or not candidate_core or not source_tokens:
        return False

    # Same model numbers must stay the same. This prevents Xiaomi 14 Ultra
    # from matching Xiaomi 17 Ultra while still allowing storage/color variants.
    source_numbers = {token for token in source_tokens if token.isdigit()}
    candidate_numbers = {token for token in candidate_tokens if token.isdigit()}
    if source_numbers and not source_numbers.issubset(candidate_numbers):
        return False

    required_text_tokens = {token for token in source_tokens if not token.isdigit()}
    if required_text_tokens and not required_text_tokens.issubset(candidate_tokens):
        return False

    return fuzz.token_set_ratio(source_core, candidate_core) >= STRICT_CORE_SCORE


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
        if not _has_same_core_product(product_name, offer["name"]):
            continue
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
        current_product_heading = ""
        for row in rows:
            text = _strip_tags(row)
            if "Rs" not in text:
                if _has_same_core_product(query, text):
                    current_product_heading = text
                continue
            price_match = re.search(r"Rs\.?\s*([\d,]+(?:\.\d+)?)", text, flags=re.I)
            if not price_match:
                continue
            offer_name = text
            if not _has_same_core_product(query, offer_name):
                if not current_product_heading or not _has_same_core_product(query, current_product_heading):
                    continue
                offer_name = f"{current_product_heading} {text}"
            if not _has_same_core_product(query, offer_name):
                continue
            offer = _offer(offer_name, price_match.group(1), "GadgetByte Nepal", url)
            if offer:
                offers.append(offer)
    return offers


def get_market_price_snapshot(product) -> dict[str, Any]:
    query = _clean_name(product.name)
    cache_key = f"market_price_snapshot:{MATCH_VERSION}:{product.id}:{normalize_product_name(query)}"
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
