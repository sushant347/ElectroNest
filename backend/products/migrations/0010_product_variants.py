import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0009_alter_category_options_alter_customer_options_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProductVariant',
            fields=[
                ('id', models.BigAutoField(db_column='VariantID', primary_key=True, serialize=False)),
                ('title', models.CharField(db_column='VariantTitle', max_length=120)),
                ('sku', models.CharField(blank=True, db_column='VariantSKU', default='', max_length=80)),
                ('color', models.CharField(blank=True, db_column='VariantColor', default='', max_length=60)),
                ('specs', models.CharField(blank=True, db_column='VariantSpecs', default='', max_length=500)),
                ('price', models.DecimalField(db_column='VariantPrice', decimal_places=2, max_digits=12)),
                ('discount_price', models.DecimalField(blank=True, db_column='VariantDiscountPrice', decimal_places=2, max_digits=12, null=True)),
                ('stock', models.IntegerField(db_column='VariantStock', default=0)),
                ('source_id', models.CharField(blank=True, db_column='SourceVariantID', default='', max_length=80)),
                ('is_default', models.BooleanField(db_column='IsDefault', default=False)),
                ('is_active', models.BooleanField(db_column='IsActive', default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_column='CreatedAt')),
                ('updated_at', models.DateTimeField(auto_now=True, db_column='UpdatedAt')),
                ('product', models.ForeignKey(db_column='ProductID', on_delete=django.db.models.deletion.CASCADE, related_name='variants', to='products.product')),
            ],
            options={
                'db_table': 'ProductVariants',
                'ordering': ['product_id', '-is_default', 'price', 'id'],
                'unique_together': {('product', 'title')},
            },
        ),
    ]
