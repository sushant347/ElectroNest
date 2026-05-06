import json
import hashlib
import re
from datetime import date
from decimal import Decimal, InvalidOperation
from html import unescape

import requests
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import ProtectedError
from django.utils import timezone
from django.utils.html import strip_tags

from accounts.models import CustomUser
from products.models import Category, Product, ProductVariant, Review, MarketPriceSnapshot


API_BASE = 'https://api.gadgetbytenepal.com/api/v1'
TARGET_CATEGORIES = [
    {'id': 1000, 'name': 'Smartphones', 'slug': 'mobiles'},
    {'id': 1001, 'name': 'Laptops', 'slug': 'laptops'},
    {'id': 1002, 'name': 'Monitors', 'slug': 'monitors'},
    {'id': 1003, 'name': 'Tablets', 'slug': 'tablets'},
    {'id': 1004, 'name': 'Drones', 'slug': 'drones'},
    {'id': 1005, 'name': 'Smartwatches', 'slug': 'smartwatches'},
    {'id': 1006, 'name': 'PC Builds', 'slug': 'pc-build'},
    {'id': 1007, 'name': 'Speakers', 'slug': 'speakers'},
    {'id': 1008, 'name': 'Earbuds', 'slug': 'earbuds'},
    {'id': 1009, 'name': 'Headphones', 'slug': 'headphones'},
]
OWNER_FALLBACKS = [
    'Oliz Store',
    'Evo Store Nepal',
    'CG Digital',
    'SuperStore Nepal',
    'Paramount Electronics',
    'Neo Store Nepal',
    'Himalayan Tech',
    'Gadget World',
    'Tech Hub Nepal',
    'Hukut Store',
]
GENERIC_CATEGORY_WORDS = {
    'laptops', 'smartphones', 'mobiles', 'tablets', 'drones', 'smartwatches',
    'speakers', 'monitors', 'pc builds', 'pc-build', 'earbuds', 'headphones',
    'mobile phones', 'phones', 'laptop price in nepal', 'mobile price in nepal',
}
BRAND_SUFFIXES = (
    ' Mobile Phones', ' Smartphones', ' Laptops', ' Tablets', ' Smartwatches',
    ' Earbuds', ' Headphones', ' Speakers', ' Monitors', ' Drones', ' Price',
    ' Series',
)
BRAND_ALIASES = {
    'Apple iPhones': 'Apple',
    'iPhones': 'Apple',
    'Oppo': 'OPPO',
}


def _money(value, default='0.00'):
    if value in (None, '', 'null'):
        return Decimal(default)
    try:
        return Decimal(str(value).replace(',', '')).quantize(Decimal('0.01'))
    except (InvalidOperation, ValueError):
        return Decimal(default)


def _clean_text(value, limit=None):
    text = re.sub(r'\s+', ' ', strip_tags(unescape(str(value or '')))).strip()
    return text[:limit] if limit else text


def _base_name(title):
    title = _clean_text(title)
    title = re.sub(r'\s*\([^)]*\)\s*$', '', title).strip()
    title = re.sub(r'\s+', ' ', title)
    return title[:100]


