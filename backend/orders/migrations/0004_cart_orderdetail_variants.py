from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0010_product_variants'),
        ('orders', '0003_product_questions_customer_notifications'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            ALTER TABLE "Cart" ADD COLUMN IF NOT EXISTS "VariantID" BIGINT NULL;
            """,
            reverse_sql="""
            ALTER TABLE "Cart" DROP COLUMN IF EXISTS "VariantID";
            """,
        ),
        migrations.RunSQL(
            sql="""
            ALTER TABLE "OrderDetails" ADD COLUMN IF NOT EXISTS "VariantID" BIGINT NULL;
            """,
            reverse_sql="""
            ALTER TABLE "OrderDetails" DROP COLUMN IF EXISTS "VariantID";
            """,
        ),
    ]
