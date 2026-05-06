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
MATCH_VERSION = "v6"
MIN_MATCH_SCORE = 72
STRICT_CORE_SCORE = 90
PROVIDER_TIMEOUT_SECONDS = float(os.environ.get("MARKET_PRICE_PROVIDER_TIMEOUT", "6"))
TOTAL_TIMEOUT_SECONDS = float(os.environ.get("MARKET_PRICE_TOTAL_TIMEOUT", "12"))
USD_TO_NPR_RATE = float(os.environ.get("USD_TO_NPR_RATE", "140"))
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
GADGETBYTE_MOBILE_URL = "https://www.gadgetbytenepal.com/category/mobile-price-in-nepal/"
GADGETBYTE_LAPTOP_URL = "https://www.gadgetbytenepal.com/category/laptop-price-in-nepal/"


def _clean_name(name: str) -> str:
    return re.sub(r"\s*\([^)]*\)\s*$", "", unescape(name or "")).strip()


def _variant_text(name: str) -> str:
    parts = re.findall(r"\(([^)]*)\)", unescape(name or ""))
    return " ".join(parts)


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


def _spec_tokens(name: str) -> set[str]:
    text = unescape(name or "").lower()
    specs = set()
    for match in re.findall(r"\b\d+\s*(?:gb|tb|mm|inch|hz|mah|w)\b", text):
        specs.add(re.sub(r"\s+", "", match))
    for match in re.findall(r"\b\d+\s*/\s*\d+\s*(?:gb|tb)?\b", text):
        specs.add(re.sub(r"\s+", "", match))
    for match in re.findall(r"\b\d+\+\d+\s*(?:gb|tb)?\b", text):
        specs.add(re.sub(r"\s+", "", match))
    for match in re.findall(r"\b(?:i[3579]|ryzen\s?[3579]|ultra\s?[3579]|rtx\s?\d{3,4}|gtx\s?\d{3,4})\b", text):
        specs.add(re.sub(r"\s+", "", match))
    return specs


def _search_specs(name: str) -> list[str]:
    text = f"{unescape(name or '')} {_variant_text(name)}".lower()
    specs = []
    patterns = [
        r"\b\d+\s*(?:gb|tb)?\s*/\s*\d+\s*(?:gb|tb)?\b",
        r"\b\d+\s*\+\s*\d+\s*(?:gb|tb)?\b",
        r"\b\d+\s*(?:gb|tb)\b",
        r"\b(?:i[3579]|ryzen\s?[3579]|ultra\s?[3579]|rtx\s?\d{3,4}|gtx\s?\d{3,4})\b",
    ]
    for pattern in patterns:
        for match in re.findall(pattern, text):
            value = match if isinstance(match, str) else " ".join(match)
            normalized = re.sub(r"\s+", "", value).upper()
            if any(existing.endswith(f"/{normalized}") or existing.endswith(f"+{normalized}") for existing in specs):
                continue
            if normalized and normalized not in specs:
                specs.append(normalized)
    return specs[:4]


def _market_search_query(name: str) -> str:
    core = _core_product_name(name)
    specs = _search_specs(name)
    return " ".join([core, *specs]).strip() or _clean_name(name)


def _storage_values(name: str) -> tuple[int | None, int | None]:
    text = unescape(name or "").lower()
    match = re.search(r"\b(\d+)\s*(?:gb|tb)?\s*/\s*(\d+)\s*(gb|tb)?\b", text)
    if not match:
        match = re.search(r"\b(\d+)\s*\+\s*(\d+)\s*(gb|tb)?\b", text)
    if not match:
        return None, None
    ram = int(match.group(1))
    storage = int(match.group(2))
    unit = match.group(3) or "gb"
    if unit == "tb":
        storage *= 1024
    return ram, storage


