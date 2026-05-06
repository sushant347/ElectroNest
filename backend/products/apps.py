import os
import sys
import threading

from django.apps import AppConfig


class ProductsConfig(AppConfig):
    name = 'products'

    def ready(self):
        should_auto_fetch = (
            os.environ.get('AUTO_FETCH_MARKET_PRICES_ON_STARTUP', '').lower() in ('1', 'true', 'yes')
            or (os.environ.get('RUN_MAIN') == 'true' and not os.environ.get('DATABASE_URL'))
        )
        if not should_auto_fetch or any(cmd in sys.argv for cmd in ('migrate', 'makemigrations', 'collectstatic', 'shell')):
            return

        def refresh_current_month():
            try:
                from django.core.management import call_command

                limit = int(os.environ.get('AUTO_FETCH_MARKET_PRICE_LIMIT', '25'))
                call_command('refresh_market_prices', '--missing-only', '--limit', str(limit))
            except Exception:
                # Startup must never fail because a market provider or table is unavailable.
                pass

        threading.Thread(target=refresh_current_month, daemon=True).start()
