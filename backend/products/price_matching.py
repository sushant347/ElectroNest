import logging
import re
from dataclasses import dataclass
from statistics import mean
from typing import Any

import requests
from django.conf import settings
from django.core.cache import cache
from rapidfuzz import fuzz
from sentence_transformers import SentenceTransformer
from sentence_transformers.util import cos_sim

logger = logging.getLogger(__name__)

EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
MATCH_THRESHOLD = 0.75
CACHE_TIMEOUT_SECONDS = 60 * 10

BRAND_PATTERN = re.compile(r"\b(hp|dell|lenovo|acer|asus|msi|apple|huawei|samsung)\b")
CPU_PATTERN = re.compile(
    r"\b(i3|i5|i7|i9|ryzen\s?3|ryzen\s?5|ryzen\s?7|ryzen\s?9|ultra\s?[3579])\b"
)
GPU_PATTERN = re.compile(
    r"\b(rtx\s?\d{3,4}|gtx\s?\d{3,4}|mx\s?\d{2,3}|radeon\s?rx\s?\d{3,4})\b"
)
RAM_PATTERN = re.compile(r"\b(4gb|8gb|12gb|16gb|24gb|32gb|64gb)\b")


@dataclass
class ProductFeatures:
    brand: str | None
    cpu: str | None
    gpu: str | None
    ram: str | None

    def to_dict(self) -> dict[str, str | None]:
        return {
            "brand": self.brand,
            "cpu": self.cpu,
            "gpu": self.gpu,
            "ram": self.ram,
        }


def normalize_product_name(text: str) -> str:
    """Lowercase, strip symbols, and normalize spaces."""
    text = (text or "").lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _extract_first(pattern: re.Pattern[str], text: str) -> str | None:
    match = pattern.search(text)
    if not match:
        return None
    return re.sub(r"\s+", " ", match.group(1).strip())


def extract_features(product_name: str) -> dict[str, str | None]:
    """Extract structured attributes from a normalized name."""
    normalized = normalize_product_name(product_name)
    features = ProductFeatures(
        brand=_extract_first(BRAND_PATTERN, normalized),
        cpu=_extract_first(CPU_PATTERN, normalized),
        gpu=_extract_first(GPU_PATTERN, normalized),
        ram=_extract_first(RAM_PATTERN, normalized),
    )
    return features.to_dict()


def _get_embedding_model() -> SentenceTransformer:
    """Lazy-load the transformer model to avoid import-time overhead."""
    model = cache.get("price_matching_embedding_model")
    if model is None:
        model = SentenceTransformer(EMBEDDING_MODEL_NAME)
        # Keep a short-lived cache to avoid repeated heavy loads in low-traffic windows.
        cache.set("price_matching_embedding_model", model, CACHE_TIMEOUT_SECONDS)
    return model


def get_embedding(product_name: str) -> Any:
    """Create an embedding vector for one product name."""
    model = _get_embedding_model()
    return model.encode(product_name, convert_to_tensor=True)


def compute_feature_match_score(
    source_features: dict[str, str | None], candidate_features: dict[str, str | None]
) -> float:
    score = 0.0
    if source_features.get("brand") and source_features["brand"] == candidate_features.get("brand"):
        score += 0.2
    if source_features.get("cpu") and source_features["cpu"] == candidate_features.get("cpu"):
        score += 0.3
    if source_features.get("gpu") and source_features["gpu"] == candidate_features.get("gpu"):
        score += 0.3
    if source_features.get("ram") and source_features["ram"] == candidate_features.get("ram"):
        score += 0.2
    return score


def compute_final_score(
    source_name: str,
    candidate_name: str,
    source_features: dict[str, str | None],
    candidate_features: dict[str, str | None],
) -> float:
    source_embedding = get_embedding(source_name)
    candidate_embedding = get_embedding(candidate_name)
    embedding_similarity = float(cos_sim(source_embedding, candidate_embedding).item())
    feature_score = compute_feature_match_score(source_features, candidate_features)

    # Small fuzzy bonus helps near-identical model names from different formatting.
    fuzzy_ratio = fuzz.token_set_ratio(source_name, candidate_name) / 100.0
    hybrid_score = 0.6 * embedding_similarity + 0.4 * feature_score
    return min(1.0, hybrid_score * 0.9 + fuzzy_ratio * 0.1)


def fetch_market_products(query: str) -> list[dict[str, Any]]:
    """
    Fetch comparable products from external providers.
    Currently mocked for safe local development.
    """
    normalized_query = normalize_product_name(query)

    mock_products = [
        {"name": "HP Victus i5 13420H RTX 3050 16GB", "price": 92000, "store": "Daraz"},
        {"name": "HP Victus i5 13420H RTX 3050 8GB", "price": 91000, "store": "ITTI"},
        {"name": "Lenovo LOQ i5 12450H RTX 3050 16GB", "price": 94000, "store": "Hukut"},
        {"name": "Dell G15 i7 13620H RTX 4060 16GB", "price": 132000, "store": "NeoStore"},
    ]

    # Keep a requests touchpoint so replacing with real API stays straightforward.
    # This call is intentionally disabled unless MARKET_PRODUCTS_URL is configured.
    market_url = getattr(settings, "MARKET_PRODUCTS_URL", "")
    if market_url:
        try:
            response = requests.get(market_url, params={"q": query}, timeout=4)
            response.raise_for_status()
            payload = response.json()
            if isinstance(payload, list):
                return payload
        except requests.RequestException as exc:
            logger.warning("Market API request failed, using mock data: %s", exc)

    query_tokens = normalized_query.split()
    first_token = query_tokens[0] if query_tokens else ""
    if not first_token:
        return mock_products
    return [p for p in mock_products if first_token in normalize_product_name(p["name"])]


def get_price_comparison(product_name: str, my_price: float) -> dict[str, Any]:
    if not product_name:
        raise ValueError("product_name is required")

    source_clean_name = normalize_product_name(product_name)
    source_features = extract_features(source_clean_name)

    market_products = fetch_market_products(source_clean_name)
    matched_products: list[dict[str, Any]] = []

    for product in market_products:
        candidate_name = str(product.get("name", ""))
        candidate_price = product.get("price")
        if not candidate_name or candidate_price is None:
            continue

        cleaned_candidate_name = normalize_product_name(candidate_name)
        candidate_features = extract_features(cleaned_candidate_name)
        final_score = compute_final_score(
            source_name=source_clean_name,
            candidate_name=cleaned_candidate_name,
            source_features=source_features,
            candidate_features=candidate_features,
        )

        if final_score > MATCH_THRESHOLD:
            matched_products.append(
                {
                    "name": candidate_name,
                    "price": float(candidate_price),
                    "store": product.get("store", "Unknown"),
                    "score": round(final_score, 4),
                    "features": candidate_features,
                }
            )

    prices = [item["price"] for item in matched_products]
    average_price = round(mean(prices), 2) if prices else None
    lowest_price = min(prices) if prices else None

    savings = round((average_price - my_price), 2) if average_price is not None else None
    result = {
        "matched_products": sorted(matched_products, key=lambda item: item["score"], reverse=True),
        "average_price": average_price,
        "lowest_price": lowest_price,
        "your_price": float(my_price),
        "savings": savings,
    }
    logger.info(
        "Price comparison complete for '%s' with %s matches.",
        product_name,
        len(matched_products),
    )
    return result
