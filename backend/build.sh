#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt

# Use direct (non-pooled) URL for migrations — pgBouncer blocks Django migration locks
DATABASE_URL=${DIRECT_URL:-$DATABASE_URL} python manage.py migrate --noinput
python manage.py collectstatic --noinput

# Seed core data (categories, suppliers, products, order statuses, payment methods)
echo "=== Running seed_products ==="
python manage.py seed_products \
  && echo "=== seed_products: OK ===" \
  || echo "=== WARNING: seed_products failed (may already be seeded — check logs above) ==="

# Seed transactional data (customers, orders, reviews, etc.)
echo "=== Running seed_all_data ==="
python manage.py seed_all_data \
  && echo "=== seed_all_data: OK ===" \
  || echo "=== WARNING: seed_all_data failed (may already be seeded — check logs above) ==="

echo "=== Build complete ==="
