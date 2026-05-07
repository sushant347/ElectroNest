from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Seed deployment with the fresh GadgetByte catalog and remove/remap old catalog data.'

    def add_arguments(self, parser):
        parser.add_argument('--per-category', type=int, default=40, help='Products to import per regular GadgetByte category.')
        parser.add_argument('--camera-console-count', type=int, default=18, help='Camera and gaming console products to import per category.')
        parser.add_argument('--min-stock', type=int, default=7)
        parser.add_argument('--max-stock', type=int, default=32)
        parser.add_argument('--skip-migrate', action='store_true', help='Skip migrations if deployment already ran them.')
        parser.add_argument('--skip-market-refresh', action='store_true', help='Skip market-price snapshot refresh.')

    def handle(self, *args, **options):
        steps = []
        if not options['skip_migrate']:
            steps.append(('migrate', {}))
        steps.extend([
            ('import_gadgetbyte_catalog', {
                'per_category': options['per_category'],
                'replace': True,
                'min_stock': options['min_stock'],
                'max_stock': options['max_stock'],
            }),
            ('clean_gadgetbyte_catalog', {
                'min_stock': options['min_stock'],
                'max_stock': options['max_stock'],
            }),
            ('import_gadgetbyte_camera_console', {
                'per_category': options['camera_console_count'],
            }),
            ('remap_legacy_orders_to_catalog', {
                'delete_unreferenced_legacy': True,
            }),
            ('seed_catalog_sales', {
                'reset_seeded': True,
            }),
            ('seed_catalog_reviews', {
                'reset': True,
            }),
        ])
        if not options['skip_market_refresh']:
            steps.append(('refresh_market_prices', {}))
        steps.append(('sync_market_offer_variants', {
            'min_stock': options['min_stock'],
            'max_stock': options['max_stock'],
        }))
        steps.append(('check', {}))

        for name, kwargs in steps:
            self.stdout.write(self.style.WARNING(f'Running {name}...'))
            call_command(name, **kwargs)

        self.stdout.write(self.style.SUCCESS('Deployment catalog seed completed successfully.'))
