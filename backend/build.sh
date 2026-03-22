#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt

python manage.py migrate --noinput
python manage.py collectstatic --noinput

# Seed core data (categories, suppliers, products, order statuses, payment methods)
python manage.py seed_products || echo "seed_products failed or already seeded"

# Seed transactional data (customers, orders, reviews, etc.)
python manage.py seed_all_data || echo "seed_all_data failed or already seeded"
