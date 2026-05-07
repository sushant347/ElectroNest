import json
import os

from django.core.management.base import BaseCommand
from django.db import connection


DATA_FILE = os.path.join(os.path.dirname(__file__), 'transactional_data.json')


def _val(value):
    return value if value not in ('', None) else None


def _ids(cur, table, column):
    cur.execute(f'SELECT "{column}" FROM {table}')
    return {row[0] for row in cur.fetchall()}


def _chunks(rows, size=2000):
    for idx in range(0, len(rows), size):
        yield rows[idx:idx + size]


def _many(cur, sql, rows):
    count = 0
    for chunk in _chunks(rows):
        cur.executemany(sql, chunk)
        count += len(chunk)
    return count


class Command(BaseCommand):
    help = 'Fast bulk import transactional JSON into a clean PostgreSQL deployment database.'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='Truncate transactional tables before import.')

    def handle(self, *args, **options):
        if not os.path.exists(DATA_FILE):
            self.stdout.write(self.style.WARNING('transactional_data.json not found.'))
            return

        with open(DATA_FILE, encoding='utf-8') as f:
            data = json.load(f)

        with connection.cursor() as cur:
            if options['reset']:
                cur.execute(
                    'TRUNCATE "Cart","Whishlist","CustomerNotifications","ProductQuestions",'
                    '"PurchaseOrderDetails","PurchaseOrders","Payments","OrderDetails",'
                    '"Reviews","Orders","Customer_Address","Customers" '
                    'RESTART IDENTITY CASCADE'
                )

            customers = [
                [
                    r['CustomerID'], r['FirstName'], r['LastName'], r['Email'], r.get('Phone', ''),
                    r.get('Gender', ''), _val(r.get('DateOfBirth')), _val(r.get('RegistrationDate')),
                    r.get('isActive', True), _val(r.get('Password')),
                ]
                for r in data.get('customers', [])
            ]
            self.stdout.write(f'Customers: {_many(cur, """INSERT INTO "Customers" ("CustomerID","FirstName","LastName","Email","Phone","Gender","DateOfBirth","RegistrationDate","isActive","Password") VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT ("CustomerID") DO NOTHING""", customers)} inserted/skipped')
            valid_customers = _ids(cur, '"Customers"', 'CustomerID')

            addresses = [
                [
                    r['AddressID'], r['CustomerID'], r.get('Street', ''), r['City'], r.get('Province', ''),
                    r.get('PostalCode', ''), r.get('Country', 'Nepal'), r.get('AddressType', 'Shipping'),
                ]
                for r in data.get('customer_addresses', [])
                if r['CustomerID'] in valid_customers
            ]
            self.stdout.write(f'Customer_Address: {_many(cur, """INSERT INTO "Customer_Address" ("AddressID","CustomerID","Street","City","Province","PostalCode","Country","AddressType") VALUES (%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT ("AddressID") DO NOTHING""", addresses)} inserted/skipped')
            valid_addresses = _ids(cur, '"Customer_Address"', 'AddressID')

            orders = [
                [
                    r['OrderID'], r.get('OrderNumber'), r['CustomerID'], r.get('OrderStatusID'),
                    _val(r.get('OrderDate')), r.get('TotalAmount'), r.get('AddressID') if r.get('AddressID') in valid_addresses else None,
                    r.get('ShippingCost', 0), _val(r.get('EstimatedDeliveryDate')), r.get('TrackingNumber'),
                    _val(r.get('CreatedAt')), _val(r.get('UpdatedAt')),
                ]
                for r in data.get('orders', [])
                if r['CustomerID'] in valid_customers
            ]
            self.stdout.write(f'Orders: {_many(cur, """INSERT INTO "Orders" ("OrderID","OrderNumber","CustomerID","OrderStatusID","OrderDate","TotalAmount","AddressID","ShippingCost","EstimatedDeliveryDate","TrackingNumber","CreatedAt","UpdatedAt") VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT ("OrderID") DO NOTHING""", orders)} inserted/skipped')
            valid_orders = _ids(cur, '"Orders"', 'OrderID')
            valid_products = _ids(cur, '"Products"', 'ProductID')

            details = [
                [r['OrderDetailID'], r['OrderID'], r['ProductID'], r.get('Quantity'), r.get('UnitPrice')]
                for r in data.get('order_details', [])
                if r['OrderID'] in valid_orders and r['ProductID'] in valid_products
            ]
            self.stdout.write(f'OrderDetails: {_many(cur, """INSERT INTO "OrderDetails" ("OrderDetailID","OrderID","ProductID","Quantity","UnitPrice") VALUES (%s,%s,%s,%s,%s) ON CONFLICT ("OrderDetailID") DO NOTHING""", details)} inserted/skipped')

            valid_methods = _ids(cur, '"PaymentMethods"', 'MethodID')
            payments = [
                [r['PaymentID'], r['OrderID'], r.get('MethodID'), r.get('DiscountPercent', 0), r.get('PayableAmount'), _val(r.get('PaidAt'))]
                for r in data.get('payments', [])
                if r['OrderID'] in valid_orders and r.get('MethodID') in valid_methods
            ]
            self.stdout.write(f'Payments: {_many(cur, """INSERT INTO "Payments" ("PaymentID","OrderID","MethodID","DiscountPercent","PayableAmount","PaidAt") VALUES (%s,%s,%s,%s,%s,%s) ON CONFLICT ("PaymentID") DO NOTHING""", payments)} inserted/skipped')

            reviews = [
                [r['ReviewID'], r['ProductID'], r['CustomerID'], r.get('Rating'), r.get('Comment'), _val(r.get('ReviewDate'))]
                for r in data.get('reviews', [])
                if r['ProductID'] in valid_products and r['CustomerID'] in valid_customers
            ]
            self.stdout.write(f'Reviews: {_many(cur, """INSERT INTO "Reviews" ("ReviewID","ProductID","CustomerID","Rating","Comment","ReviewDate") VALUES (%s,%s,%s,%s,%s,%s) ON CONFLICT ("ProductID","CustomerID") DO NOTHING""", reviews)} inserted/skipped')

            valid_suppliers = _ids(cur, '"Suppliers"', 'SupplierID')
            valid_statuses = _ids(cur, '"OrderStatus"', 'OrderStatusID')
            purchase_orders = [
                [r['PurchaseOrderID'], r['SupplierID'], _val(r.get('OrderDate')), r.get('TotalAmount'), _val(r.get('ExpectedDeliveryDate')), _val(r.get('CreatedAt')), r.get('OrderStatusID')]
                for r in data.get('purchase_orders', [])
                if r['SupplierID'] in valid_suppliers and r.get('OrderStatusID') in valid_statuses
            ]
            self.stdout.write(f'PurchaseOrders: {_many(cur, """INSERT INTO "PurchaseOrders" ("PurchaseOrderID","SupplierID","OrderDate","TotalAmount","ExpectedDeliveryDate","CreatedAt","OrderStatusID") VALUES (%s,%s,%s,%s,%s,%s,%s) ON CONFLICT ("PurchaseOrderID") DO NOTHING""", purchase_orders)} inserted/skipped')
            valid_po = _ids(cur, '"PurchaseOrders"', 'PurchaseOrderID')

            po_details = [
                [r['PurchaseOrderDetailID'], r['PurchaseOrderID'], r['ProductID'], r.get('Quantity'), r.get('UnitCost')]
                for r in data.get('purchase_order_details', [])
                if r['PurchaseOrderID'] in valid_po and r['ProductID'] in valid_products
            ]
            self.stdout.write(f'PurchaseOrderDetails: {_many(cur, """INSERT INTO "PurchaseOrderDetails" ("PurchaseOrderDetailID","PurchaseOrderID","ProductID","Quantity","UnitCost") VALUES (%s,%s,%s,%s,%s) ON CONFLICT ("PurchaseOrderDetailID") DO NOTHING""", po_details)} inserted/skipped')

            carts = [
                [r['CartID'], r['CustomerID'], r['ProductID'], r.get('OrderCount', 1), _val(r.get('CreatedAt'))]
                for r in data.get('carts', [])
                if r['CustomerID'] in valid_customers and r['ProductID'] in valid_products
            ]
            self.stdout.write(f'Cart: {_many(cur, """INSERT INTO "Cart" ("CartID","CustomerID","ProductID","OrderCount","CreatedAt") VALUES (%s,%s,%s,%s,%s) ON CONFLICT ("CartID") DO NOTHING""", carts)} inserted/skipped')

            wishlists = [
                [r['WishlistID'], r['CustomerID'], r['ProductID'], _val(r.get('AddedAt'))]
                for r in data.get('wishlists', [])
                if r['CustomerID'] in valid_customers and r['ProductID'] in valid_products
            ]
            self.stdout.write(f'Whishlist: {_many(cur, """INSERT INTO "Whishlist" ("WishlistID","CustomerID","ProductID","AddedAt") VALUES (%s,%s,%s,%s) ON CONFLICT ("WishlistID") DO NOTHING""", wishlists)} inserted/skipped')

            for table, col in [
                ('"Customers"', 'CustomerID'), ('"Customer_Address"', 'AddressID'), ('"Orders"', 'OrderID'),
                ('"OrderDetails"', 'OrderDetailID'), ('"Payments"', 'PaymentID'), ('"Reviews"', 'ReviewID'),
                ('"PurchaseOrders"', 'PurchaseOrderID'), ('"PurchaseOrderDetails"', 'PurchaseOrderDetailID'),
                ('"Cart"', 'CartID'), ('"Whishlist"', 'WishlistID'),
            ]:
                cur.execute(
                    f'SELECT setval(pg_get_serial_sequence(%s, %s), COALESCE(MAX("{col}"), 1)) FROM {table}',
                    [table, col],
                )

        self.stdout.write(self.style.SUCCESS('Fast transactional import complete.'))
