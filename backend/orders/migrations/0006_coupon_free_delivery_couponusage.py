from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0005_coupon'),
        ('products', '__first__'),
    ]

    operations = [
        # Add free_delivery field to Coupon
        migrations.AddField(
            model_name='coupon',
            name='free_delivery',
            field=models.BooleanField(default=False, help_text='Waive delivery charge when this coupon is applied'),
        ),
        # Add per_customer_limit field to Coupon
        migrations.AddField(
            model_name='coupon',
            name='per_customer_limit',
            field=models.IntegerField(default=1, help_text='Max times one customer can use this coupon'),
        ),
        # Create CouponUsage table
        migrations.CreateModel(
            name='CouponUsage',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('used_at', models.DateTimeField(auto_now_add=True)),
                ('coupon', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='customer_usages',
                    to='orders.coupon',
                )),
                ('customer', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='coupon_usages',
                    to='products.customer',
                )),
                ('order', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='coupon_usages',
                    to='orders.order',
                    db_constraint=False,
                )),
            ],
            options={
                'db_table': 'CouponUsage',
                'managed': True,
                'ordering': ['-used_at'],
            },
        ),
    ]
