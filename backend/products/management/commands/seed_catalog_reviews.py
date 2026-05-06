import hashlib
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count
from django.utils import timezone

from products.management.commands.import_gadgetbyte_catalog import TARGET_CATEGORIES
from products.models import Customer, Product, Review


COMMENTS = [
    'Good value for the price. The product matched the listed specifications and delivery was smooth.',
    'I have been using this for a while and it feels reliable. Setup was simple and performance is consistent.',
    'The build quality is better than expected. Packaging was neat and the product works as described.',
    'Satisfied with the purchase. The features are practical for everyday use and the price felt fair.',
    'Bought this after comparing a few options. It has been dependable so far and looks premium in hand.',
    'Performance is solid for regular use. The store handled the order well and the product arrived safely.',
    'Nice product overall. Battery, display, sound, or performance depends on the category, but it feels genuine.',
    'The specifications are accurate and the product feels worth the money. Would recommend it to other buyers.',
]


def _stable_int(seed, mod):
    digest = hashlib.sha256(str(seed).encode('utf-8')).hexdigest()
    return int(digest[:12], 16) % mod


class Command(BaseCommand):
    help = 'Ensure visible catalog products have realistic reviews from existing legacy customers.'

    def add_arguments(self, parser):
        parser.add_argument('--min-reviews', type=int, default=5)
        parser.add_argument('--max-reviews', type=int, default=15)
        parser.add_argument('--reset', action='store_true', help='Rebuild visible catalog reviews to an exact deterministic count.')

    @transaction.atomic
    def handle(self, *args, **options):
        target_names = [cat['name'] for cat in TARGET_CATEGORIES]
        target_names += ['Cameras', 'Gaming Consoles']
        min_reviews = max(1, options['min_reviews'])
        max_reviews = max(min_reviews, options['max_reviews'])
        products = list(Product.objects.filter(category__name__in=target_names).order_by('id'))
        customer_ids = list(Customer.objects.values_list('id', flat=True).order_by('id'))
        if not customer_ids:
            self.stdout.write(self.style.WARNING('No customers found. Reviews were not created.'))
            return

        created = 0
        updated_products = 0
        for product in products:
            if options['reset']:
                Review.objects.filter(product=product).delete()
            existing_count = Review.objects.filter(product=product).count()
            sold = int(product.units_sold or 0)
            target_count = int(sold * 0.8) if sold > 0 else min_reviews + _stable_int(product.sku or product.id, max_reviews - min_reviews + 1)
            target_count = max(1, target_count)
            missing = max(0, target_count - existing_count)
            if missing == 0:
                continue

            local_created = 0
            for offset in range(max(len(customer_ids), missing)):
                if local_created >= missing:
                    break
                customer_id = customer_ids[_stable_int(f'{product.id}-{offset}', len(customer_ids))]
                rating_options = [4.0, 4.0, 4.5, 4.5, 5.0, 3.5]
                rating = rating_options[_stable_int(f'{product.id}-rating-{offset}', len(rating_options))]
                comment = COMMENTS[_stable_int(f'{product.id}-comment-{offset}', len(COMMENTS))]
                review = Review.objects.create(
                    product=product,
                    customer_id=customer_id,
                    rating=rating,
                    comment=comment,
                )
                days_ago = 7 + _stable_int(f'{product.id}-date-{offset}', 180)
                review.created_at = timezone.now() - timedelta(days=days_ago)
                review.save(update_fields=['created_at'])
                local_created += 1
                created += 1

            if local_created:
                updated_products += 1

        no_review_count = (
            Product.objects
            .filter(category__name__in=target_names)
            .annotate(review_total=Count('reviews'))
            .filter(review_total=0)
            .count()
        )
        self.stdout.write(self.style.SUCCESS(
            f'Created {created} reviews across {updated_products} products. Products with no reviews: {no_review_count}.'
        ))
