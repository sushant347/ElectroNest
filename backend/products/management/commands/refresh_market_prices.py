import json
from datetime import date
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from products.market_prices import get_market_price_snapshot
from products.models import MarketPriceSnapshot, Product


def _decimal_or_none(value):
    if value is None:
        return None
    return Decimal(str(value)).quantize(Decimal('0.01'))


class Command(BaseCommand):
    help = "Fetch market prices and store one monthly snapshot per product."

    def add_arguments(self, parser):
        parser.add_argument('--month', help='Snapshot month in YYYY-MM format. Defaults to current month.')
        parser.add_argument('--product-id', type=int, help='Refresh only one product.')
        parser.add_argument('--limit', type=int, default=0, help='Maximum products to refresh. 0 means no limit.')
        parser.add_argument('--missing-only', action='store_true', help='Skip products already refreshed for the month.')

    def handle(self, *args, **options):
        if options.get('month'):
            year, month = [int(part) for part in options['month'].split('-', 1)]
            snapshot_month = date(year, month, 1)
        else:
            now = timezone.localdate()
            snapshot_month = date(now.year, now.month, 1)

        qs = Product.objects.all().order_by('id')
        if options.get('product_id'):
            qs = qs.filter(id=options['product_id'])
        if options.get('missing_only'):
            existing_ids = MarketPriceSnapshot.objects.filter(month=snapshot_month).values_list('product_id', flat=True)
            qs = qs.exclude(id__in=existing_ids)
        if options.get('limit'):
            qs = qs[:options['limit']]

        created = 0
        updated = 0
        skipped = 0

        for product in qs:
            snapshot = get_market_price_snapshot(product)
            if not snapshot.get('market_price'):
                skipped += 1
                self.stdout.write(self.style.WARNING(f"Skipped {product.id}: {product.name} (no market offer)"))
                continue

            _, was_created = MarketPriceSnapshot.objects.update_or_create(
                product=product,
                month=snapshot_month,
                defaults={
                    'market_price': _decimal_or_none(snapshot.get('market_price')),
                    'lowest_market_price': _decimal_or_none(snapshot.get('lowest_market_price')),
                    'highest_market_price': _decimal_or_none(snapshot.get('highest_market_price')),
                    'volatility_percent': _decimal_or_none(snapshot.get('market_volatility_percent') or 0) or Decimal('0.00'),
                    'source': snapshot.get('source', 'live_market_api'),
                    'currency_note': snapshot.get('currency_note', ''),
                    'offers_json': json.dumps(snapshot.get('offers', [])),
                },
            )
            created += 1 if was_created else 0
            updated += 0 if was_created else 1
            self.stdout.write(self.style.SUCCESS(f"Stored {product.id}: {product.name}"))

        self.stdout.write(self.style.SUCCESS(
            f"Market snapshots for {snapshot_month}: {created} created, {updated} updated, {skipped} skipped."
        ))
