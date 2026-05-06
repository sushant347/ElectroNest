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


def _text(value):
    return value if value is not None else ''


def _number(value, default=0):
    return value if value is not None else default


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

        # ── Products — insert missing rows and refresh existing rows ──
        existing_by_sku = {p.sku: p for p in Product.objects.all()}
        new_products = []
        products_to_update = []
        update_fields = [
            'name', 'category', 'brand', 'owner_name', 'supplier',
            'selling_price', 'cost_price', 'stock', 'reorder_level',
            'description', 'image_url', 'specifications', 'units_sold',
        ]

        for p in data['products']:
            values = {
                'name': _text(p.get('name')),
                'category': cat_map.get(p['category_id']),
                'brand': _text(p.get('brand')),
                'owner_name': _text(p.get('owner_name')),
                'supplier': sup_map.get(p['supplier_id']),
                'selling_price': _number(p.get('selling_price'), '0.00'),
                'cost_price': _number(p.get('cost_price'), '0.00'),
                'stock': _number(p.get('stock')),
                'reorder_level': _number(p.get('reorder_level'), 10),
                'description': _text(p.get('description')),
                'image_url': _text(p.get('image_url')),
                'specifications': _text(p.get('specifications')),
                'units_sold': _number(p.get('units_sold')),
            }
            existing = existing_by_sku.get(p['sku'])
            if existing:
                for field, value in values.items():
                    setattr(existing, field, value)
                products_to_update.append(existing)
            else:
                new_products.append(Product(id=p['id'], sku=p['sku'], **values))

        Product.objects.bulk_create(new_products, ignore_conflicts=True)
        if products_to_update:
            Product.objects.bulk_update(products_to_update, update_fields, batch_size=200)
        self.stdout.write(self.style.SUCCESS(
            f'Products: {len(new_products)} created, {len(products_to_update)} updated'
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
