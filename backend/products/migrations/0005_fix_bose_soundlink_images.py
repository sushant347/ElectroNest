from django.db import migrations


URLS = [
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRKnOXmp6zjsiVUFiIBhoIyCGVEqM9KXgWibQ&s',
    'https://cdn.mos.cms.futurecdn.net/v2/t:0,l:240,cw:1440,ch:1080,q:80,w:1440/PRQ4anjB2jE5oRS9asn4H5.jpg',
]


def alternate_bose_images(apps, schema_editor):
    Product = apps.get_model('products', 'Product')
    bose_products = list(
        Product.objects.filter(name__icontains='Bose SoundLink Max').order_by('id')
    )
    for i, product in enumerate(bose_products):
        product.image_url = URLS[i % len(URLS)]
        product.save()


def reverse_bose_images(apps, schema_editor):
    pass  # non-destructive


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0004_update_bose_soundlink_image'),
    ]

    operations = [
        migrations.RunPython(alternate_bose_images, reverse_bose_images),
    ]
