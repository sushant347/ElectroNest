import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('products', '0001_initial'),
        ('accounts', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [

        # ── OrderStatus ──────────────────────────────────────────────────────
        migrations.RunSQL(
            sql='''
                CREATE TABLE "OrderStatus" (
                    "OrderStatusID" SERIAL      PRIMARY KEY,
                    "StatusName"    VARCHAR(50) NOT NULL UNIQUE
                );
            ''',
            reverse_sql='DROP TABLE IF EXISTS "OrderStatus" CASCADE;',
        ),

        # ── PaymentMethods ────────────────────────────────────────────────────
        migrations.RunSQL(
            sql='''
                CREATE TABLE "PaymentMethods" (
                    "MethodID"   SERIAL      PRIMARY KEY,
                    "MethodName" VARCHAR(50) NOT NULL UNIQUE
                );
            ''',
            reverse_sql='DROP TABLE IF EXISTS "PaymentMethods" CASCADE;',
        ),

        # ── Cart ─────────────────────────────────────────────────────────────
        migrations.RunSQL(
            sql='''
                CREATE TABLE "Cart" (
                    "CartID"     SERIAL      PRIMARY KEY,
                    "CustomerID" INTEGER     NOT NULL,
                    "ProductID"  INTEGER     NOT NULL,
                    "OrderCount" INTEGER     NOT NULL DEFAULT 0,
                    "CreatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            ''',
            reverse_sql='DROP TABLE IF EXISTS "Cart" CASCADE;',
        ),

        # ── Orders ────────────────────────────────────────────────────────────
        migrations.RunSQL(
            sql='''
                CREATE TABLE "Orders" (
                    "OrderID"               SERIAL        PRIMARY KEY,
                    "OrderNumber"           VARCHAR(50)   NOT NULL UNIQUE,
                    "CustomerID"            INTEGER       NOT NULL,
                    "OrderStatusID"         INTEGER,
                    "OrderDate"             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
                    "TotalAmount"           DECIMAL(10,2) NOT NULL,
                    "AddressID"             INTEGER,
                    "ShippingCost"          DECIMAL(10,2) NOT NULL DEFAULT 200.00,
                    "EstimatedDeliveryDate" TIMESTAMPTZ,
                    "TrackingNumber"        VARCHAR(50)   NOT NULL DEFAULT '',
                    "CreatedAt"             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
                    "UpdatedAt"             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
                );
            ''',
            reverse_sql='DROP TABLE IF EXISTS "Orders" CASCADE;',
        ),

        # ── OrderDetails ──────────────────────────────────────────────────────
        migrations.RunSQL(
            sql='''
                CREATE TABLE "OrderDetails" (
                    "OrderDetailID" SERIAL        PRIMARY KEY,
                    "OrderID"       INTEGER       NOT NULL,
                    "ProductID"     INTEGER       NOT NULL,
                    "Quantity"      INTEGER       NOT NULL,
                    "UnitPrice"     DECIMAL(10,2) NOT NULL
                );
            ''',
            reverse_sql='DROP TABLE IF EXISTS "OrderDetails" CASCADE;',
        ),

        # ── Payments ──────────────────────────────────────────────────────────
        migrations.RunSQL(
            sql='''
                CREATE TABLE "Payments" (
                    "PaymentID"       SERIAL        PRIMARY KEY,
                    "OrderID"         INTEGER,
                    "MethodID"        INTEGER       NOT NULL,
                    "DiscountPercent" DECIMAL(5,2)  NOT NULL DEFAULT 0,
                    "PayableAmount"   DECIMAL(10,2),
                    "PaidAt"          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
                );
            ''',
            reverse_sql='DROP TABLE IF EXISTS "Payments" CASCADE;',
        ),

        # ── Wishlist ──────────────────────────────────────────────────────────
        migrations.RunSQL(
            sql='''
                CREATE TABLE "Whishlist" (
                    "WishlistID" SERIAL      PRIMARY KEY,
                    "CustomerID" INTEGER     NOT NULL,
                    "ProductID"  INTEGER     NOT NULL,
                    "AddedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            ''',
            reverse_sql='DROP TABLE IF EXISTS "Whishlist" CASCADE;',
        ),

        # ── CompareList (managed=True) ────────────────────────────────────────
        migrations.CreateModel(
            name='CompareList',
            fields=[
                ('id',       models.AutoField(primary_key=True, serialize=False)),
                ('added_at', models.DateTimeField(auto_now_add=True)),
                ('customer', models.ForeignKey(
                    db_column='CustomerID', db_constraint=False,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='compare_items', to='products.customer',
                )),
                ('product',  models.ForeignKey(
                    db_column='ProductID', db_constraint=False,
                    on_delete=django.db.models.deletion.CASCADE,
                    to='products.product',
                )),
            ],
            options={
                'db_table': 'CompareList',
                'managed': True,
                'ordering': ['-added_at'],
            },
        ),
        migrations.AlterUniqueTogether(
            name='comparelist',
            unique_together={('customer', 'product')},
        ),

        # ── Coupon (managed=True) ─────────────────────────────────────────────
        migrations.CreateModel(
            name='Coupon',
            fields=[
                ('id',                 models.AutoField(primary_key=True, serialize=False)),
                ('code',               models.CharField(max_length=50, unique=True)),
                ('discount_percent',   models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ('max_discount',       models.DecimalField(decimal_places=2, max_digits=10, null=True, blank=True)),
                ('min_order_amount',   models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('usage_limit',        models.IntegerField(default=100)),
                ('used_count',         models.IntegerField(default=0)),
                ('per_customer_limit', models.IntegerField(default=1)),
                ('free_delivery',      models.BooleanField(default=False)),
                ('is_active',          models.BooleanField(default=True)),
                ('valid_from',         models.DateTimeField()),
                ('valid_until',        models.DateTimeField()),
                ('created_at',         models.DateTimeField(auto_now_add=True)),
                ('owner',              models.ForeignKey(
                    blank=True, db_column='OwnerID', db_constraint=False,
                    null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='coupons', to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'db_table': 'Coupons',
                'managed': True,
            },
        ),

        # ── CouponUsage (managed=True) ────────────────────────────────────────
        migrations.CreateModel(
            name='CouponUsage',
            fields=[
                ('id',      models.AutoField(primary_key=True, serialize=False)),
                ('used_at', models.DateTimeField(auto_now_add=True)),
                ('coupon',  models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='customer_usages', to='orders.coupon',
                )),
                ('customer', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='coupon_usages', to='products.customer',
                )),
                ('order',   models.ForeignKey(
                    blank=True, db_constraint=False, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='coupon_usages', to='orders.order',
                )),
            ],
            options={
                'db_table': 'CouponUsage',
                'managed': True,
                'ordering': ['-used_at'],
            },
        ),

        # ── Notification (managed=True) ───────────────────────────────────────
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id',         models.AutoField(primary_key=True, serialize=False)),
                ('title',      models.CharField(max_length=200)),
                ('message',    models.TextField()),
                ('type',       models.CharField(
                    choices=[
                        ('low_stock', 'Low Stock Alert'),
                        ('order_update', 'Order Update'),
                        ('purchase_order', 'Purchase Order'),
                        ('general', 'General'),
                    ],
                    default='general', max_length=20,
                )),
                ('is_read',    models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('product',    models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    to='products.product',
                )),
                ('recipient',  models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notifications', to=settings.AUTH_USER_MODEL,
                )),
                ('sender',     models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='sent_notifications', to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'db_table': 'Notifications',
                'managed': True,
                'ordering': ['-created_at'],
            },
        ),
    ]
