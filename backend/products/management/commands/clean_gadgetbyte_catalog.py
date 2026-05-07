import json
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import CustomUser
from products.management.commands.import_gadgetbyte_catalog import (
    OWNER_FALLBACKS,
    TARGET_CATEGORIES,
    _stable_index,
    _stock_for,
    _discounted_price,
)
from products.models import Product, ProductVariant


BLOCKED_SPEC_KEYS = {'source', 'source url', 'source_url'}


def _clean_specs(raw):
    if not raw:
        return ''
    try:
        payload = json.loads(raw)
    except (TypeError, ValueError):
        return raw
    if not isinstance(payload, dict):
        return raw
    cleaned = {
        key: value
        for key, value in payload.items()
        if str(key).strip().lower() not in BLOCKED_SPEC_KEYS
    }
    return json.dumps(cleaned, ensure_ascii=False)[:3000]


def _owner_names():
    owners = []
    for user in CustomUser.objects.filter(role='owner', is_active=True).order_by('id'):
        name = f"{user.first_name} {user.last_name}".strip()
        if name:
            owners.append(name)
    return owners or OWNER_FALLBACKS


def _owner_for(seed, owners):
    return owners[_stable_index(seed, len(owners))]


class Command(BaseCommand):
    help = 'Clean imported GadgetByte catalog specs, owners, and stock values.'

    def add_arguments(self, parser):
        parser.add_argument('--min-stock', type=int, default=7)
        parser.add_argument('--max-stock', type=int, default=32)

    @transaction.atomic
    def handle(self, *args, **options):
        min_stock = max(0, options['min_stock'])
        max_stock = max(min_stock, options['max_stock'])
        owners = _owner_names()
        target_names = [cat['name'] for cat in TARGET_CATEGORIES]
        products = Product.objects.filter(category__name__in=target_names).order_by('id')

        product_count = 0
        variant_count = 0
        for product in products:
            seed = product.sku or product.id or product.name
            product.stock = _stock_for(seed, min_stock, max_stock)
            product.reorder_level = min(6, max(1, product.stock // 3))
            product.owner_name = _owner_for(seed, owners)
            product.specifications = _clean_specs(product.specifications)
            product.save(update_fields=['selling_price', 'cost_price', 'stock', 'reorder_level', 'owner_name', 'specifications'])
            product_count += 1

            for variant in ProductVariant.objects.filter(product=product):
                variant_seed = variant.source_id or variant.sku or variant.id
                variant.discount_price = None
                variant.stock = _stock_for(variant_seed, min_stock, max_stock)
                variant.save(update_fields=['discount_price', 'stock'])
                variant_count += 1

        self.stdout.write(self.style.SUCCESS(
            f'Cleaned {product_count} products and {variant_count} variants across {len(target_names)} categories.'
        ))
