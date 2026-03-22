from django.db import migrations


class Migration(migrations.Migration):
    """
    Adds DiscountPrice column — set by store owners to mark a product ON SALE.

    Production (PostgreSQL): this migration runs automatically.

    Local dev (SQL Server): run this SQL manually in SSMS, then fake the migration:
        IF NOT EXISTS (
            SELECT 1 FROM sys.columns
            WHERE object_id = OBJECT_ID('Products') AND name = 'DiscountPrice'
        )
            ALTER TABLE [Products] ADD [DiscountPrice] DECIMAL(10,2) NULL;

        Then: python manage.py migrate products 0003_add_discount_price --fake
    """

    dependencies = [
        ('products', '0002_add_indexes'),
    ]

    operations = [
        # PostgreSQL syntax — runs on production (Render)
        migrations.RunSQL(
            sql='''
                ALTER TABLE "Products"
                ADD COLUMN IF NOT EXISTS "DiscountPrice" DECIMAL(10, 2) NULL;
            ''',
            reverse_sql='''
                ALTER TABLE "Products"
                DROP COLUMN IF EXISTS "DiscountPrice";
            ''',
        ),
    ]
