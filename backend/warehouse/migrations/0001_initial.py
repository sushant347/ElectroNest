from django.db import migrations


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('products', '0001_initial'),
        ('orders', '0001_initial'),
    ]

    operations = [

        # ── PurchaseOrders ────────────────────────────────────────────────────
        migrations.RunSQL(
            sql='''
                CREATE TABLE "PurchaseOrders" (
                    "PurchaseOrderID"      SERIAL        PRIMARY KEY,
                    "SupplierID"           INTEGER       NOT NULL,
                    "OrderDate"            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
                    "TotalAmount"          DECIMAL(10,2),
                    "ExpectedDeliveryDate" TIMESTAMPTZ,
                    "CreatedAt"            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
                    "OrderStatusID"        INTEGER
                );
            ''',
            reverse_sql='DROP TABLE IF EXISTS "PurchaseOrders" CASCADE;',
        ),

        # ── PurchaseOrderDetails ──────────────────────────────────────────────
        migrations.RunSQL(
            sql='''
                CREATE TABLE "PurchaseOrderDetails" (
                    "PurchaseOrderDetailID" SERIAL        PRIMARY KEY,
                    "PurchaseOrderID"       INTEGER       NOT NULL,
                    "ProductID"             INTEGER       NOT NULL,
                    "Quantity"              INTEGER       NOT NULL,
                    "UnitCost"              DECIMAL(10,2) NOT NULL
                );
            ''',
            reverse_sql='DROP TABLE IF EXISTS "PurchaseOrderDetails" CASCADE;',
        ),
    ]
