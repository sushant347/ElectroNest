from decimal import Decimal

from django.core.cache import cache
from django.core.management.base import BaseCommand
from django.db.models import Count

from orders.models import Order, Payment, PaymentMethod


PAYMENT_METHODS = ('Cash', 'Esewa', 'Khalti', 'Bank')
PAYMENT_METHOD_ALIASES = {
    'Cash': ('Cash', 'Cash on Delivery', 'COD'),
    'Esewa': ('Esewa', 'eSewa', 'ESewa'),
    'Khalti': ('Khalti',),
    'Bank': ('Bank', 'BankTransfer', 'Bank Transfer'),
}


class Command(BaseCommand):
    help = 'Create missing payment rows for existing orders using Cash, Esewa, Khalti, and Bank.'

    def add_arguments(self, parser):
        parser.add_argument('--database', default='default', help='Database alias to update.')
        parser.add_argument('--batch-size', type=int, default=1000)
        parser.add_argument('--dry-run', action='store_true')
        parser.add_argument('--clear-cache', action='store_true')

    def handle(self, *args, **options):
        db = options['database']
        batch_size = max(100, options['batch_size'])
        dry_run = options['dry_run']

        if not dry_run:
            self._normalize_method_names(db)
        method_map = self._payment_method_map(db)
        missing = [name for name in PAYMENT_METHODS if name not in method_map]
        if missing:
            raise SystemExit(f'Missing payment methods in {db}: {", ".join(missing)}')
        invalid_payment_ids = list(
            Payment.objects.using(db)
            .exclude(method_id__in=set(method_map.values()))
            .values_list('id', flat=True)
        )

        orders_qs = (
            Order.objects.using(db)
            .annotate(payment_count=Count('payments'))
            .filter(payment_count=0)
            .order_by('id')
        )
        order_ids = list(orders_qs.values_list('id', flat=True))
        total_missing = len(order_ids)
        if dry_run:
            self.stdout.write(f'{db}: would create {total_missing} payments')
            self.stdout.write(f'{db}: would remap {len(invalid_payment_ids)} payments outside Cash/Esewa/Khalti/Bank')
            return

        remapped = self._normalize_existing_payments(db, invalid_payment_ids, method_map, batch_size)
        created = 0
        for start in range(0, len(order_ids), batch_size):
            chunk_ids = order_ids[start:start + batch_size]
            orders = (
                Order.objects.using(db)
                .filter(id__in=chunk_ids)
                .prefetch_related('details')
                .order_by('id')
            )
            batch = []
            for order in orders:
                method_name = PAYMENT_METHODS[order.id % len(PAYMENT_METHODS)]
                payable = self._order_payable_amount(order)
                batch.append(Payment(
                    order_id=order.id,
                    method_id=method_map[method_name],
                    discount_percent=Decimal('0'),
                    payable_amount=payable,
                ))
            created += self._bulk_create(db, batch)

        if options['clear_cache']:
            cache.clear()

        self.stdout.write(self.style.SUCCESS(
            f'{db}: created {created} payments; remapped {remapped} payments; orders without payments before backfill: {total_missing}'
        ))

    def _normalize_method_names(self, db):
        for canonical, aliases in PAYMENT_METHOD_ALIASES.items():
            canonical_row = PaymentMethod.objects.using(db).filter(name=canonical).first()
            if canonical_row:
                continue
            legacy = PaymentMethod.objects.using(db).filter(name__in=aliases[1:]).first()
            if legacy:
                legacy.name = canonical
                legacy.save(using=db, update_fields=['name'])

    def _payment_method_map(self, db):
        method_map = {}
        methods = PaymentMethod.objects.using(db).all()
        for method in methods:
            for canonical, aliases in PAYMENT_METHOD_ALIASES.items():
                if method.name in aliases:
                    method_map.setdefault(canonical, method.id)
        return method_map

    def _order_payable_amount(self, order):
        subtotal = Decimal('0')
        for detail in order.details.all():
            subtotal += Decimal(detail.quantity or 0) * Decimal(detail.unit_price or 0)
        shipping = Decimal(order.shipping_cost or 0)
        return subtotal + shipping

    def _bulk_create(self, db, batch):
        Payment.objects.using(db).bulk_create(batch, batch_size=len(batch))
        return len(batch)

    def _normalize_existing_payments(self, db, payment_ids, method_map, batch_size):
        remapped = 0
        for start in range(0, len(payment_ids), batch_size):
            chunk_ids = payment_ids[start:start + batch_size]
            payments = list(Payment.objects.using(db).filter(id__in=chunk_ids).order_by('id'))
            for payment in payments:
                method_name = PAYMENT_METHODS[payment.id % len(PAYMENT_METHODS)]
                payment.method_id = method_map[method_name]
            Payment.objects.using(db).bulk_update(payments, ['method'], batch_size=len(payments))
            remapped += len(payments)
        return remapped
