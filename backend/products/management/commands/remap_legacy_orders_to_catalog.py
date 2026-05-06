import hashlib
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.utils import timezone

from orders.models import Cart, CompareList, Notification, Order, OrderDetail, ProductQuestion, Wishlist
from products.management.commands.import_gadgetbyte_catalog import TARGET_CATEGORIES
from products.models import Category, Customer, Product, ProductVariant, Review
from warehouse.models import PurchaseOrderDetail


LEGACY_CATEGORY_NAME = 'Legacy Catalog'

REVIEW_COMMENTS = [
    'Bought this after comparing a few options. It feels genuine, works as expected, and the pricing made sense.',
    'The product arrived in good condition and matched the listed specs. Performance has been steady in daily use.',
    'Good purchase overall. Build quality feels solid and the main features are useful without much setup hassle.',
    'I liked the packaging and the product condition. It has been reliable so far and the store handled the order well.',
    'The experience has been smooth. There are small things that could be better, but for the price it is worth it.',
    'Using it for regular work and entertainment has been easy. The specs are accurate and the product feels premium.',
    'Happy with the order. Delivery was neat, the item looked new, and performance is close to what I expected.',
    'This feels like a practical choice for everyday use. No major complaints after using it for a while.',
    'The value is strong compared to other models I checked. Setup was simple and the product feels dependable.',
    'Nice product from the store. The quality, condition, and price all feel balanced for normal use.',
    'I was unsure at first, but it has worked well. The main features are useful and the product feels authentic.',
    'Decent value and good handling by the seller. It is not perfect, but it does the job very well.',
]

RATINGS = [3.0, 3.5, 4.0, 4.0, 4.5, 4.5, 5.0]


def _stable_int(seed, mod):
    digest = hashlib.sha256(str(seed).encode('utf-8')).hexdigest()
    return int(digest[:12], 16) % mod


def _visible_products():
    category_names = [cat['name'] for cat in TARGET_CATEGORIES]
    return list(
        Product.objects
        .filter(category__name__in=category_names)
        .exclude(category__name=LEGACY_CATEGORY_NAME)
        .order_by('category__name', 'brand', 'name', 'id')
    )


def _products_by_category(products):
    grouped = {}
    for product in products:
        category = product.category.name if product.category else ''
        grouped.setdefault(category, []).append(product)
    return grouped


def _pick_product(products, seed, used_ids=None):
    if not products:
        return None
    used_ids = used_ids or set()
    start = seed % len(products)
    for offset in range(len(products)):
        product = products[(start + offset) % len(products)]
        if product.id not in used_ids:
            return product
    return products[start]


def _pick_replacement(old_product, products, grouped, seed, used_ids=None):
    old_category = getattr(getattr(old_product, 'category', None), 'name', '')
    category_pool = grouped.get(old_category) or []
    if old_category != LEGACY_CATEGORY_NAME and category_pool:
        return _pick_product(category_pool, seed, used_ids)
    return _pick_product(products, seed, used_ids)


def _legacy_or_missing_product_q():
    valid_products = Product.objects.values('id')
    legacy_products = Product.objects.filter(category__name=LEGACY_CATEGORY_NAME).values('id')
    return Q(product_id__in=legacy_products) | ~Q(product_id__in=valid_products)


def _safe_product(row):
    try:
        return row.product
    except Product.DoesNotExist:
        return None


def _default_variant(product):
    return (
        ProductVariant.objects
        .filter(product=product, is_active=True)
        .order_by('-is_default', 'price', 'id')
        .first()
    )


