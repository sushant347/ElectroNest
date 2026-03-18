from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [

        # ── Categories ──────────────────────────────────────────────────────
        migrations.RunSQL(
            sql='''
                CREATE TABLE "Categories" (
                    "CategoryID"   SERIAL PRIMARY KEY,
                    "CategoryName" VARCHAR(50) NOT NULL
                );
            ''',
            reverse_sql='DROP TABLE IF EXISTS "Categories" CASCADE;',
        ),

        # ── Suppliers ────────────────────────────────────────────────────────
        migrations.RunSQL(
            sql='''
                CREATE TABLE "Suppliers" (
                    "SupplierID"          SERIAL PRIMARY KEY,
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

        # ── Products ─────────────────────────────────────────────────────────
        migrations.RunSQL(
            sql='''
                CREATE TABLE "Products" (
                    "ProductID"             SERIAL       PRIMARY KEY,
                    "SKU"                   VARCHAR(50)  NOT NULL UNIQUE,
                    "ProductName"           VARCHAR(100) NOT NULL,
                    "CategoryID"            INTEGER,
                    "Brand"                 VARCHAR(50)  NOT NULL DEFAULT '',
                    "OwnerName"             VARCHAR(100) NOT NULL DEFAULT '',
                    "SupplierID"            INTEGER,
                    "SellingPrice"          DECIMAL(10,2) NOT NULL,
                    "CostPrice"             DECIMAL(10,2) NOT NULL,
                    "Stock"                 INTEGER      NOT NULL DEFAULT 0,
                    "ReorderLevel"          INTEGER      NOT NULL DEFAULT 10,
                    "ProductDescription"    VARCHAR(255) NOT NULL DEFAULT '',
                    "ProductImageURL"       VARCHAR(255) NOT NULL DEFAULT '',
                    "ProductSpecifications" VARCHAR(3000) NOT NULL DEFAULT '',
                    "UnitsSold"             INTEGER      NOT NULL DEFAULT 0,
                    "createdAt"             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                    "updatedAt"             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
                );
            ''',
            reverse_sql='DROP TABLE IF EXISTS "Products" CASCADE;',
        ),

        # ── Customers (managed=True so Django tracks it) ─────────────────────
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
            options={
                'db_table': 'Customers',
                'managed': True,
            },
        ),

        # ── Reviews ──────────────────────────────────────────────────────────
        migrations.RunSQL(
            sql='''
                CREATE TABLE "Reviews" (
                    "ReviewID"   SERIAL        PRIMARY KEY,
                    "ProductID"  INTEGER,
                    "CustomerID" INTEGER,
                    "Rating"     DECIMAL(3,1),
                    "Comment"    TEXT,
                    "ReviewDate" TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
                    UNIQUE ("ProductID", "CustomerID")
                );
            ''',
            reverse_sql='DROP TABLE IF EXISTS "Reviews" CASCADE;',
        ),
    ]
