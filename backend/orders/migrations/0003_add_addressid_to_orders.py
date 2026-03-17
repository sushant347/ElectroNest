from django.db import migrations


class Migration(migrations.Migration):
    """
    Adds AddressID column to the existing Orders table (managed=False).
    Safe to re-run — uses IF NOT EXISTS guard (SQL Server syntax).
    """

    dependencies = [
        ('orders', '0002_alter_cart_options_alter_order_options_and_more'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                IF NOT EXISTS (
                    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME = 'Orders' AND COLUMN_NAME = 'AddressID'
                )
                BEGIN
                    ALTER TABLE Orders ADD AddressID INT NULL;
                END
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
