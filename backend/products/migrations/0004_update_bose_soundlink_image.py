from django.db import migrations


BOSE_IMAGE_URL = (
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRKnOXmp6zjsiVUFiIBhoIyCGVEqM9KXgWibQ&s'
)


def update_bose_image(apps, schema_editor):
    Product = apps.get_model('products', 'Product')
    Product.objects.filter(name='Bose SoundLink Max').update(image_url=BOSE_IMAGE_URL)


def reverse_bose_image(apps, schema_editor):
    pass  # non-destructive — original URL not stored, skip reverse


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0003_add_discount_price'),
    ]

    operations = [
        migrations.RunPython(update_bose_image, reverse_bose_image),
    ]
