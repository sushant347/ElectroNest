from django.db import migrations


URLS = [
    'https://cdn.shopify.com/s/files/1/2986/1172/files/standwallet-eclipse-phone2_9f553493-c030-496e-bb4f-208e741ddba1.jpg?v=1762276031',
    'https://suburban.com.hk/cdn/shop/files/colorblocking_1024x1024_9a0527a8-de3e-434b-9bbc-8bf45a2299f4.gif?v=1709797512',
]


def alternate_peak_design_images(apps, schema_editor):
    Product = apps.get_model('products', 'Product')
    products = list(
        Product.objects.filter(name__icontains='Peak Design Mobile Wallet').order_by('id')
    )
    for i, product in enumerate(products):
        product.image_url = URLS[i % len(URLS)]
        product.save()


def reverse_peak_design_images(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0005_fix_bose_soundlink_images'),
    ]

    operations = [
        migrations.RunPython(alternate_peak_design_images, reverse_peak_design_images),
    ]
