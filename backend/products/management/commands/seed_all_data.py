"""
Management command to import ALL transactional data into PostgreSQL.

Reads transactional_data.json (created by export_local_data command).
Safe to re-run — uses get_or_create / skip-if-exists for every table.

Automatically called during Render build:
    python manage.py seed_all_data
"""
import json
import os
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import connection, transaction

DATA_FILE = os.path.join(os.path.dirname(__file__), 'transactional_data.json')


def _val(v):
    """Convert empty string to None for nullable fields."""
    return v if v != '' else None


class Command(BaseCommand):
    help = 'Import all transactional data from transactional_data.json into PostgreSQL'

    def handle(self, *args, **options):
        if not os.path.exists(DATA_FILE):
            self.stdout.write(self.style.WARNING(
                'transactional_data.json not found — skipping seed_all_data. '
                'Run export_local_data locally first.'
            ))
            return

        with open(DATA_FILE, encoding='utf-8') as f:
            data = json.load(f)

        self.stdout.write('Importing transactional data...')

        self._seed_customers(data.get('customers', []))
        self._seed_customer_addresses(data.get('customer_addresses', []))
        self._seed_orders(data.get('orders', []))
        self._seed_order_details(data.get('order_details', []))
        self._seed_payments(data.get('payments', []))
        self._seed_reviews(data.get('reviews', []))
        self._seed_purchase_orders(data.get('purchase_orders', []))
        self._seed_purchase_order_details(data.get('purchase_order_details', []))
        self._reset_sequences()

        self.stdout.write(self.style.SUCCESS('All transactional data imported.'))

    # ── Customers ────────────────────────────────────────────────────────────
    def _seed_customers(self, rows):
        created = skipped = 0
        with connection.cursor() as cur:
            for r in rows:
                cur.execute('SELECT 1 FROM "Customers" WHERE "CustomerID" = %s', [r['CustomerID']])
                if cur.fetchone():
                    skipped += 1
                    continue
                cur.execute(
                    'INSERT INTO "Customers" ("CustomerID","FirstName","LastName","Email",'
                    '"Phone","Gender","DateOfBirth","RegistrationDate","isActive","Password") '
                    'VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)',
                    [
                        r['CustomerID'], r['FirstName'], r['LastName'], r['Email'],
                        r.get('Phone', ''), r.get('Gender', ''),
                        _val(r.get('DateOfBirth')), _val(r.get('RegistrationDate')),
                        r.get('isActive', True), _val(r.get('Password')),
                    ]
                )
                created += 1
        self.stdout.write(self.style.SUCCESS(f'  Customers: {created} created, {skipped} skipped'))

    # ── Customer_Address ─────────────────────────────────────────────────────
    def _seed_customer_addresses(self, rows):
        created = skipped = 0
        with connection.cursor() as cur:
            for r in rows:
                cur.execute('SELECT 1 FROM "Customer_Address" WHERE "AddressID" = %s', [r['AddressID']])
                if cur.fetchone():
                    skipped += 1
                    continue
                cur.execute(
                    'INSERT INTO "Customer_Address" ("AddressID","CustomerID","Street","City",'
                    '"Province","PostalCode","Country","AddressType") '
                    'VALUES (%s,%s,%s,%s,%s,%s,%s,%s)',
                    [
                        r['AddressID'], r['CustomerID'],
                        r.get('Street', ''), r['City'],
                        r.get('Province', ''), r.get('PostalCode', ''),
                        r.get('Country', 'Nepal'), r.get('AddressType', 'Shipping'),
                    ]
                )
                created += 1
        self.stdout.write(self.style.SUCCESS(f'  Customer_Address: {created} created, {skipped} skipped'))

    # ── Orders ────────────────────────────────────────────────────────────────
    def _seed_orders(self, rows):
        created = skipped = 0
        with connection.cursor() as cur:
            for r in rows:
                cur.execute('SELECT 1 FROM "Orders" WHERE "OrderID" = %s', [r['OrderID']])
                if cur.fetchone():
                    skipped += 1
                    continue
                cur.execute(
                    'INSERT INTO "Orders" ("OrderID","OrderNumber","CustomerID","OrderStatusID",'
                    '"OrderDate","TotalAmount","AddressID","ShippingCost",'
                    '"EstimatedDeliveryDate","TrackingNumber","CreatedAt","UpdatedAt") '
                    'VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)',
                    [
                        r['OrderID'], r['OrderNumber'], r['CustomerID'],
                        _val(r.get('OrderStatusID')), _val(r.get('OrderDate')),
                        r['TotalAmount'], _val(r.get('AddressID')),
                        r.get('ShippingCost', '200.00'),
                        _val(r.get('EstimatedDeliveryDate')),
                        r.get('TrackingNumber', ''),
                        _val(r.get('CreatedAt')), _val(r.get('UpdatedAt')),
                    ]
                )
                created += 1
        self.stdout.write(self.style.SUCCESS(f'  Orders: {created} created, {skipped} skipped'))

    # ── OrderDetails ──────────────────────────────────────────────────────────
    def _seed_order_details(self, rows):
        created = skipped = 0
        with connection.cursor() as cur:
            for r in rows:
                cur.execute('SELECT 1 FROM "OrderDetails" WHERE "OrderDetailID" = %s', [r['OrderDetailID']])
                if cur.fetchone():
                    skipped += 1
                    continue
                cur.execute(
                    'INSERT INTO "OrderDetails" ("OrderDetailID","OrderID","ProductID","Quantity","UnitPrice") '
                    'VALUES (%s,%s,%s,%s,%s)',
                    [r['OrderDetailID'], r['OrderID'], r['ProductID'], r['Quantity'], r['UnitPrice']]
                )
                created += 1
        self.stdout.write(self.style.SUCCESS(f'  OrderDetails: {created} created, {skipped} skipped'))

    # ── Payments ──────────────────────────────────────────────────────────────
    def _seed_payments(self, rows):
        created = skipped = 0
        with connection.cursor() as cur:
            for r in rows:
                cur.execute('SELECT 1 FROM "Payments" WHERE "PaymentID" = %s', [r['PaymentID']])
                if cur.fetchone():
                    skipped += 1
                    continue
                cur.execute(
                    'INSERT INTO "Payments" ("PaymentID","OrderID","MethodID","DiscountPercent","PayableAmount","PaidAt") '
                    'VALUES (%s,%s,%s,%s,%s,%s)',
                    [
                        r['PaymentID'], _val(r.get('OrderID')), r['MethodID'],
                        r.get('DiscountPercent', '0'), _val(r.get('PayableAmount')),
                        _val(r.get('PaidAt')),
                    ]
                )
                created += 1
        self.stdout.write(self.style.SUCCESS(f'  Payments: {created} created, {skipped} skipped'))

    # ── Reviews ───────────────────────────────────────────────────────────────
    def _seed_reviews(self, rows):
        created = skipped = 0
        with connection.cursor() as cur:
            for r in rows:
                cur.execute('SELECT 1 FROM "Reviews" WHERE "ReviewID" = %s', [r['ReviewID']])
                if cur.fetchone():
                    skipped += 1
                    continue
                cur.execute(
                    'INSERT INTO "Reviews" ("ReviewID","ProductID","CustomerID","Rating","Comment","ReviewDate") '
                    'VALUES (%s,%s,%s,%s,%s,%s)',
                    [
                        r['ReviewID'], r['ProductID'], r['CustomerID'],
                        _val(r.get('Rating')), _val(r.get('Comment')),
                        _val(r.get('ReviewDate')),
                    ]
                )
                created += 1
        self.stdout.write(self.style.SUCCESS(f'  Reviews: {created} created, {skipped} skipped'))

    # ── PurchaseOrders ────────────────────────────────────────────────────────
    def _seed_purchase_orders(self, rows):
        created = skipped = 0
        with connection.cursor() as cur:
            for r in rows:
                cur.execute('SELECT 1 FROM "PurchaseOrders" WHERE "PurchaseOrderID" = %s', [r['PurchaseOrderID']])
                if cur.fetchone():
                    skipped += 1
                    continue
                cur.execute(
                    'INSERT INTO "PurchaseOrders" ("PurchaseOrderID","SupplierID","OrderDate",'
                    '"TotalAmount","ExpectedDeliveryDate","CreatedAt","OrderStatusID") '
                    'VALUES (%s,%s,%s,%s,%s,%s,%s)',
                    [
                        r['PurchaseOrderID'], r['SupplierID'],
                        _val(r.get('OrderDate')), _val(r.get('TotalAmount')),
                        _val(r.get('ExpectedDeliveryDate')), _val(r.get('CreatedAt')),
                        _val(r.get('OrderStatusID')),
                    ]
                )
                created += 1
        self.stdout.write(self.style.SUCCESS(f'  PurchaseOrders: {created} created, {skipped} skipped'))

    # ── PurchaseOrderDetails ──────────────────────────────────────────────────
    def _seed_purchase_order_details(self, rows):
        created = skipped = 0
        with connection.cursor() as cur:
            for r in rows:
                cur.execute(
                    'SELECT 1 FROM "PurchaseOrderDetails" WHERE "PurchaseOrderDetailID" = %s',
                    [r['PurchaseOrderDetailID']]
                )
                if cur.fetchone():
                    skipped += 1
                    continue
                cur.execute(
                    'INSERT INTO "PurchaseOrderDetails" '
                    '("PurchaseOrderDetailID","PurchaseOrderID","ProductID","Quantity","UnitCost") '
                    'VALUES (%s,%s,%s,%s,%s)',
                    [r['PurchaseOrderDetailID'], r['PurchaseOrderID'],
                     r['ProductID'], r['Quantity'], r['UnitCost']]
                )
                created += 1
        self.stdout.write(self.style.SUCCESS(f'  PurchaseOrderDetails: {created} created, {skipped} skipped'))

    # ── Reset sequences ───────────────────────────────────────────────────────
    def _reset_sequences(self):
        tables = [
            ('"Customers"',             'CustomerID'),
            ('"Customer_Address"',      'AddressID'),
            ('"Orders"',                'OrderID'),
            ('"OrderDetails"',          'OrderDetailID'),
            ('"Payments"',              'PaymentID'),
            ('"Reviews"',               'ReviewID'),
            ('"PurchaseOrders"',        'PurchaseOrderID'),
            ('"PurchaseOrderDetails"',  'PurchaseOrderDetailID'),
        ]
        with connection.cursor() as cur:
            for table, col in tables:
                try:
                    cur.execute(
                        f'SELECT setval(pg_get_serial_sequence(%s, %s), '
                        f'COALESCE(MAX("{col}"), 1)) FROM {table}',
                        [table.strip('"'), col]
                    )
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'  Sequence reset skipped for {table}: {e}'))
        self.stdout.write(self.style.SUCCESS('  Sequences reset.'))
