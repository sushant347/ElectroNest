"""
Add `owner` ForeignKey to Coupon so each coupon belongs to a specific store/owner.
Null = platform-wide coupon (admin-created only).

Note: db_constraint=False is used because the Coupons table PK is int (AutoField)
while accounts_customuser.id is bigint (BigAutoField). SQL Server rejects a FK
constraint across mismatched numeric types even though the values overlap. The
Django ORM relationship still works perfectly for all read/write operations;
referential integrity is enforced at the application layer.
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0006_coupon_free_delivery_couponusage'),
        ('accounts', '__first__'),
    ]

    operations = [
        migrations.AddField(
            model_name='coupon',
            name='owner',
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='coupons',
                to=settings.AUTH_USER_MODEL,
                help_text='The store owner this coupon belongs to. Null = platform-wide (admin only).',
                db_column='OwnerID',
                db_constraint=False,  # Skip DB-level FK — type mismatch (int vs bigint) in MSSQL
            ),
        ),
    ]
