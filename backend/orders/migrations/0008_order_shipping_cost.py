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
                IF NOT EXISTS (
                    SELECT 1 FROM sys.columns
                    WHERE  object_id = OBJECT_ID('Orders') AND name = 'ShippingCost'
                )
                BEGIN
                    ALTER TABLE Orders
                    ADD ShippingCost DECIMAL(10,2) NOT NULL DEFAULT 200.00;
                END
            """,
            reverse_sql="ALTER TABLE Orders DROP COLUMN ShippingCost",
        ),
    ]