def _nearest_storage_score(source_name: str, candidate_name: str) -> float:
    source_ram, source_storage = _storage_values(source_name)
    candidate_ram, candidate_storage = _storage_values(candidate_name)
    if source_ram is None or source_storage is None:
        return 1
    if candidate_ram is None or candidate_storage is None:
        return 0
    ram_gap = abs(candidate_ram - source_ram) / max(source_ram, candidate_ram, 1)
    storage_gap = abs(candidate_storage - source_storage) / max(source_storage, candidate_storage, 1)
    return max(0, 1 - ((ram_gap * 0.45) + (storage_gap * 0.55)))


def _is_close_spec_variant(source_name: str, candidate_name: str) -> bool:
    source_ram, source_storage = _storage_values(source_name)
    candidate_ram, candidate_storage = _storage_values(candidate_name)
    if source_ram is None or source_storage is None:
        return True
    if candidate_ram is None or candidate_storage is None:
        return False
    return (
        abs(candidate_ram - source_ram) <= max(4, source_ram * 0.5)
        and abs(candidate_storage - source_storage) <= max(128, source_storage)
    )


def _spec_match_score(source_name: str, candidate_name: str) -> float:
    source_specs = _spec_tokens(source_name)
    candidate_specs = _spec_tokens(candidate_name)
    storage_score = _nearest_storage_score(source_name, candidate_name)
    if not source_specs:
        return storage_score
    if not candidate_specs:
        return storage_score * 0.8
    overlap = len(source_specs & candidate_specs)
    token_score = overlap / len(source_specs)
    return max(token_score, storage_score * 0.95)


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
    match = re.search(r"(\d[\d,]*(?:\.\d+)?)", text.replace("NPR", "").replace("USD", "").replace("Rs.", ""))
    if not match:
        return None
    try:
        return float(match.group(1).replace(",", ""))
    except ValueError:
        return None


def _detect_currency(value: Any, fallback: str = "NPR") -> str:
    text = str(value or "").lower()
    if "$" in text or "usd" in text:
        return "USD"
    if "npr" in text or "rs" in text:
        return "NPR"
    return fallback


def _offer(
    name: str,
    price: Any,
    store: str,
    url: str = "",
    currency: str | None = None,
    default_currency: str = "NPR",
) -> dict[str, Any] | None:
    parsed_price = _price_to_float(price)
    if not name or parsed_price is None or parsed_price <= 0:
        return None
    detected_currency = currency or _detect_currency(price, default_currency)
    original_price = round(parsed_price, 2)
    if detected_currency.upper() == "USD":
        parsed_price = parsed_price * USD_TO_NPR_RATE
    return {
        "name": str(name).strip(),
        "price": round(parsed_price, 2),
        "original_price": original_price,
        "currency": detected_currency.upper(),
        "conversion_rate": USD_TO_NPR_RATE if detected_currency.upper() == "USD" else None,
        "store": store,
        "url": url,
    }


def _extract_offers(payload: Any, store: str, default_currency: str = "NPR") -> list[dict[str, Any]]:
    if isinstance(payload, dict):
        for key in ("offers", "results", "items", "products", "data"):
            if key in payload:
                return _extract_offers(payload[key], store, default_currency)
        name = payload.get("name") or payload.get("title") or payload.get("productName")
        price = payload.get("price") or payload.get("selling_price") or payload.get("salePrice")
        currency = payload.get("currency") or payload.get("priceCurrency")
        url = payload.get("url") or payload.get("link") or payload.get("productUrl") or ""
        item_store = payload.get("store") or payload.get("merchant") or payload.get("seller") or store
        offer = _offer(name, price, item_store, url, currency=currency, default_currency=default_currency)
        return [offer] if offer else []

    if isinstance(payload, list):
        offers = []
        for item in payload:
            offers.extend(_extract_offers(item, store, default_currency))
        return offers

    return []


def _extract_ebay_offers(payload: Any) -> list[dict[str, Any]]:
    items = payload.get("itemSummaries") if isinstance(payload, dict) else []
    offers: list[dict[str, Any]] = []
    if not isinstance(items, list):
        return offers
    for item in items:
        price_info = item.get("price") or {}
        offer = _offer(
            item.get("title"),
            price_info.get("value"),
            "eBay",
            item.get("itemWebUrl") or "",
            currency=price_info.get("currency") or "USD",
            default_currency="USD",
        )
        if offer:
            offers.append(offer)
    return offers


