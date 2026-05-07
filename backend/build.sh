#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt

# Use direct (non-pooled) URL for migrations — pgBouncer blocks Django migration locks
DATABASE_URL=${DIRECT_URL:-$DATABASE_URL} python manage.py migrate --noinput
python manage.py collectstatic --noinput

if [ "${RUN_SEED_DATA:-true}" = "true" ]; then
  export DATABASE_URL=${DIRECT_URL:-$DATABASE_URL}

  # RUN_SEED_DATA is intentionally destructive: it rebuilds deployment data
  # from the exported local SQL Server JSON so old catalog rows cannot mix in.
  echo "=== Resetting database data before seed ==="
  python manage.py flush --noinput

  echo "=== Running seed_users ==="
  python manage.py seed_users \
    && echo "=== seed_users: OK ===" \
    || echo "=== WARNING: seed_users failed — check logs above ==="

  echo "=== Running seed_products ==="
  python manage.py seed_products \
    && echo "=== seed_products: OK ===" \
    || echo "=== WARNING: seed_products failed (may already be seeded — check logs above) ==="

  # Seed transactional data (customers, orders, reviews, etc.)
  # This loads a large JSON file; keep disabled on 512MB instances unless needed.
  echo "=== Running seed_all_data ==="
  python manage.py seed_all_data_fast --reset \
    && echo "=== seed_all_data: OK ===" \
    || echo "=== WARNING: seed_all_data failed (may already be seeded — check logs above) ==="
else
  echo "=== Skipping seed data. Set RUN_SEED_DATA=true for one deploy if seeding is needed. ==="
fi

if [ "${RUN_SYNC_MARKET_VARIANTS:-true}" = "true" ]; then
  export DATABASE_URL=${DIRECT_URL:-$DATABASE_URL}
  echo "=== Syncing market-offer variants and enforcing 5-15% price advantage ==="
  python manage.py sync_market_offer_variants \
    && echo "=== sync_market_offer_variants: OK ===" \
    || echo "=== WARNING: sync_market_offer_variants failed — check logs above ==="
fi

echo "=== Build complete ==="
