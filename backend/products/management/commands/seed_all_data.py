"""
Management command to import ALL transactional data into PostgreSQL.

Reads transactional_data.json (created by export_local_data command).
Safe to re-run — uses get_or_create / skip-if-exists for every table.
Skips rows whose FK parent is missing (orphaned data from SQL Server).

Automatically called during Render build:
    python manage.py seed_all_data
"""
import json
import os
from django.core.management.base import BaseCommand
from django.db import connection

DATA_FILE = os.path.join(os.path.dirname(__file__), 'transactional_data.json')


def _val(v):
    """Convert empty string to None for nullable fields."""
    return v if v not in ('', None) else None


def _ids_in_db(cur, table, col):
    """Return a set of all values of `col` already in `table`."""
    cur.execute(f'SELECT "{col}" FROM {table}')
    return {row[0] for row in cur.fetchall()}


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

        with connection.cursor() as cur:
            # ── Step 1: Customers ─────────────────────────────────────────────
            self._seed_customers(cur, data.get('customers', []))
            valid_customer_ids = _ids_in_db(cur, '"Customers"', 'CustomerID')

            # ── Step 2: Customer_Address (requires valid CustomerID) ───────────
            self._seed_customer_addresses(cur, data.get('customer_addresses', []), valid_customer_ids)

            # ── Step 3: Orders (requires valid CustomerID) ────────────────────
            # AddressID FK is nullable — pass None for missing addresses
            valid_address_ids = _ids_in_db(cur, '"Customer_Address"', 'AddressID')
            self._seed_orders(cur, data.get('orders', []), valid_customer_ids, valid_address_ids)
            valid_order_ids = _ids_in_db(cur, '"Orders"', 'OrderID')

            # ── Step 4: OrderDetails (requires valid OrderID + ProductID) ──────
            valid_product_ids = _ids_in_db(cur, '"Products"', 'ProductID')
            self._seed_order_details(cur, data.get('order_details', []), valid_order_ids, valid_product_ids)

            # ── Step 5: Payments (requires valid OrderID + MethodID) ───────────
            valid_method_ids = _ids_in_db(cur, '"PaymentMethods"', 'MethodID')
            self._seed_payments(cur, data.get('payments', []), valid_order_ids, valid_method_ids)

            # ── Step 6: Reviews (requires valid ProductID + CustomerID) ─────────
            self._seed_reviews(cur, data.get('reviews', []), valid_product_ids, valid_customer_ids)

            # ── Step 7: PurchaseOrders (requires valid SupplierID) ─────────────
            valid_supplier_ids = _ids_in_db(cur, '"Suppliers"', 'SupplierID')
            valid_status_ids   = _ids_in_db(cur, '"OrderStatus"', 'OrderStatusID')
            self._seed_purchase_orders(cur, data.get('purchase_orders', []), valid_supplier_ids, valid_status_ids)
            valid_po_ids = _ids_in_db(cur, '"PurchaseOrders"', 'PurchaseOrderID')

            # ── Step 8: PurchaseOrderDetails ────────────────────────────────────
            self._seed_purchase_order_details(cur, data.get('purchase_order_details', []), valid_po_ids, valid_product_ids)

        self._reset_sequences()
        self.stdout.write(self.style.SUCCESS('All transactional data imported.'))

    # ── Customers ────────────────────────────────────────────────────────────
    def _seed_customers(self, cur, rows):
        created = skipped = 0
        existing = _ids_in_db(cur, '"Customers"', 'CustomerID')
        for r in rows:
            if r['CustomerID'] in existing:
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
            existing.add(r['CustomerID'])
            created += 1
        self.stdout.write(self.style.SUCCESS(f'  Customers: {created} created, {skipped} skipped'))

    # ── Customer_Address ─────────────────────────────────────────────────────
    def _seed_customer_addresses(self, cur, rows, valid_customer_ids):
        created = skipped = orphaned = 0
        existing = _ids_in_db(cur, '"Customer_Address"', 'AddressID')
        for r in rows:
            if r['AddressID'] in existing:
                skipped += 1
                continue
            if r['CustomerID'] not in valid_customer_ids:
                orphaned += 1
                continue
            cur.execute(
                'INSERT INTO "Customer_Address" ("AddressID","CustomerID","Street","City",'
                '"Province","PostalCode","Country","AddressType") '
                'VALUES (%s,%s,%s,%s,%s,%s,%s,%s)',
                [
                    r['AddressID'], r['CustomerID'],
                    r.get('Street', ''), r.get('City', ''),
                    r.get('Province', ''), r.get('PostalCode', ''),
                    r.get('Country', 'Nepal'), r.get('AddressType', 'Shipping'),
                ]
            )
            existing.add(r['AddressID'])
            created += 1
        self.stdout.write(self.style.SUCCESS(
            f'  Customer_Address: {created} created, {skipped} skipped, {orphaned} orphaned (skipped)'
        ))

    # ── Orders ────────────────────────────────────────────────────────────────
    def _seed_orders(self, cur, rows, valid_customer_ids, valid_address_ids):
        created = skipped = orphaned = 0
        existing = _ids_in_db(cur, '"Orders"', 'OrderID')
        for r in rows:
            if r['OrderID'] in existing:
                skipped += 1
                continue
            if r['CustomerID'] not in valid_customer_ids:
                orphaned += 1
                continue
            # AddressID is nullable — set to NULL if address doesn't exist
            address_id = r.get('AddressID')
            if address_id not in valid_address_ids:
                address_id = None
            cur.execute(
                'INSERT INTO "Orders" ("OrderID","OrderNumber","CustomerID","OrderStatusID",'
                '"OrderDate","TotalAmount","AddressID","ShippingCost",'
                '"EstimatedDeliveryDate","TrackingNumber","CreatedAt","UpdatedAt") '
                'VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)',
                [
                    r['OrderID'], r['OrderNumber'], r['CustomerID'],
                    _val(r.get('OrderStatusID')), _val(r.get('OrderDate')),
                    r['TotalAmount'], address_id,
                    r.get('ShippingCost', '200.00'),
                    _val(r.get('EstimatedDeliveryDate')),
                    r.get('TrackingNumber', ''),
                    _val(r.get('CreatedAt')), _val(r.get('UpdatedAt')),
                ]
            )
            existing.add(r['OrderID'])
            created += 1
        self.stdout.write(self.style.SUCCESS(
            f'  Orders: {created} created, {skipped} skipped, {orphaned} orphaned (skipped)'
        ))

    # ── OrderDetails ──────────────────────────────────────────────────────────
    def _seed_order_details(self, cur, rows, valid_order_ids, valid_product_ids):
        created = skipped = orphaned = 0
        existing = _ids_in_db(cur, '"OrderDetails"', 'OrderDetailID')
        for r in rows:
            if r['OrderDetailID'] in existing:
                skipped += 1
                continue
            if r['OrderID'] not in valid_order_ids or r['ProductID'] not in valid_product_ids:
                orphaned += 1
                continue
            cur.execute(
                'INSERT INTO "OrderDetails" ("OrderDetailID","OrderID","ProductID","Quantity","UnitPrice") '
                'VALUES (%s,%s,%s,%s,%s)',
                [r['OrderDetailID'], r['OrderID'], r['ProductID'], r['Quantity'], r['UnitPrice']]
            )
            existing.add(r['OrderDetailID'])
            created += 1
        self.stdout.write(self.style.SUCCESS(
            f'  OrderDetails: {created} created, {skipped} skipped, {orphaned} orphaned (skipped)'
        ))

    # ── Payments ──────────────────────────────────────────────────────────────
    def _seed_payments(self, cur, rows, valid_order_ids, valid_method_ids):
        created = skipped = orphaned = 0
        existing = _ids_in_db(cur, '"Payments"', 'PaymentID')
        for r in rows:
            if r['PaymentID'] in existing:
                skipped += 1
                continue
            order_id = _val(r.get('OrderID'))
            if order_id is not None and order_id not in valid_order_ids:
                orphaned += 1
                continue
            if r['MethodID'] not in valid_method_ids:
                orphaned += 1
                continue
            cur.execute(
                'INSERT INTO "Payments" ("PaymentID","OrderID","MethodID","DiscountPercent","PayableAmount","PaidAt") '
                'VALUES (%s,%s,%s,%s,%s,%s)',
                [
                    r['PaymentID'], order_id, r['MethodID'],
                    r.get('DiscountPercent', '0'), _val(r.get('PayableAmount')),
                    _val(r.get('PaidAt')),
                ]
            )
            existing.add(r['PaymentID'])
            created += 1
        self.stdout.write(self.style.SUCCESS(
            f'  Payments: {created} created, {skipped} skipped, {orphaned} orphaned (skipped)'
        ))

    # ── Reviews ───────────────────────────────────────────────────────────────
    def _seed_reviews(self, cur, rows, valid_product_ids, valid_customer_ids):
        created = skipped = orphaned = 0
        existing = _ids_in_db(cur, '"Reviews"', 'ReviewID')
        for r in rows:
            if r['ReviewID'] in existing:
                skipped += 1
                continue
            if r['ProductID'] not in valid_product_ids or r['CustomerID'] not in valid_customer_ids:
                orphaned += 1
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
            existing.add(r['ReviewID'])
            created += 1
        self.stdout.write(self.style.SUCCESS(
            f'  Reviews: {created} created, {skipped} skipped, {orphaned} orphaned (skipped)'
        ))

    # ── PurchaseOrders ────────────────────────────────────────────────────────
    def _seed_purchase_orders(self, cur, rows, valid_supplier_ids, valid_status_ids):
        created = skipped = orphaned = 0
        existing = _ids_in_db(cur, '"PurchaseOrders"', 'PurchaseOrderID')
        for r in rows:
            if r['PurchaseOrderID'] in existing:
                skipped += 1
                continue
            if r['SupplierID'] not in valid_supplier_ids:
                orphaned += 1
                continue
            status_id = _val(r.get('OrderStatusID'))
            if status_id is not None and status_id not in valid_status_ids:
                status_id = None
            cur.execute(
                'INSERT INTO "PurchaseOrders" ("PurchaseOrderID","SupplierID","OrderDate",'
                '"TotalAmount","ExpectedDeliveryDate","CreatedAt","OrderStatusID") '
                'VALUES (%s,%s,%s,%s,%s,%s,%s)',
                [
                    r['PurchaseOrderID'], r['SupplierID'],
                    _val(r.get('OrderDate')), _val(r.get('TotalAmount')),
                    _val(r.get('ExpectedDeliveryDate')), _val(r.get('CreatedAt')),
                    status_id,
                ]
            )
            existing.add(r['PurchaseOrderID'])
            created += 1
        self.stdout.write(self.style.SUCCESS(
            f'  PurchaseOrders: {created} created, {skipped} skipped, {orphaned} orphaned (skipped)'
        ))

    # ── PurchaseOrderDetails ──────────────────────────────────────────────────
    def _seed_purchase_order_details(self, cur, rows, valid_po_ids, valid_product_ids):
        created = skipped = orphaned = 0
        existing = _ids_in_db(cur, '"PurchaseOrderDetails"', 'PurchaseOrderDetailID')
        for r in rows:
            if r['PurchaseOrderDetailID'] in existing:
                skipped += 1
                continue
            if r['PurchaseOrderID'] not in valid_po_ids or r['ProductID'] not in valid_product_ids:
                orphaned += 1
                continue
            cur.execute(
                'INSERT INTO "PurchaseOrderDetails" '
                '("PurchaseOrderDetailID","PurchaseOrderID","ProductID","Quantity","UnitCost") '
                'VALUES (%s,%s,%s,%s,%s)',
                [r['PurchaseOrderDetailID'], r['PurchaseOrderID'],
                 r['ProductID'], r['Quantity'], r['UnitCost']]
            )
            existing.add(r['PurchaseOrderDetailID'])
            created += 1
        self.stdout.write(self.style.SUCCESS(
            f'  PurchaseOrderDetails: {created} created, {skipped} skipped, {orphaned} orphaned (skipped)'
        ))

    # ── Reset sequences ───────────────────────────────────────────────────────
    def _reset_sequences(self):
        tables = [
            ('"Customers"',            'Customers',            'CustomerID'),
            ('"Customer_Address"',     'Customer_Address',     'AddressID'),
            ('"Orders"',               'Orders',               'OrderID'),
            ('"OrderDetails"',         'OrderDetails',         'OrderDetailID'),
            ('"Payments"',             'Payments',             'PaymentID'),
            ('"Reviews"',              'Reviews',              'ReviewID'),
            ('"PurchaseOrders"',       'PurchaseOrders',       'PurchaseOrderID'),
            ('"PurchaseOrderDetails"', 'PurchaseOrderDetails', 'PurchaseOrderDetailID'),
        ]
        with connection.cursor() as cur:
            for quoted_table, plain_table, col in tables:
                try:
                    cur.execute(
                        f'SELECT setval(pg_get_serial_sequence(%s, %s), '
                        f'COALESCE(MAX("{col}"), 1)) FROM {quoted_table}',
                        [plain_table, col]
                    )
                except Exception as e:
                    self.stdout.write(self.style.WARNING(
                        f'  Sequence reset skipped for {quoted_table}: {e}'
                    ))
        self.stdout.write(self.style.SUCCESS('  Sequences reset.'))