def _match_offers(product_name: str, offers: list[dict[str, Any]], allow_nearest_spec: bool = False) -> list[dict[str, Any]]:
    source = normalize_product_name(_clean_name(product_name))
    matched = []
    for offer in offers:
        if not _has_same_core_product(product_name, offer["name"]):
            continue
        candidate = normalize_product_name(_clean_name(offer["name"]))
        score = fuzz.token_set_ratio(source, candidate)
        spec_score = _spec_match_score(product_name, offer["name"])
        if not allow_nearest_spec and spec_score < 1:
            continue
        if score >= MIN_MATCH_SCORE or spec_score > 0:
            final_score = (score / 100 * 0.7) + (spec_score * 0.3)
            matched.append({**offer, "score": round(final_score, 4), "spec_match_score": round(spec_score, 4)})

    if allow_nearest_spec and matched and _spec_tokens(product_name):
        best_spec_score = max(item["spec_match_score"] for item in matched)
        matched = [item for item in matched if item["spec_match_score"] == best_spec_score]
    return sorted(matched, key=lambda item: (-item["spec_match_score"], -item["score"], item["price"]))


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


def _fetch_international_market_url(query: str) -> list[dict[str, Any]]:
    market_url = os.environ.get("INTERNATIONAL_MARKET_PRODUCTS_URL", "").strip()
    if not market_url:
        return []
    try:
        response = requests.get(market_url, params={"q": query}, timeout=PROVIDER_TIMEOUT_SECONDS)
        response.raise_for_status()
        offers = _extract_offers(response.json(), "International Market API", default_currency="USD")
        return [{**offer, "store": offer["store"] or "International Market API"} for offer in offers]
    except (requests.RequestException, ValueError) as exc:
        logger.warning("Configured international market API failed: %s", exc)
        return []


