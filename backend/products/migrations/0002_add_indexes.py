from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0001_initial'),
        ('orders',   '0001_initial'),
        ('warehouse','0001_initial'),
    ]

    operations = [
        migrations.RunSQL(
            sql='''
                CREATE INDEX IF NOT EXISTS idx_products_category
                    ON "Products" ("CategoryID");

                CREATE INDEX IF NOT EXISTS idx_products_brand
                    ON "Products" ("Brand");

                CREATE INDEX IF NOT EXISTS idx_products_owner
                    ON "Products" ("OwnerName");

                CREATE INDEX IF NOT EXISTS idx_products_units_sold
                    ON "Products" ("UnitsSold" DESC);

                CREATE INDEX IF NOT EXISTS idx_products_selling_price
                    ON "Products" ("SellingPrice");

                CREATE INDEX IF NOT EXISTS idx_reviews_product
                    ON "Reviews" ("ProductID");

                CREATE INDEX IF NOT EXISTS idx_reviews_customer
                    ON "Reviews" ("CustomerID");

                CREATE INDEX IF NOT EXISTS idx_orders_customer
                    ON "Orders" ("CustomerID");
            ''',
            reverse_sql='''
                DROP INDEX IF EXISTS idx_products_category;
                DROP INDEX IF EXISTS idx_products_brand;
                DROP INDEX IF EXISTS idx_products_owner;
                DROP INDEX IF EXISTS idx_products_units_sold;
                DROP INDEX IF EXISTS idx_products_selling_price;
                DROP INDEX IF EXISTS idx_reviews_product;
                DROP INDEX IF EXISTS idx_reviews_customer;
                DROP INDEX IF EXISTS idx_orders_customer;
            ''',
        ),
    ]
