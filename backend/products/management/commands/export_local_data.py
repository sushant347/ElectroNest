"""
Management command to export ALL local SQL Server data to JSON.

Run this command on your LOCAL machine (with SQL Server connection):
    python manage.py export_local_data

It writes:
    backend/products/management/commands/seed_data.json
    backend/products/management/commands/transactional_data.json

Then commit + push those JSON files. The seed commands on Render
will import them automatically during deployment.
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
        core_data = {}
        transactional_data = {}

        with connection.cursor() as cur:
            core_data['categories'] = _fetch(cur,
                'SELECT CategoryID AS id, CategoryName AS name FROM Categories',
                'Categories', self.stdout)

            core_data['suppliers'] = _fetch(cur,
                'SELECT SupplierID AS id, SupplierName AS name, '
                'ContactPersonName AS contact_person_name, ContactEmail AS contact_email, '
                'Phone AS phone, City AS city, Country AS country, isActive AS is_active '
                'FROM Suppliers',
                'Suppliers', self.stdout)

            core_data['products'] = _fetch(cur,
                'SELECT ProductID AS id, SKU AS sku, ProductName AS name, '
                'CategoryID AS category_id, Brand AS brand, OwnerName AS owner_name, '
                'SupplierID AS supplier_id, SellingPrice AS selling_price, '
                'CostPrice AS cost_price, Stock AS stock, ReorderLevel AS reorder_level, '
                'ProductDescription AS description, ProductImageURL AS image_url, '
                'ProductSpecifications AS specifications, UnitsSold AS units_sold '
                'FROM Products',
                'Products', self.stdout)

            core_data['product_variants'] = _fetch(cur,
                'SELECT VariantID AS id, ProductID AS product_id, VariantTitle AS title, '
                'VariantSKU AS sku, VariantColor AS color, VariantSpecs AS specs, '
                'VariantPrice AS price, VariantDiscountPrice AS discount_price, '
                'VariantStock AS stock, SourceVariantID AS source_id, IsDefault AS is_default, '
                'IsActive AS is_active, CreatedAt AS created_at, UpdatedAt AS updated_at '
                'FROM ProductVariants',
                'ProductVariants', self.stdout)

            core_data['market_price_snapshots'] = _fetch(cur,
                'SELECT SnapshotID AS id, ProductID AS product_id, SnapshotMonth AS month, '
                'MarketPrice AS market_price, LowestMarketPrice AS lowest_market_price, '
                'HighestMarketPrice AS highest_market_price, VolatilityPercent AS volatility_percent, '
                'Source AS source, CurrencyNote AS currency_note, OffersJSON AS offers_json, '
                'FetchedAt AS fetched_at '
                'FROM MarketPriceSnapshots',
                'MarketPriceSnapshots', self.stdout)

            transactional_data['customers'] = _fetch(cur,
                'SELECT CustomerID, FirstName, LastName, Email, Phone, Gender, '
                'DateOfBirth, RegistrationDate, isActive, Password '
                'FROM Customers',
                'Customers', self.stdout)

            transactional_data['customer_addresses'] = _fetch(cur,
                'SELECT AddressID, CustomerID, Street, City, Province, '
                'PostalCode, Country, AddressType FROM Customer_Address',
                'Customer_Address', self.stdout)

            transactional_data['orders'] = _fetch(cur,
                'SELECT OrderID, OrderNumber, CustomerID, OrderStatusID, '
                'OrderDate, TotalAmount, AddressID, ShippingCost, '
                'EstimatedDeliveryDate, TrackingNumber, CreatedAt, UpdatedAt '
                'FROM Orders',
                'Orders', self.stdout)

            transactional_data['order_details'] = _fetch(cur,
                'SELECT OrderDetailID, OrderID, ProductID, Quantity, UnitPrice '
                'FROM OrderDetails',
                'OrderDetails', self.stdout)

            transactional_data['payments'] = _fetch(cur,
                'SELECT PaymentID, OrderID, MethodID, DiscountPercent, '
                'PayableAmount, PaidAt FROM Payments',
                'Payments', self.stdout)

            transactional_data['reviews'] = _fetch(cur,
                'SELECT ReviewID, ProductID, CustomerID, Rating, Comment, '
                'ReviewDate FROM Reviews',
                'Reviews', self.stdout)

            transactional_data['purchase_orders'] = _fetch(cur,
                'SELECT PurchaseOrderID, SupplierID, OrderDate, TotalAmount, '
                'ExpectedDeliveryDate, CreatedAt, OrderStatusID '
                'FROM PurchaseOrders',
                'PurchaseOrders', self.stdout)

            transactional_data['purchase_order_details'] = _fetch(cur,
                'SELECT PurchaseOrderDetailID, PurchaseOrderID, ProductID, '
                'Quantity, UnitCost FROM PurchaseOrderDetails',
                'PurchaseOrderDetails', self.stdout)

            transactional_data['wishlists'] = _fetch(cur,
                'SELECT WishlistID, CustomerID, ProductID, AddedAt '
                'FROM Whishlist',
                'Wishlist', self.stdout)

            transactional_data['carts'] = _fetch(cur,
                'SELECT CartID, CustomerID, ProductID, OrderCount, CreatedAt '
                'FROM Cart',
                'Cart', self.stdout)

            transactional_data['product_questions'] = _fetch(cur,
                'SELECT id, product_id, customer_id, question, answer, status, '
                'is_public, answered_by_id, asked_at, answered_at, updated_at '
                'FROM ProductQuestions',
                'ProductQuestions', self.stdout)

            transactional_data['customer_notifications'] = _fetch(cur,
                'SELECT id, customer_id, question_id, title, message, is_read, created_at '
                'FROM CustomerNotifications',
                'CustomerNotifications', self.stdout)

        base_dir = os.path.dirname(__file__)
        seed_out = os.path.join(base_dir, 'seed_data.json')
        with open(seed_out, 'w', encoding='utf-8') as f:
            json.dump(core_data, f, cls=_Encoder, ensure_ascii=False, indent=2)

        transactional_out = os.path.join(base_dir, 'transactional_data.json')
        with open(transactional_out, 'w', encoding='utf-8') as f:
            json.dump(transactional_data, f, cls=_Encoder, ensure_ascii=False, indent=2)

        self.stdout.write(self.style.SUCCESS(f'\nDone! Saved to: {seed_out}'))
        self.stdout.write(self.style.SUCCESS(f'Done! Saved to: {transactional_out}'))
        self.stdout.write(self.style.SUCCESS(
            'Next: commit seed_data.json and transactional_data.json, '
            'then redeploy on Render.'
        ))
