from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0007_huawei_watch_gt5_pro_images'),
    ]

    operations = [
        migrations.CreateModel(
            name='MarketPriceSnapshot',
            fields=[
                ('id', models.BigAutoField(db_column='SnapshotID', primary_key=True, serialize=False)),
                ('month', models.DateField(db_column='SnapshotMonth')),
                ('market_price', models.DecimalField(blank=True, db_column='MarketPrice', decimal_places=2, max_digits=12, null=True)),
                ('lowest_market_price', models.DecimalField(blank=True, db_column='LowestMarketPrice', decimal_places=2, max_digits=12, null=True)),
                ('highest_market_price', models.DecimalField(blank=True, db_column='HighestMarketPrice', decimal_places=2, max_digits=12, null=True)),
                ('volatility_percent', models.DecimalField(db_column='VolatilityPercent', decimal_places=2, default=0, max_digits=6)),
                ('source', models.CharField(db_column='Source', max_length=50)),
                ('currency_note', models.CharField(blank=True, db_column='CurrencyNote', default='', max_length=255)),
                ('offers_json', models.TextField(blank=True, db_column='OffersJSON', default='[]')),
                ('fetched_at', models.DateTimeField(auto_now=True, db_column='FetchedAt')),
                ('product', models.ForeignKey(db_column='ProductID', on_delete=django.db.models.deletion.CASCADE, related_name='market_price_snapshots', to='products.product')),
            ],
            options={
                'db_table': 'MarketPriceSnapshots',
                'ordering': ['month'],
                'unique_together': {('product', 'month')},
            },
        ),
    ]
