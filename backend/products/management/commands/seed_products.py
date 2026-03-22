"""
Management command to seed Categories, Suppliers, and Products
from the exported SQL Server data.
Run: python manage.py seed_products
"""
import json
import os
from django.core.management.base import BaseCommand
from django.db import connection
from products.models import Category, Supplier, Product


DATA_FILE = os.path.join(os.path.dirname(__file__), 'seed_data.json')


class Command(BaseCommand):
    help = 'Seed Categories, Suppliers, and Products from exported data'

    def handle(self, *args, **options):
        with open(DATA_FILE, encoding='utf-8') as f:
            data = json.load(f)

        # ── Categories ──
        existing_cat_ids = set(Category.objects.values_list('id', flat=True))
        new_cats = [
            Category(id=c['id'], name=c['name'])
            for c in data['categories']
            if c['id'] not in existing_cat_ids
        ]
        Category.objects.bulk_create(new_cats, ignore_conflicts=True)
        cat_map = {c.id: c for c in Category.objects.all()}
        self.stdout.write(self.style.SUCCESS(
            f'Categories: {len(new_cats)} created, {len(existing_cat_ids)} skipped'
        ))

        # ── Suppliers ──
        existing_sup_ids = set(Supplier.objects.values_list('id', flat=True))
        new_sups = [
            Supplier(
                id=s['id'], name=s['name'],
                contact_person_name=s['contact_person_name'],
                contact_email=s['contact_email'],
                phone=s['phone'], city=s['city'],
                country=s['country'], is_active=s['is_active'],
            )
            for s in data['suppliers']
            if s['id'] not in existing_sup_ids
        ]
        Supplier.objects.bulk_create(new_sups, ignore_conflicts=True)
        sup_map = {s.id: s for s in Supplier.objects.all()}
        self.stdout.write(self.style.SUCCESS(
            f'Suppliers: {len(new_sups)} created, {len(existing_sup_ids)} skipped'
        ))

        # ── Products — bulk insert, skip existing SKUs ──
        existing_skus = set(Product.objects.values_list('sku', flat=True))
        new_products = [
            Product(
                id=p['id'], sku=p['sku'], name=p['name'],
                category=cat_map.get(p['category_id']),
                brand=p['brand'], owner_name=p['owner_name'],
                supplier=sup_map.get(p['supplier_id']),
                selling_price=p['selling_price'], cost_price=p['cost_price'],
                stock=p['stock'], reorder_level=p['reorder_level'],
                description=p['description'], image_url=p['image_url'],
                specifications=p['specifications'], units_sold=p['units_sold'],
            )
            for p in data['products']
            if p['sku'] not in existing_skus
        ]
        Product.objects.bulk_create(new_products, ignore_conflicts=True)
        self.stdout.write(self.style.SUCCESS(
            f'Products: {len(new_products)} created, {len(existing_skus)} skipped'
        ))

        # ── OrderStatus ──
        from orders.models import OrderStatus
        for name in ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned', 'Refunded']:
            OrderStatus.objects.get_or_create(name=name)
        self.stdout.write(self.style.SUCCESS('OrderStatus: seeded'))

        # ── PaymentMethods ──
        from orders.models import PaymentMethod
        for name in ['Cash on Delivery', 'eSewa', 'Khalti', 'Bank Transfer', 'Credit Card', 'Debit Card']:
            PaymentMethod.objects.get_or_create(name=name)
        self.stdout.write(self.style.SUCCESS('PaymentMethods: seeded'))

        # ── Reset PostgreSQL sequences ──
        # pg_get_serial_sequence needs the table name as a quoted identifier
        # (e.g. '"Categories"') so PostgreSQL does a case-sensitive lookup.
        # Passing 'Categories' (unquoted) would lowercase it to 'categories'
        # and fail to find the case-sensitive table created by migrations.
        with connection.cursor() as cursor:
            for table, col in [
                ('"Categories"', 'CategoryID'),
                ('"Suppliers"',  'SupplierID'),
                ('"Products"',   'ProductID'),
                ('"OrderStatus"', 'OrderStatusID'),
                ('"PaymentMethods"', 'MethodID'),
            ]:
                try:
                    cursor.execute(
                        f'SELECT setval(pg_get_serial_sequence(%s, %s), '
                        f'COALESCE(MAX("{col}"), 1)) FROM {table}',
                        [table, col]
                    )
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'Sequence reset skipped for {table}: {e}'))

        self.stdout.write(self.style.SUCCESS('Done — database seeded successfully.'))
