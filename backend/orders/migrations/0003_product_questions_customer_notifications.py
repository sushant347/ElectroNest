import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0007_huawei_watch_gt5_pro_images'),
        ('orders', '0002_add_indexes'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ProductQuestion',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('question', models.TextField()),
                ('answer', models.TextField(blank=True, default='')),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('answered', 'Answered')], default='pending', max_length=20)),
                ('is_public', models.BooleanField(default=True)),
                ('asked_at', models.DateTimeField(auto_now_add=True)),
                ('answered_at', models.DateTimeField(blank=True, null=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('answered_by', models.ForeignKey(blank=True, db_constraint=False, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='answered_product_questions', to=settings.AUTH_USER_MODEL)),
                ('customer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='product_questions', to='products.customer')),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='questions', to='products.product')),
            ],
            options={
                'db_table': 'ProductQuestions',
                'managed': True,
                'ordering': ['-asked_at'],
            },
        ),
        migrations.CreateModel(
            name='CustomerNotification',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=200)),
                ('message', models.TextField()),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('customer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to='products.customer')),
                ('question', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='customer_notifications', to='orders.productquestion')),
            ],
            options={
                'db_table': 'CustomerNotifications',
                'managed': True,
                'ordering': ['-created_at'],
            },
        ),
    ]