def _dedupe_key(name):
    text = name.lower()
    text = re.sub(r'\([^)]*\)', ' ', text)
    text = re.sub(r'\b\d+\s*(gb|tb|hz|mah|w|inch|")\b', ' ', text)
    text = re.sub(r'[^a-z0-9]+', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


def _extract_brand(item, fallback_name):
    candidates = []
    for rel in item.get('categories') or []:
        cat = rel.get('category') or {}
        name = (cat.get('name') or '').strip()
        if not name:
            continue
        lowered = name.lower()
        if lowered in GENERIC_CATEGORY_WORDS or lowered.endswith((' series', ' price')):
            continue
        candidates.append(name)

    for name in candidates:
        brand = BRAND_ALIASES.get(name, name)
        for suffix in BRAND_SUFFIXES:
            if brand.lower().endswith(suffix.lower()):
                brand = brand[: -len(suffix)].strip()
        if brand and brand.lower() not in GENERIC_CATEGORY_WORDS:
            return BRAND_ALIASES.get(brand, brand)[:50]

    fallback = (fallback_name.split(' ', 1)[0] if fallback_name else '').strip()
    if fallback.lower() == 'iphone':
        return 'Apple'
    return fallback[:50]


def _extract_full_description(item):
    return _clean_text(
        item.get('description')
        or item.get('delimited_description')
        or item.get('short_description')
        or item.get('seo_description'),
        2200,
    )


def _extract_specs(item):
    specs = {}
    for row in item.get('product_specifications') or []:
        spec = row.get('specification') or {}
        name = _clean_text(spec.get('name'), 80)
        value = _clean_text(row.get('values'), 180)
        if name and value and name.lower() not in {'source', 'source url', 'source_url'}:
            specs[name] = value
    full_description = _extract_full_description(item)
    if full_description:
        specs['_full_description'] = full_description
    return specs


def _variant_title(variant, fallback='Standard'):
    raw = _clean_text(variant.get('title') or variant.get('sku_code') or fallback, 120)
    return raw or fallback


def _vendor_details(item):
    raw = item.get('vendor_details') or {}
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw or '{}')
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return raw if isinstance(raw, dict) else {}


def _stable_index(seed, length):
    if length <= 0:
        return 0
    digest = hashlib.sha256(str(seed or '').encode('utf-8')).hexdigest()
    return int(digest[:12], 16) % length


def _stock_for(seed, minimum=7, maximum=32):
    span = max(1, maximum - minimum + 1)
    return minimum + _stable_index(seed, span)


def _owner_names():
    owners = []
    for user in CustomUser.objects.filter(role='owner', is_active=True).order_by('id'):
        name = f"{user.first_name} {user.last_name}".strip()
        if name:
            owners.append(name)
    return owners or OWNER_FALLBACKS


def _owner_for(seed, owners):
    return owners[_stable_index(seed, len(owners))]


def _discount_percent(seed):
    return Decimal(5 + (_stable_index(seed, 1001) / 100)).quantize(Decimal('0.01'))


def _discounted_price(actual_price, seed):
    actual = _money(actual_price, '1.00')
    discount = _discount_percent(seed)
    return max(Decimal('1.00'), (actual * ((Decimal('100') - discount) / Decimal('100'))).quantize(Decimal('0.01')))


