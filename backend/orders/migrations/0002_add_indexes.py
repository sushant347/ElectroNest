from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0001_initial'),
    ]

    operations = [
        migrations.RunSQL(
            sql='''
                CREATE INDEX IF NOT EXISTS idx_orders_order_date
                    ON "Orders" ("OrderDate");

                CREATE INDEX IF NOT EXISTS idx_orders_status
                    ON "Orders" ("OrderStatusID");

                CREATE INDEX IF NOT EXISTS idx_orderdetails_order
                    ON "OrderDetails" ("OrderID");

                CREATE INDEX IF NOT EXISTS idx_orderdetails_product
                    ON "OrderDetails" ("ProductID");

                CREATE INDEX IF NOT EXISTS idx_cart_customer
                    ON "Cart" ("CustomerID");

                CREATE INDEX IF NOT EXISTS idx_wishlist_customer
                    ON "Whishlist" ("CustomerID");

                CREATE INDEX IF NOT EXISTS idx_payments_order
                    ON "Payments" ("OrderID");

                CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read
                    ON "Notifications" ("recipient_id", "is_read");

                CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
                    ON "Notifications" ("recipient_id", "created_at" DESC);

                CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_customer
                    ON "CouponUsage" ("coupon_id", "customer_id");

                CREATE INDEX IF NOT EXISTS idx_coupons_owner_active
                    ON "Coupons" ("OwnerID", "is_active");

                CREATE INDEX IF NOT EXISTS idx_coupons_valid_until
                    ON "Coupons" ("valid_until");
            ''',
            reverse_sql='''
                DROP INDEX IF EXISTS idx_orders_order_date;
                DROP INDEX IF EXISTS idx_orders_status;
                DROP INDEX IF EXISTS idx_orderdetails_order;
                DROP INDEX IF EXISTS idx_orderdetails_product;
                DROP INDEX IF EXISTS idx_cart_customer;
                DROP INDEX IF EXISTS idx_wishlist_customer;
                DROP INDEX IF EXISTS idx_payments_order;
                DROP INDEX IF EXISTS idx_notifications_recipient_read;
                DROP INDEX IF EXISTS idx_notifications_recipient_created;
                DROP INDEX IF EXISTS idx_coupon_usage_coupon_customer;
                DROP INDEX IF EXISTS idx_coupons_owner_active;
                DROP INDEX IF EXISTS idx_coupons_valid_until;
            ''',
        ),
    ]