def _fetch_international_pricesapi(query: str) -> list[dict[str, Any]]:
    api_key = os.environ.get("INTERNATIONAL_PRICESAPI_KEY", os.environ.get("PRICESAPI_KEY", "")).strip()
    if not api_key:
        return []
    try:
        response = requests.get(
            "https://api.pricesapi.io/api/v1/products/search",
            params={"q": query, "api_key": api_key, "country": "US"},
            timeout=PROVIDER_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        return _extract_offers(response.json(), "International PricesAPI", default_currency="USD")
    except (requests.RequestException, ValueError) as exc:
        logger.warning("International PricesAPI fetch failed: %s", exc)
        return []


def _fetch_ebay_browse_api(query: str) -> list[dict[str, Any]]:
    token = os.environ.get("EBAY_BEARER_TOKEN", "").strip()
    if not token:
        return []
    try:
        response = requests.get(
            "https://api.ebay.com/buy/browse/v1/item_summary/search",
            params={"q": query, "limit": 10, "filter": "buyingOptions:{FIXED_PRICE}"},
            headers={"Authorization": f"Bearer {token}", "X-EBAY-C-MARKETPLACE-ID": "EBAY_US"},
            timeout=PROVIDER_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        return _extract_ebay_offers(response.json())
    except (requests.RequestException, ValueError) as exc:
        logger.warning("eBay international fetch failed: %s", exc)
        return []


def _fetch_amazon_apify(query: str) -> list[dict[str, Any]]:
    token = os.environ.get("APIFY_TOKEN", "").strip()
    actor = os.environ.get("APIFY_AMAZON_ACTOR", "junglee/amazon-crawler").strip()
    if not token:
        return []
    actor_id = actor.replace("/", "~")
    url = f"https://api.apify.com/v2/acts/{actor_id}/run-sync-get-dataset-items"
    payload = {
        "categoryOrProductUrls": [{"url": f"https://www.amazon.com/s?k={requests.utils.quote(query)}"}],
        "maxItems": 10,
        "proxyConfiguration": {"useApifyProxy": True},
    }
    try:
        response = requests.post(url, params={"token": token}, json=payload, timeout=TOTAL_TIMEOUT_SECONDS)
        response.raise_for_status()
        return _extract_offers(response.json(), "Amazon US", default_currency="USD")
    except (requests.RequestException, ValueError) as exc:
        logger.warning("Amazon Apify fetch failed: %s", exc)
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
    return re.sub(r"\s+", " ", unescape(text)).strip()


def _display_offer_name(name: str) -> str:
    text = unescape(name or "")
    text = re.sub(r"&#x27;|&quot;|&amp;", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _is_phone_product(text: str) -> bool:
    hay = normalize_product_name(text)
    return any(word in hay.split() for word in ("phone", "smartphone", "iphone", "galaxy", "redmi", "xiaomi", "oneplus", "realme", "vivo", "oppo", "honor"))


def _is_laptop_product(text: str) -> bool:
    hay = normalize_product_name(text)
    return any(word in hay.split() for word in ("laptop", "notebook", "swift", "aspire", "vivobook", "zenbook", "thinkpad", "ideapad", "macbook", "victus", "loq"))


def _gadgetbyte_urls_for_query(query: str) -> list[str]:
    if _is_phone_product(query):
        return [os.environ.get("GADGETBYTE_MOBILE_PRICE_URL", GADGETBYTE_MOBILE_URL)]
    if _is_laptop_product(query):
        return [os.environ.get("GADGETBYTE_LAPTOP_PRICE_URL", GADGETBYTE_LAPTOP_URL)]
    return [
        item.strip()
        for item in os.environ.get("GADGETBYTE_PRICE_URLS", DEFAULT_GADGETBYTE_URLS).split(",")
        if item.strip()
    ]


def _fetch_gadgetbyte(query: str) -> list[dict[str, Any]]:
    urls = _gadgetbyte_urls_for_query(query)
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
            offer = _offer(_display_offer_name(offer_name), price_match.group(1), "GadgetByte Nepal", url)
            if offer:
                offers.append(offer)
    return offers


def _fetch_offers(query: str, fetchers: tuple) -> list[dict[str, Any]]:
    all_offers = []
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
    return all_offers


def _build_snapshot(offers: list[dict[str, Any]], source: str) -> dict[str, Any]:
    unique = []
    seen = set()
    for offer in offers:
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
    return {
        "market_price": round(mean(prices), 2) if prices else None,
        "lowest_market_price": min(prices) if prices else None,
        "highest_market_price": max(prices) if prices else None,
        "market_volatility_percent": volatility,
        "offers": unique[:8],
        "source": source if prices else "no_live_market_data",
        "currency_note": "USD offers converted to NPR at 1 USD = NPR 140" if source == "international_market_api" else "",
    }


def get_market_price_snapshot(product) -> dict[str, Any]:
    query = _market_search_query(product.name)
    cache_key = f"market_price_snapshot:{MATCH_VERSION}:{product.id}:{normalize_product_name(query)}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    nepal_fetchers = (_fetch_custom_market_url, _fetch_daraz_apify, _fetch_gadgetbyte)
    nepal_offers = _fetch_offers(query, nepal_fetchers)
    nepal_matches = _match_offers(product.name, nepal_offers, allow_nearest_spec=False)
    if not nepal_matches:
        nepal_matches = _match_offers(product.name, nepal_offers, allow_nearest_spec=True)
        nepal_matches = [
            offer for offer in nepal_matches
            if offer.get("spec_match_score", 0) >= 0.65 and _is_close_spec_variant(product.name, offer["name"])
        ]
    snapshot = _build_snapshot(nepal_matches, "live_market_api")

    if snapshot["market_price"] is None:
        international_fetchers = (
            _fetch_international_market_url,
            _fetch_international_pricesapi,
            _fetch_ebay_browse_api,
            _fetch_amazon_apify,
        )
        international_matches = _match_offers(
            product.name,
            _fetch_offers(query, international_fetchers),
            allow_nearest_spec=True,
        )
        snapshot = _build_snapshot(international_matches, "international_market_api")

    cache.set(cache_key, snapshot, CACHE_TTL_SECONDS)
    return snapshot
