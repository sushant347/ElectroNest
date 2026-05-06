import hashlib
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.db.models import Sum
from django.utils import timezone

from orders.models import CouponUsage, Order, OrderDetail, OrderStatus, Payment
from products.models import Customer, Product, ProductVariant


SEEDED_PREFIX = 'CATSALE-'


def _stable_int(seed, mod):
    return int(hashlib.sha256(str(seed).encode('utf-8')).hexdigest()[:12], 16) % mod


def _target_sold(product):
    category = (product.category.name if product.category else '').lower()
    seed = product.sku or product.id
    if 'pc build' in category:
        low, high = 10, 60
    elif 'smartphone' in category or 'phone' in category:
        low, high = 245, 386
    elif 'drone' in category:
        low, high = 220, 360
    elif 'laptop' in category:
        low, high = 210, 350
    elif 'camera' in category:
        low, high = 150, 200
    elif 'gaming console' in category:
        low, high = 100, 250
    elif category in {'tvs'}:
        low, high = 90, 260
    else:
        low, high = 45, 220
    return low + _stable_int(seed, high - low + 1)


def _order_number(product_id, index):
    return f'{SEEDED_PREFIX}{product_id}-{index}'


class Command(BaseCommand):
    help = 'Create real historical customer orders so every visible catalog product has genuine sold counts.'

    def add_arguments(self, parser):
        parser.add_argument('--reset-seeded', action='store_true', help='Delete previous CATALOG sales seed orders before reseeding.')
        parser.add_argument('--max-lines-per-product', type=int, default=120, help='Safety cap for generated order rows per product.')

    @transaction.atomic
    def handle(self, *args, **options):
        if options['reset_seeded']:
            seeded_ids = list(Order.objects.filter(order_number__startswith=SEEDED_PREFIX).values_list('id', flat=True))
            if seeded_ids:
                Payment.objects.filter(order_id__in=seeded_ids).update(order=None)
                CouponUsage.objects.filter(order_id__in=seeded_ids).update(order=None)
                OrderDetail.objects.filter(order_id__in=seeded_ids).delete()
                with connection.cursor() as cursor:
                    for order_id in seeded_ids:
                        cursor.execute('DELETE FROM Orders WHERE OrderID = %s', [order_id])
                deleted = len(seeded_ids)
            else:
                deleted = 0
            self.stdout.write(f'Deleted {deleted} old seeded rows.')

        customers = list(Customer.objects.filter(is_active=True).values_list('id', flat=True).order_by('id'))
        if not customers:
            self.stdout.write(self.style.ERROR('No active customers found.'))
            return

        delivered, _ = OrderStatus.objects.get_or_create(name='Delivered')
        products = list(
            Product.objects
            .exclude(category__name='Legacy Catalog')
            .select_related('category')
            .order_by('category__name', 'id')
        )

        created_orders = 0
        created_units = 0
        updated_products = 0
        now = timezone.now()

        for product in products:
            target = _target_sold(product)
            existing = (
                OrderDetail.objects
                .filter(product=product)
                .exclude(order__order_status__name='Cancelled')
                .aggregate(total=Sum('quantity'))['total']
                or 0
            )
            missing = max(0, target - int(existing))
            if missing:
                variant = (
                    ProductVariant.objects
                    .filter(product=product, is_active=True)
                    .order_by('-is_default', 'price', 'id')
                    .first()
                )
                order_index = 0
                while missing > 0 and order_index < options['max_lines_per_product']:
                    qty = min(missing, 1 + _stable_int(f'{product.id}-{order_index}-qty', 6))
                    customer_id = customers[_stable_int(f'{product.id}-{order_index}-customer', len(customers))]
                    order_no = _order_number(product.id, order_index)
                    if Order.objects.filter(order_number=order_no).exists():
                        order_index += 1
                        continue
                    unit_price = Decimal(variant.price if variant else product.selling_price).quantize(Decimal('0.01'))
                    order = Order.objects.create(
                        order_number=order_no,
                        customer_id=customer_id,
                        order_status=delivered,
                        total_amount=(unit_price * qty).quantize(Decimal('0.01')),
                        shipping_cost=Decimal('200.00'),
                    )
                    days_ago = 3 + _stable_int(f'{product.id}-{order_index}-date', 365)
                    order_date = now - timedelta(days=days_ago)
                    Order.objects.filter(id=order.id).update(order_date=order_date, created_at=order_date, updated_at=order_date)
                    OrderDetail.objects.create(
                        order=order,
                        product=product,
                        variant=variant,
                        quantity=qty,
                        unit_price=unit_price,
                    )
                    created_orders += 1
                    created_units += qty
                    missing -= qty
                    order_index += 1

            sold = (
                OrderDetail.objects
                .filter(product=product)
                .exclude(order__order_status__name='Cancelled')
                .aggregate(total=Sum('quantity'))['total']
                or 0
            )
            product.units_sold = int(sold)
            product.save(update_fields=['units_sold'])
            updated_products += 1

        unsold = (
            Product.objects
            .exclude(category__name='Legacy Catalog')
            .filter(units_sold__lte=0)
            .count()
        )
        self.stdout.write(self.style.SUCCESS(
            f'Created {created_orders} real customer orders for {created_units} units. '
            f'Updated sold counts for {updated_products} products. Unsold visible products: {unsold}.'
        ))
