"""
Management command to export ALL local SQL Server data to JSON.

Run this command on your LOCAL machine (with SQL Server connection):
    python manage.py export_local_data

It writes:  backend/products/management/commands/transactional_data.json

Then commit + push that JSON file. The seed_all_data command on Render
will import it automatically during deployment.
"""
import json
import os
from decimal import Decimal
from datetime import datetime, date
from django.core.management.base import BaseCommand
from django.db import connection


class _Encoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat() if obj else None
        if isinstance(obj, date):
            return obj.isoformat() if obj else None
        return super().default(obj)


def _fetch(cursor, sql, label, stdout):
    try:
        cursor.execute(sql)
        cols = [c[0] for c in cursor.description]
        rows = [dict(zip(cols, row)) for row in cursor.fetchall()]
        stdout.write(f'  {label}: {len(rows)} rows')
        return rows
    except Exception as e:
        stdout.write(f'  {label}: SKIPPED ({e})')
        return []


class Command(BaseCommand):
    help = 'Export all local SQL Server data to transactional_data.json'

    def handle(self, *args, **options):
        self.stdout.write('Exporting local data...')
        data = {}

        with connection.cursor() as cur:
            data['customers'] = _fetch(cur,
                'SELECT CustomerID, FirstName, LastName, Email, Phone, Gender, '
                'DateOfBirth, RegistrationDate, isActive, Password '
                'FROM Customers',
                'Customers', self.stdout)

            data['customer_addresses'] = _fetch(cur,
                'SELECT AddressID, CustomerID, Street, City, Province, '
                'PostalCode, Country, AddressType FROM Customer_Address',
                'Customer_Address', self.stdout)

            data['orders'] = _fetch(cur,
                'SELECT OrderID, OrderNumber, CustomerID, OrderStatusID, '
                'OrderDate, TotalAmount, AddressID, ShippingCost, '
                'EstimatedDeliveryDate, TrackingNumber, CreatedAt, UpdatedAt '
                'FROM Orders',
                'Orders', self.stdout)

            data['order_details'] = _fetch(cur,
                'SELECT OrderDetailID, OrderID, ProductID, Quantity, UnitPrice '
                'FROM OrderDetails',
                'OrderDetails', self.stdout)

            data['payments'] = _fetch(cur,
                'SELECT PaymentID, OrderID, MethodID, DiscountPercent, '
                'PayableAmount, PaidAt FROM Payments',
                'Payments', self.stdout)

            data['reviews'] = _fetch(cur,
                'SELECT ReviewID, ProductID, CustomerID, Rating, Comment, '
                'ReviewDate FROM Reviews',
                'Reviews', self.stdout)

            data['purchase_orders'] = _fetch(cur,
                'SELECT PurchaseOrderID, SupplierID, OrderDate, TotalAmount, '
                'ExpectedDeliveryDate, CreatedAt, OrderStatusID '
                'FROM PurchaseOrders',
                'PurchaseOrders', self.stdout)

            data['purchase_order_details'] = _fetch(cur,
                'SELECT PurchaseOrderDetailID, PurchaseOrderID, ProductID, '
                'Quantity, UnitCost FROM PurchaseOrderDetails',
                'PurchaseOrderDetails', self.stdout)

            data['wishlists'] = _fetch(cur,
                'SELECT WishlistID, CustomerID, ProductID, AddedAt '
                'FROM Whishlist',
                'Wishlist', self.stdout)

            data['carts'] = _fetch(cur,
                'SELECT CartID, CustomerID, ProductID, OrderCount, CreatedAt '
                'FROM Cart',
                'Cart', self.stdout)

        out = os.path.join(os.path.dirname(__file__), 'transactional_data.json')
        with open(out, 'w', encoding='utf-8') as f:
            json.dump(data, f, cls=_Encoder, ensure_ascii=False, indent=2)

        self.stdout.write(self.style.SUCCESS(f'\nDone! Saved to: {out}'))
        self.stdout.write(self.style.SUCCESS(
            'Next: commit transactional_data.json and push to GitHub, '
            'then redeploy on Render.'
        ))
