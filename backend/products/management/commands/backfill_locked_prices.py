from django.core.management.base import BaseCommand
from django.db import IntegrityError

from products.models import Product
from products.views import _compute_locked_platform_price


class Command(BaseCommand):
    help = "Backfill product selling prices to locked market-discount prices."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview updates without writing to database.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        updated = 0
        skipped = 0
        failed = 0
        total = 0

        for product in Product.objects.all().iterator():
            total += 1
            locked_price = _compute_locked_platform_price(product)
            if product.selling_price == locked_price:
                skipped += 1
                continue

            if not dry_run:
                try:
                    product.selling_price = locked_price
                    product.save(update_fields=["selling_price"])
                except IntegrityError:
                    failed += 1
                    continue
            updated += 1

        mode = "DRY RUN" if dry_run else "APPLIED"
        self.stdout.write(
            self.style.SUCCESS(
                f"[{mode}] Total: {total}, Updated: {updated}, Unchanged: {skipped}"
            )
        )
        if failed:
            self.stdout.write(
                self.style.WARNING(
                    f"Skipped {failed} records due to DB constraints."
                )
            )
