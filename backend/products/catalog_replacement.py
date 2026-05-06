from functools import lru_cache

from products.management.commands.import_gadgetbyte_catalog import TARGET_CATEGORIES
from products.models import Product


LEGACY_CATEGORY_NAME = 'Legacy Catalog'


def is_legacy_product(product):
    if product is None:
        return False
    category = getattr(product, 'category', None)
    return getattr(category, 'name', '') == LEGACY_CATEGORY_NAME


@lru_cache(maxsize=1)
def _visible_catalog_products():
    category_names = tuple(cat['name'] for cat in TARGET_CATEGORIES)
    return list(
        Product.objects
        .filter(category__name__in=category_names)
        .exclude(category__name=LEGACY_CATEGORY_NAME)
        .select_related('category', 'supplier')
        .order_by('owner_name', 'category__name', 'brand', 'name', 'id')
    )


def replacement_for_legacy(product, seed=0):
    """
    Return a stable visible catalog product for a legacy product.

    This is a display/runtime bridge for historic order rows that still point to
    old Product IDs. The management command can physically remap the DB later,
    but dashboards should never show the retired catalog while that data exists.
    """
    if not is_legacy_product(product):
        return product

    products = _visible_catalog_products()
    if not products:
        return product

    owner_name = (getattr(product, 'owner_name', '') or '').strip().lower()
    owner_pool = [p for p in products if owner_name and owner_name in (p.owner_name or '').strip().lower()]
    pool = owner_pool or products
    return pool[int(seed or getattr(product, 'id', 0) or 0) % len(pool)]


def display_product_for_detail(detail):
    seed = (getattr(detail, 'order_id', 0) or 0) * 37 + (getattr(detail, 'id', 0) or 0)
    return replacement_for_legacy(getattr(detail, 'product', None), seed)


def display_product_for_purchase_detail(detail):
    seed = (getattr(detail, 'purchase_order_id', 0) or 0) * 29 + (getattr(detail, 'id', 0) or 0)
    return replacement_for_legacy(getattr(detail, 'product', None), seed)