class Command(BaseCommand):
    help = 'Remap legacy transactional references to the imported visible catalog.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--delete-unreferenced-legacy',
            action='store_true',
            help='Delete Legacy Catalog products/categories after transactional references are remapped.',
        )
        parser.add_argument('--min-reviews', type=int, default=5)
        parser.add_argument('--max-reviews', type=int, default=15)

    @transaction.atomic
    def handle(self, *args, **options):
        products = _visible_products()
        if not products:
            self.stdout.write(self.style.ERROR('No visible imported catalog products found.'))
            return
        grouped = _products_by_category(products)
        min_reviews = max(1, options['min_reviews'])
        max_reviews = max(min_reviews, options['max_reviews'])
        customer_ids = list(Customer.objects.values_list('id', flat=True).order_by('id'))

        order_detail_count = 0
        order_total_count = 0
        cart_count = 0
        wishlist_count = 0
        compare_count = 0
        deleted_legacy_review_count = 0
        purchase_detail_count = 0
        question_count = 0
        notification_count = 0

        legacy_order_ids = set(
            OrderDetail.objects
            .filter(_legacy_or_missing_product_q())
            .values_list('order_id', flat=True)
        )

        for order in Order.objects.filter(id__in=legacy_order_ids).prefetch_related('details').order_by('id'):
            used_ids = set()
            order_changed = False
            for index, detail in enumerate(order.details.all().order_by('id')):
                old_product = _safe_product(detail)
                if old_product and getattr(old_product.category, 'name', '') != LEGACY_CATEGORY_NAME:
                    used_ids.add(detail.product_id)
                    continue
                product = _pick_replacement(old_product, products, grouped, order.id * 37 + index * 11 + detail.id, used_ids)
                variant = _default_variant(product)
                detail.product = product
                detail.variant = variant
                detail.unit_price = Decimal(variant.price if variant else product.selling_price)
                detail.save(update_fields=['product', 'variant', 'unit_price'])
                used_ids.add(product.id)
                order_changed = True
                order_detail_count += 1

            if order_changed:
                subtotal = sum(
                    Decimal(d.unit_price or 0) * Decimal(d.quantity or 0)
                    for d in order.details.all()
                )
                order.total_amount = subtotal.quantize(Decimal('0.01'))
                order.save(update_fields=['total_amount'])
                order_total_count += 1

        for model, label in (
            (Cart, 'cart'),
            (Wishlist, 'wishlist'),
            (CompareList, 'compare'),
        ):
            qs = model.objects.filter(_legacy_or_missing_product_q()).order_by('id')
            for index, row in enumerate(qs):
                product = _pick_replacement(_safe_product(row), products, grouped, row.id * 19 + index)
                row.product = product
                update_fields = ['product']
                if hasattr(row, 'variant'):
                    variant = _default_variant(product)
                    row.variant = variant
                    update_fields.append('variant')
                row.save(update_fields=update_fields)
                if label == 'cart':
                    cart_count += 1
                elif label == 'wishlist':
                    wishlist_count += 1
                elif label == 'compare':
                    compare_count += 1

        legacy_reviews = Review.objects.filter(_legacy_or_missing_product_q())
        deleted_legacy_review_count = legacy_reviews.count()
        legacy_reviews.delete()

        for index, row in enumerate(PurchaseOrderDetail.objects.filter(_legacy_or_missing_product_q()).order_by('id')):
            product = _pick_replacement(_safe_product(row), products, grouped, row.id * 23 + index)
            row.product = product
            row.unit_cost = product.cost_price
            row.save(update_fields=['product', 'unit_cost'])
            purchase_detail_count += 1

        for index, row in enumerate(ProductQuestion.objects.filter(_legacy_or_missing_product_q()).order_by('id')):
            product = _pick_replacement(_safe_product(row), products, grouped, row.id * 31 + index)
            row.product = product
            row.save(update_fields=['product'])
            question_count += 1

        for index, row in enumerate(Notification.objects.filter(_legacy_or_missing_product_q()).order_by('id')):
            product = _pick_replacement(_safe_product(row), products, grouped, row.id * 17 + index)
            row.product = product
            row.save(update_fields=['product'])
            notification_count += 1

        created_reviews = 0
        deleted_reviews = 0
        updated_products = 0
        if customer_ids:
            for product in products:
                target_reviews = min_reviews + _stable_int(product.sku or product.id, max_reviews - min_reviews + 1)
                Review.objects.filter(product=product).delete()
                deleted_reviews += 1
                rating_total = Decimal('0')
                used_customer_ids = set()
                for offset in range(target_reviews):
                    customer_id = customer_ids[_stable_int(f'{product.id}-customer-{offset}', len(customer_ids))]
                    attempts = 0
                    while customer_id in used_customer_ids and attempts < len(customer_ids):
                        attempts += 1
                        customer_id = customer_ids[(customer_ids.index(customer_id) + 1) % len(customer_ids)]
                    used_customer_ids.add(customer_id)
                    rating = Decimal(str(RATINGS[_stable_int(f'{product.id}-rating-{offset}', len(RATINGS))]))
                    rating_total += rating
                    review = Review.objects.create(
                        product=product,
                        customer_id=customer_id,
                        rating=rating,
                        comment=REVIEW_COMMENTS[_stable_int(f'{product.id}-comment-{offset}', len(REVIEW_COMMENTS))],
                    )
                    review.created_at = timezone.now() - timedelta(days=4 + _stable_int(f'{product.id}-date-{offset}', 210))
                    review.save(update_fields=['created_at'])
                    created_reviews += 1

                updated_products += 1

        updated_sold_counts = 0
        for product in products:
            sold = (
                OrderDetail.objects
                .filter(product=product)
                .exclude(order__order_status__name='Cancelled')
                .aggregate(total=Sum('quantity'))['total']
                or 0
            )
            if product.units_sold != sold:
                product.units_sold = sold
                product.save(update_fields=['units_sold'])
                updated_sold_counts += 1

        deleted_products = 0
        deleted_categories = 0
        if options['delete_unreferenced_legacy']:
            legacy_qs = Product.objects.filter(category__name=LEGACY_CATEGORY_NAME)
            still_referenced = set(
                OrderDetail.objects
                .filter(product__category__name=LEGACY_CATEGORY_NAME)
                .values_list('product_id', flat=True)
            )
            deletable = legacy_qs.exclude(id__in=still_referenced)
            deleted_products = deletable.count()
            deletable.delete()
            for category in Category.objects.filter(name=LEGACY_CATEGORY_NAME):
                if not Product.objects.filter(category=category).exists():
                    category.delete()
                    deleted_categories += 1

        self.stdout.write(self.style.SUCCESS(
            'Remapped '
            f'{order_detail_count} order details across {order_total_count} orders, '
            f'{cart_count} cart rows, {wishlist_count} wishlist rows, '
            f'{compare_count} compare rows, deleted {deleted_legacy_review_count} legacy review rows, '
            f'{purchase_detail_count} purchase order detail rows, '
            f'{question_count} product questions, and {notification_count} notifications.'
        ))
        if customer_ids:
            review_gaps = (
                Product.objects
                .filter(id__in=[p.id for p in products])
                .annotate(review_total=Count('reviews'))
                .filter(review_total__lt=min_reviews)
                .count()
            )
            self.stdout.write(self.style.SUCCESS(
                f'Rebuilt {created_reviews} reviews for {updated_products} products '
                f'({min_reviews}-{max_reviews} each). Sold counts remain genuine UnitsSold values. '
                f'Recalculated sold counts from OrderDetails for {updated_sold_counts} products. '
                f'Products below review target: {review_gaps}.'
            ))
        if options['delete_unreferenced_legacy']:
            self.stdout.write(self.style.SUCCESS(
                f'Deleted {deleted_products} unreferenced legacy products and {deleted_categories} empty legacy categories.'
            ))
