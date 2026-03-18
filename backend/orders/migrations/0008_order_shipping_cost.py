"""
Add ShippingCost column to the Orders table.
Shipping rates (matching Checkout.jsx):  Nepal = NPR 200, India = NPR 3500.
Free-delivery coupons set this to 0 at order-creation time.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0007_coupon_owner'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE "Orders" ADD COLUMN IF NOT EXISTS "ShippingCost" DECIMAL(10,2) NOT NULL DEFAULT 200.00;
            """,
            reverse_sql='ALTER TABLE "Orders" DROP COLUMN IF EXISTS "ShippingCost"',
        ),
    ]
