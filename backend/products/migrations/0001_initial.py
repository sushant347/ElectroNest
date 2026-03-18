import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True
    dependencies = []

    operations = [

        # ── Categories ── RunSQL creates the actual table ────────────────────
        migrations.RunSQL(
            sql='''
                CREATE TABLE "Categories" (
                    "CategoryID"   SERIAL PRIMARY KEY,
                    "CategoryName" VARCHAR(50) NOT NULL
                );
            ''',
            reverse_sql='DROP TABLE IF EXISTS "Categories" CASCADE;',
        ),
        # State-only entry so Django migration state knows about Category
        migrations.CreateModel(
            name='Category',
            fields=[
                ('id',   models.AutoField(db_column='CategoryID', primary_key=True, serialize=False)),
                ('name', models.CharField(db_column='CategoryName', max_length=50)),
            ],
            options={'db_table': 'Categories', 'managed': False, 'verbose_name_plural': 'Categories'},
        ),

        # ── Suppliers ────────────────────────────────────────────────────────
        migrations.RunSQL(
            sql='''
                CREATE TABLE "Suppliers" (
                    "SupplierID"          SERIAL       PRIMARY KEY,
                    "SupplierName"        VARCHAR(100) NOT NULL,
                    "ContactPersonName"   VARCHAR(50)  NOT NULL DEFAULT '',
                    "ContactEmail"        VARCHAR(100) NOT NULL DEFAULT '',
                    "Phone"               VARCHAR(20)  NOT NULL DEFAULT '',
                    "City"                VARCHAR(255) NOT NULL DEFAULT '',
                    "Country"             VARCHAR(255) NOT NULL DEFAULT '',
                    "isActive"            BOOLEAN      NOT NULL DEFAULT TRUE,
                    "CreatedAt"           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
                );
            ''',
            reverse_sql='DROP TABLE IF EXISTS "Suppliers" CASCADE;',
        ),
        migrations.CreateModel(
            name='Supplier',
            fields=[
                ('id',                  models.AutoField(db_column='SupplierID', primary_key=True, serialize=False)),
                ('name',                models.CharField(db_column='SupplierName', max_length=100)),
                ('contact_person_name', models.CharField(blank=True, db_column='ContactPersonName', default='', max_length=50)),
                ('contact_email',       models.CharField(blank=True, db_column='ContactEmail', default='', max_length=100)),
                ('phone',               models.CharField(blank=True, db_column='Phone', default='', max_length=20)),
                ('city',                models.CharField(blank=True, db_column='City', default='', max_length=255)),
                ('country',             models.CharField(blank=True, db_column='Country', default='', max_length=255)),
                ('is_active',           models.BooleanField(db_column='isActive', default=True)),
                ('created_at',          models.DateTimeField(auto_now_add=True, db_column='CreatedAt')),
            ],
            options={'db_table': 'Suppliers', 'managed': False},
        ),

        # ── Products ─────────────────────────────────────────────────────────
        migrations.RunSQL(
            sql='''
                CREATE TABLE "Products" (
                    "ProductID"             SERIAL        PRIMARY KEY,
                    "SKU"                   VARCHAR(50)   NOT NULL UNIQUE,
                    "ProductName"           VARCHAR(100)  NOT NULL,
                    "CategoryID"            INTEGER,
                    "Brand"                 VARCHAR(50)   NOT NULL DEFAULT '',
                    "OwnerName"             VARCHAR(100)  NOT NULL DEFAULT '',
                    "SupplierID"            INTEGER,
                    "SellingPrice"          DECIMAL(10,2) NOT NULL,
                    "CostPrice"             DECIMAL(10,2) NOT NULL,
                    "Stock"                 INTEGER       NOT NULL DEFAULT 0,
                    "ReorderLevel"          INTEGER       NOT NULL DEFAULT 10,
                    "ProductDescription"    VARCHAR(255)  NOT NULL DEFAULT '',
                    "ProductImageURL"       VARCHAR(255)  NOT NULL DEFAULT '',
                    "ProductSpecifications" VARCHAR(3000) NOT NULL DEFAULT '',
                    "UnitsSold"             INTEGER       NOT NULL DEFAULT 0,
                    "createdAt"             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
                    "updatedAt"             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
                );
            ''',
            reverse_sql='DROP TABLE IF EXISTS "Products" CASCADE;',
        ),
        migrations.CreateModel(
            name='Product',
            fields=[
                ('id',             models.AutoField(db_column='ProductID', primary_key=True, serialize=False)),
                ('sku',            models.CharField(db_column='SKU', max_length=50, unique=True)),
                ('name',           models.CharField(db_column='ProductName', max_length=100)),
                ('brand',          models.CharField(blank=True, db_column='Brand', default='', max_length=50)),
                ('owner_name',     models.CharField(blank=True, db_column='OwnerName', default='', max_length=100)),
                ('selling_price',  models.DecimalField(db_column='SellingPrice', decimal_places=2, max_digits=10)),
                ('cost_price',     models.DecimalField(db_column='CostPrice', decimal_places=2, max_digits=10)),
                ('stock',          models.IntegerField(db_column='Stock', default=0)),
                ('reorder_level',  models.IntegerField(db_column='ReorderLevel', default=10)),
                ('description',    models.CharField(blank=True, db_column='ProductDescription', default='', max_length=255)),
                ('image_url',      models.CharField(blank=True, db_column='ProductImageURL', default='', max_length=255)),
                ('specifications', models.CharField(blank=True, db_column='ProductSpecifications', default='', max_length=3000)),
                ('units_sold',     models.IntegerField(db_column='UnitsSold', default=0)),
                ('created_at',     models.DateTimeField(auto_now_add=True, db_column='createdAt')),
                ('updated_at',     models.DateTimeField(auto_now=True, db_column='updatedAt')),
                ('category',       models.ForeignKey(db_column='CategoryID', null=True, blank=True, on_delete=django.db.models.deletion.PROTECT, to='products.category')),
                ('supplier',       models.ForeignKey(db_column='SupplierID', null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, to='products.supplier')),
            ],
            options={'db_table': 'Products', 'managed': False},
        ),

        # ── Customers (managed=True — Django creates + manages this table) ───
        migrations.CreateModel(
            name='Customer',
            fields=[
                ('id',                models.AutoField(db_column='CustomerID', primary_key=True, serialize=False)),
                ('first_name',        models.CharField(db_column='FirstName', max_length=100)),
                ('last_name',         models.CharField(db_column='LastName', max_length=100)),
                ('email',             models.CharField(db_column='Email', max_length=255)),
                ('phone',             models.CharField(blank=True, db_column='Phone', default='', max_length=20)),
                ('gender',            models.CharField(blank=True, db_column='Gender', default='', max_length=10)),
                ('date_of_birth',     models.DateField(blank=True, db_column='DateOfBirth', null=True)),
                ('registration_date', models.DateTimeField(blank=True, db_column='RegistrationDate', null=True)),
                ('is_active',         models.BooleanField(db_column='isActive', default=True)),
                ('password',          models.CharField(blank=True, db_column='Password', max_length=128, null=True)),
            ],
            options={'db_table': 'Customers', 'managed': True},
        ),

        # ── Reviews ──────────────────────────────────────────────────────────
        migrations.RunSQL(
            sql='''
                CREATE TABLE "Reviews" (
                    "ReviewID"   SERIAL       PRIMARY KEY,
                    "ProductID"  INTEGER,
                    "CustomerID" INTEGER,
                    "Rating"     DECIMAL(3,1),
                    "Comment"    TEXT,
                    "ReviewDate" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                    UNIQUE ("ProductID", "CustomerID")
                );
            ''',
            reverse_sql='DROP TABLE IF EXISTS "Reviews" CASCADE;',
        ),
        migrations.CreateModel(
            name='Review',
            fields=[
                ('id',         models.AutoField(db_column='ReviewID', primary_key=True, serialize=False)),
                ('rating',     models.DecimalField(blank=True, db_column='Rating', decimal_places=1, max_digits=3, null=True)),
                ('comment',    models.TextField(blank=True, db_column='Comment', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_column='ReviewDate')),
                ('product',    models.ForeignKey(db_column='ProductID', on_delete=django.db.models.deletion.CASCADE, related_name='reviews', to='products.product')),
                ('customer',   models.ForeignKey(db_column='CustomerID', on_delete=django.db.models.deletion.CASCADE, related_name='reviews', to='products.customer')),
            ],
            options={'db_table': 'Reviews', 'managed': False},
        ),
    ]
