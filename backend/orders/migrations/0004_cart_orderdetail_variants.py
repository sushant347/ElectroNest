from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0010_product_variants'),
        ('orders', '0003_product_questions_customer_notifications'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            IF COL_LENGTH('Cart', 'VariantID') IS NULL
                ALTER TABLE "Cart" ADD "VariantID" BIGINT NULL;
            """,
            reverse_sql="""
            IF COL_LENGTH('Cart', 'VariantID') IS NOT NULL
                ALTER TABLE "Cart" DROP COLUMN "VariantID";
            """,
        ),
        migrations.RunSQL(
            sql="""
            IF COL_LENGTH('OrderDetails', 'VariantID') IS NULL
                ALTER TABLE "OrderDetails" ADD "VariantID" BIGINT NULL;
            """,
            reverse_sql="""
            IF COL_LENGTH('OrderDetails', 'VariantID') IS NOT NULL
                ALTER TABLE "OrderDetails" DROP COLUMN "VariantID";
            """,
        ),
    ]
