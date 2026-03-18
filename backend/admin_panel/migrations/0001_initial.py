from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('id',         models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('action',     models.CharField(max_length=255)),
                ('table_name', models.CharField(blank=True, default='', max_length=255)),
                ('record_id',  models.IntegerField(blank=True, null=True)),
                ('user_id',    models.IntegerField(blank=True, null=True)),
                ('timestamp',  models.DateTimeField(auto_now_add=True)),
                ('old_values', models.TextField(blank=True, null=True)),
                ('new_values', models.TextField(blank=True, null=True)),
            ],
            options={
                'db_table': 'AuditLog',
                'ordering': ['-timestamp'],
            },
        ),
    ]