def _month_start(months_ago=0):
    today = timezone.localdate()
    month_index = today.month - months_ago
    year = today.year + ((month_index - 1) // 12)
    month = ((month_index - 1) % 12) + 1
    return date(year, month, 1)


def _trend_multiplier(seed, months_ago):
    if months_ago == 0:
        return Decimal('1')
    drift = Decimal(_stable_index(f"{seed}-{months_ago}", 41) - 20) / Decimal('1000')
    age_lift = Decimal(months_ago) * Decimal('0.012')
    return Decimal('1') + age_lift + drift


def _store_market_snapshots(product, item, actual_price):
    offers = [{
        'name': product.name,
        'price': float(actual_price),
        'original_price': float(actual_price),
        'currency': 'NPR',
        'conversion_rate': None,
        'store': 'GadgetByte Nepal',
        'url': f"https://www.gadgetbytenepal.com/product/{item.get('slug')}" if item.get('slug') else '',
        'score': 1,
        'spec_match_score': 1,
    }]
    seed = item.get('id') or product.sku or product.id
    for months_ago in (2, 1, 0):
        market_price = (actual_price * _trend_multiplier(seed, months_ago)).quantize(Decimal('0.01'))
        spread_percent = Decimal('0.025') + (Decimal(_stable_index(f"{seed}-spread-{months_ago}", 36)) / Decimal('1000'))
        low = (market_price * (Decimal('1') - spread_percent)).quantize(Decimal('0.01'))
        high = (market_price * (Decimal('1') + (spread_percent / Decimal('2')))).quantize(Decimal('0.01'))
        MarketPriceSnapshot.objects.update_or_create(
            product=product,
            month=_month_start(months_ago),
            defaults={
                'market_price': market_price,
                'lowest_market_price': low,
                'highest_market_price': high,
                'volatility_percent': (spread_percent * Decimal('100')).quantize(Decimal('0.01')),
                'source': 'gadgetbyte_api',
                'currency_note': 'Market baseline fetched from GadgetByte Nepal product API.',
                'offers_json': json.dumps(offers),
            },
        )


class Command(BaseCommand):
    help = 'Import unique products and variants from GadgetByte Nepal categories.'

    def add_arguments(self, parser):
        parser.add_argument('--per-category', type=int, default=32, help='Unique base products to import per category.')
        parser.add_argument('--replace', action='store_true', help='Remove old non-ordered catalog rows after importing.')
        parser.add_argument('--timeout', type=int, default=20, help='HTTP timeout in seconds.')
        parser.add_argument('--preserve-images', action='store_true', help='Reuse an existing matching product image when one exists.')
        parser.add_argument('--min-stock', type=int, default=7, help='Minimum stock assigned to imported products and variants.')
        parser.add_argument('--max-stock', type=int, default=32, help='Maximum stock assigned to imported products and variants.')

    def _fetch_category(self, slug, limit, timeout):
        products = []
        seen = set()
        page = 1
        while len(products) < limit:
            url = f'{API_BASE}/frontend/product'
            res = requests.get(url, params={'category_slug': slug, 'page': page}, timeout=timeout)
            res.raise_for_status()
            payload = res.json()
            rows = payload.get('data') or []
            if not rows:
                break
            for item in rows:
                name = _base_name(item.get('title'))
                key = _dedupe_key(name)
                if not name or key in seen:
                    continue
                seen.add(key)
                products.append(item)
                if len(products) >= limit:
                    break
            meta = payload.get('meta') or {}
            if not meta.get('has_next_page') or page >= int(meta.get('last_page') or page):
                break
            page += 1
        return products

    def _snapshot_old_images(self):
        images = {}
        for product in Product.objects.exclude(image_url='').only('name', 'image_url'):
            images.setdefault(_dedupe_key(_base_name(product.name)), product.image_url)
        return images

    def _preserve_reviews(self, new_products):
        if not new_products:
            return 0
        product_ids = [p.id for p in new_products]
        reviews = list(Review.objects.exclude(product_id__in=product_ids).order_by('id'))
        moved = 0
        for idx, review in enumerate(reviews):
            target = new_products[idx % len(new_products)]
            if Review.objects.filter(product=target, customer_id=review.customer_id).exists():
                continue
            review.product = target
            review.save(update_fields=['product'])
            moved += 1
        return moved

    def _cleanup_old_catalog(self, keep_ids):
        deleted = 0
        legacy_category, _ = Category.objects.get_or_create(name='Legacy Catalog')
        for product in Product.objects.exclude(id__in=keep_ids):
            try:
                product.delete()
                deleted += 1
            except ProtectedError:
                # Keep products that are tied to order history.
                if product.category_id != legacy_category.id:
                    product.category = legacy_category
                    product.save(update_fields=['category'])
                continue
        target_names = {c['name'] for c in TARGET_CATEGORIES}
        Category.objects.exclude(name__in=target_names | {'Legacy Catalog'}).filter(product__isnull=True).delete()
        return deleted

    @transaction.atomic
    def handle(self, *args, **options):
        per_category = max(1, min(options['per_category'], 100))
        min_stock = max(0, options['min_stock'])
        max_stock = max(min_stock, options['max_stock'])
        owners = _owner_names()
        old_images = self._snapshot_old_images() if options['preserve_images'] else {}
        target_categories = {}

        for cat in TARGET_CATEGORIES:
            category, _ = Category.objects.update_or_create(
                id=cat['id'],
                defaults={'name': cat['name']},
            )
            target_categories[cat['slug']] = category

        imported_products = []
        for cat in TARGET_CATEGORIES:
            category = target_categories[cat['slug']]
            self.stdout.write(f"Fetching {cat['name']} from GadgetByte...")
            rows = self._fetch_category(cat['slug'], per_category, options['timeout'])
            for item in rows:
                name = _base_name(item.get('title'))
                source_id = str(item.get('id') or '')
                variants = item.get('variants') or []
                variant_prices = [_money(v.get('discount_price') if _money(v.get('discount_price')) > 0 else v.get('price')) for v in variants]
                vendor = _vendor_details(item)
                base_price = min([p for p in variant_prices if p > 0] or [_money(vendor.get('discount_price') or vendor.get('price') or 1, '1.00')])
                platform_price = _discounted_price(base_price, source_id or name)
                cost_price = max(Decimal('1.00'), (platform_price * Decimal('0.82')).quantize(Decimal('0.01')))
                key = _dedupe_key(name)
                image_url = old_images.get(key) or item.get('image_url') or ''
                product_stock = _stock_for(source_id or name, min_stock, max_stock)

                product, _ = Product.objects.update_or_create(
                    sku=f"GBN-{source_id}",
                    defaults={
                        'name': name,
                        'category': category,
                        'brand': _extract_brand(item, name),
                        'owner_name': _owner_for(source_id or name, owners),
                        'selling_price': platform_price,
                        'cost_price': cost_price,
                        'discount_price': None,
                        'stock': product_stock,
                        'reorder_level': min(6, max(1, product_stock // 3)),
                        'description': _clean_text(item.get('short_description') or item.get('seo_description') or item.get('description'), 255),
                        'image_url': image_url[:255],
                        'specifications': json.dumps(_extract_specs(item), ensure_ascii=False)[:3000],
                    },
                )
                _store_market_snapshots(product, item, base_price)
                ProductVariant.objects.filter(product=product).delete()
                if not variants:
                    variants = [{'id': f'{source_id}-std', 'title': 'Standard', 'price': str(base_price), 'is_default': 'Y'}]
                seen_variant_titles = set()
                for idx, variant in enumerate(variants):
                    actual_variant_price = _money(variant.get('discount_price') or variant.get('price'), str(base_price))
                    if actual_variant_price <= 0:
                        actual_variant_price = base_price
                    price = _discounted_price(actual_variant_price, variant.get('id') or variant.get('sku_code') or f"{source_id}-{idx}")
                    discount = None
                    title = _variant_title(variant, 'Standard')
                    if title in seen_variant_titles:
                        title = _clean_text(variant.get('sku_code') or f"{title} #{idx + 1}", 120)
                    if title in seen_variant_titles:
                        title = f"{title} #{idx + 1}"[:120]
                    seen_variant_titles.add(title)
                    ProductVariant.objects.create(
                        product=product,
                        title=title,
                        sku=_clean_text(variant.get('sku_code') or f"GBN-{source_id}-{idx + 1}", 80),
                        specs=_clean_text(variant.get('title') or variant.get('sku_code'), 500),
                        price=price,
                        discount_price=discount,
                        stock=_stock_for(variant.get('id') or variant.get('sku_code') or f"{source_id}-{idx}", min_stock, max_stock),
                        source_id=str(variant.get('id') or ''),
                        is_default=variant.get('is_default') == 'Y' or idx == 0,
                        is_active=variant.get('is_active', 'Y') == 'Y',
                    )
                imported_products.append(product)
            self.stdout.write(self.style.SUCCESS(f"{cat['name']}: imported {len(rows)} unique products"))

        moved_reviews = self._preserve_reviews(imported_products)
        deleted = self._cleanup_old_catalog([p.id for p in imported_products]) if options['replace'] else 0

        self.stdout.write(self.style.SUCCESS(
            f"Done. Imported {len(imported_products)} products, moved {moved_reviews} reviews"
            + (f", removed {deleted} old non-ordered products." if options['replace'] else ".")
        ))
