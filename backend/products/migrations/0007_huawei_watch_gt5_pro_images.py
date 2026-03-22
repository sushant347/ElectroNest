from django.db import migrations


URLS = [
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSWA8DSzeBOkzmtfR5dkDSX0HKBf8_lGGGv1g&s',
    'https://cdn.hukut.com/huawei-watch-gt-5-pro-2.png1736148189875',
]


def alternate_huawei_images(apps, schema_editor):
    Product = apps.get_model('products', 'Product')
    products = list(
        Product.objects.filter(name__icontains='Huawei Watch GT 5 Pro').order_by('id')
    )
    for i, product in enumerate(products):
        product.image_url = URLS[i % len(URLS)]
        product.save()


def reverse_huawei_images(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0006_peak_design_wallet_images'),
    ]

    operations = [
        migrations.RunPython(alternate_huawei_images, reverse_huawei_images),
    ]
