import json
import re
from decimal import Decimal, InvalidOperation

from django.core.management.base import BaseCommand
from django.db import IntegrityError
from products.management.commands.import_gadgetbyte_catalog import _discounted_price, _stock_for
from products.models import MarketPriceSnapshot, Product, ProductVariant


def _money(value, default='0.00'):
    try:
        return Decimal(str(value).replace(',', '')).quantize(Decimal('0.01'))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal(default)


def _clean(value, limit=120):
    text = re.sub(r'\s+', ' ', str(value or '')).strip()
    return text[:limit]


def _variant_title(product_name, offer_name, fallback):
    title = _clean(offer_name, 260)
    product_name = _clean(product_name, 180)
    if product_name and title.lower().startswith(product_name.lower()):
        title = title[len(product_name):].strip()
    if title.startswith('(') and ')' in title:
        title = title[1:title.rfind(')')].strip()
    title = re.sub(r'\s+Rs\.\s*[\d,.]+.*$', '', title).strip()
    return _clean(title or fallback, 120)


def _savings_percent(market_price, store_price):
    if market_price <= 0:
        return Decimal('0.00')
    return (((market_price - store_price) / market_price) * Decimal('100')).quantize(Decimal('0.01'))


def _needs_price_fix(market_price, store_price):
    savings = _savings_percent(market_price, store_price)
    return store_price >= market_price or savings < Decimal('5.00') or savings > Decimal('15.00')


def _load_offers(snapshot):
    try:
        offers = json.loads(snapshot.offers_json or '[]')
    except (json.JSONDecodeError, TypeError):
        return []
    if not isinstance(offers, list):
        return []
    return [offer for offer in offers if isinstance(offer, dict) and _money(offer.get('price')) > 0]


class Command(BaseCommand):
    help = 'Create real selectable product variants from market offer prices and keep store prices 5-15% below market.'

    def add_arguments(self, parser):
        parser.add_argument('--product-id', type=int)
        parser.add_argument('--limit', type=int, default=0)
        parser.add_argument('--min-stock', type=int, default=7)
        parser.add_argument('--max-stock', type=int, default=32)

    def handle(self, *args, **options):
        min_stock = max(0, options['min_stock'])
        max_stock = max(min_stock, options['max_stock'])
        snapshot_qs = (
            MarketPriceSnapshot.objects
            .filter(market_price__isnull=False)
            .select_related('product')
            .order_by('product_id', '-month')
        )
        if options.get('product_id'):
            snapshot_qs = snapshot_qs.filter(product_id=options['product_id'])

        latest_by_product = {}
        for snapshot in snapshot_qs:
            latest_by_product.setdefault(snapshot.product_id, snapshot)

        product_ids = list(latest_by_product)
        if options.get('limit'):
            product_ids = product_ids[:options['limit']]
        products = (
            Product.objects
            .filter(id__in=product_ids)
            .prefetch_related('variants')
            .order_by('id')
        )

        touched_products = 0
        touched_variants = 0

        for product in products:
            snapshot = latest_by_product.get(product.id)
            if not snapshot:
                continue
            offers = _load_offers(snapshot)
            if not offers:
                continue

            current_market_variants = [v for v in product.variants.all() if (v.source_id or '').startswith('market-offer:') and v.is_active]
            if len(current_market_variants) == len(offers):
                prices_ok = True
                title_updates = []
                target_titles = set()
                for idx, offer in enumerate(offers):
                    market_price = _money(offer.get('price'))
                    variant = next((v for v in current_market_variants if v.source_id == f'market-offer:{idx + 1}'), None)
                    expected_title = _variant_title(product.name, offer.get('name'), 'Product Details')
                    if expected_title in target_titles:
                        expected_title = _clean(f'{expected_title} #{idx + 1}', 120)
                    target_titles.add(expected_title)
                    if not variant or market_price <= 0 or _needs_price_fix(market_price, variant.price):
                        prices_ok = False
                        break
                    if expected_title and variant.title != expected_title:
                        title_updates.append((variant, expected_title))
                if prices_ok:
                    for variant, title in title_updates:
                        title_exists = ProductVariant.objects.filter(product=product, title=title).exclude(id=variant.id).exists()
                        if title_exists:
                            continue
                        variant.title = title
                        variant.specs = title
                        try:
                            variant.save(update_fields=['title', 'specs', 'updated_at'])
                            touched_variants += 1
                        except IntegrityError:
                            continue
                    continue

            product_variants = []
            seen_titles = set()
            for idx, offer in enumerate(offers):
                market_price = _money(offer.get('price'))
                if market_price <= 0:
                    continue
                title = _variant_title(product.name, offer.get('name'), 'Product Details')
                if title in seen_titles:
                    title = _clean(f'{title} #{idx + 1}', 120)
                seen_titles.add(title)
                source_id = f'market-offer:{idx + 1}'
                store_price = _discounted_price(market_price, f'{product.sku}-{source_id}')
                stock = _stock_for(f'{product.sku}-{source_id}', min_stock, max_stock)
                variant, _ = ProductVariant.objects.update_or_create(
                    product=product,
                    title=title,
                    defaults={
                        'sku': _clean(f'{product.sku}-MKT-{idx + 1}', 80),
                        'specs': title,
                        'price': store_price,
                        'discount_price': None,
                        'stock': stock,
                        'source_id': source_id,
                        'is_default': idx == 0,
                        'is_active': True,
                    },
                )
                product_variants.append(variant)
                touched_variants += 1

            if not product_variants:
                continue

            ProductVariant.objects.filter(product=product).exclude(id__in=[v.id for v in product_variants]).update(is_active=False)
            cheapest = min(product_variants, key=lambda item: item.price)
            ProductVariant.objects.filter(product=product).update(is_default=False)
            cheapest.is_default = True
            cheapest.save(update_fields=['is_default', 'updated_at'])

            product.selling_price = cheapest.price
            product.cost_price = max(Decimal('1.00'), (cheapest.price * Decimal('0.82')).quantize(Decimal('0.01')))
            product.stock = sum(v.stock for v in product_variants)
            product.reorder_level = min(6, max(1, product.stock // 3))
            product.save(update_fields=['selling_price', 'cost_price', 'stock', 'reorder_level'])
            touched_products += 1

        option_variants = list(
            ProductVariant.objects
            .filter(title__istartswith='Option ')
            .order_by('product_id', 'id')
        )
        option_ids = {variant.id for variant in option_variants}
        affected_product_ids = {variant.product_id for variant in option_variants}
        used_titles_by_product = {product_id: set() for product_id in affected_product_ids}
        for product_id, variant_id, title in ProductVariant.objects.filter(product_id__in=affected_product_ids).values_list('product_id', 'id', 'title'):
            if variant_id not in option_ids:
                used_titles_by_product.setdefault(product_id, set()).add(title)
        variants_to_update = []
        for variant in option_variants:
            if not re.match(r'^option\s+\d+$', variant.title or '', re.I):
                continue
            used = used_titles_by_product.setdefault(variant.product_id, set())
            title = 'Product Details'
            suffix = 2
            while title in used:
                title = f'Product Details #{suffix}'
                suffix += 1
            variant.title = title
            variant.specs = '' if re.match(r'^option\s+\d+$', variant.specs or '', re.I) else variant.specs
            used.add(title)
            variants_to_update.append(variant)
        if variants_to_update:
            ProductVariant.objects.bulk_update(variants_to_update, ['title', 'specs', 'updated_at'], batch_size=200)
            touched_variants += len(variants_to_update)

        self.stdout.write(self.style.SUCCESS(
            f'Synced {touched_variants} market-offer variants across {touched_products} products.'
        ))
