"""
Management command to seed Categories, Suppliers, and Products
from the exported SQL Server data.
Run: python manage.py seed_products
"""
import json
import os
from django.core.management.base import BaseCommand
from products.models import Category, Supplier, Product


DATA_FILE = os.path.join(os.path.dirname(__file__), 'seed_data.json')


class Command(BaseCommand):
    help = 'Seed Categories, Suppliers, and Products from exported data'

    def handle(self, *args, **options):
        with open(DATA_FILE, encoding='utf-8') as f:
            data = json.load(f)

        # ── Categories ──
        cat_created = 0
        cat_map = {}
        for c in data['categories']:
            obj, created = Category.objects.get_or_create(
                id=c['id'],
                defaults={'name': c['name']}
            )
            cat_map[c['id']] = obj
            if created:
                cat_created += 1
        self.stdout.write(self.style.SUCCESS(f'Categories: {cat_created} created, {len(data["categories"]) - cat_created} skipped'))

        # ── Suppliers ──
        sup_created = 0
        sup_map = {}
        for s in data['suppliers']:
            obj, created = Supplier.objects.get_or_create(
                id=s['id'],
                defaults={
                    'name': s['name'],
                    'contact_person_name': s['contact_person_name'],
                    'contact_email': s['contact_email'],
                    'phone': s['phone'],
                    'city': s['city'],
                    'country': s['country'],
                    'is_active': s['is_active'],
                }
            )
            sup_map[s['id']] = obj
            if created:
                sup_created += 1
        self.stdout.write(self.style.SUCCESS(f'Suppliers: {sup_created} created, {len(data["suppliers"]) - sup_created} skipped'))

        # ── Products ──
        prod_created = 0
        prod_skipped = 0
        for p in data['products']:
            if Product.objects.filter(sku=p['sku']).exists():
                prod_skipped += 1
                continue
            Product.objects.create(
                id=p['id'],
                sku=p['sku'],
                name=p['name'],
                category=cat_map.get(p['category_id']),
                brand=p['brand'],
                owner_name=p['owner_name'],
                supplier=sup_map.get(p['supplier_id']),
                selling_price=p['selling_price'],
                cost_price=p['cost_price'],
                stock=p['stock'],
                reorder_level=p['reorder_level'],
                description=p['description'],
                image_url=p['image_url'],
                specifications=p['specifications'],
                units_sold=p['units_sold'],
            )
            prod_created += 1
        self.stdout.write(self.style.SUCCESS(f'Products: {prod_created} created, {prod_skipped} skipped'))
        self.stdout.write(self.style.SUCCESS('Done — database seeded successfully.'))
