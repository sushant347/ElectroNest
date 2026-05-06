#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt

# Use direct (non-pooled) URL for migrations — pgBouncer blocks Django migration locks
DATABASE_URL=${DIRECT_URL:-$DATABASE_URL} python manage.py migrate --noinput
python manage.py collectstatic --noinput

if [ "${RUN_SEED_DATA:-true}" = "true" ]; then
  # Seed baseline users/transactions first, then replace/remap products into
  # the current GadgetByte catalog so customer, owner, warehouse, and admin
  # panels all point at the new products on fresh Render databases.
  echo "=== Running seed_products ==="
  python manage.py seed_products \
    && echo "=== seed_products: OK ===" \
    || echo "=== WARNING: seed_products failed (may already be seeded — check logs above) ==="

  # Seed transactional data (customers, orders, reviews, etc.)
  # This loads a large JSON file; keep disabled on 512MB instances unless needed.
  echo "=== Running seed_all_data ==="
  python manage.py seed_all_data \
    && echo "=== seed_all_data: OK ===" \
    || echo "=== WARNING: seed_all_data failed (may already be seeded — check logs above) ==="

  echo "=== Running seed_deployment_catalog ==="
  python manage.py seed_deployment_catalog --skip-migrate \
    && echo "=== seed_deployment_catalog: OK ===" \
    || echo "=== WARNING: seed_deployment_catalog failed — check logs above ==="
else
  echo "=== Skipping seed data. Set RUN_SEED_DATA=true for one deploy if seeding is needed. ==="
fi

echo "=== Build complete ==="
