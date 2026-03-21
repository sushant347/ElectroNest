"""
Management command to update image_url for specific products.
Run: python manage.py update_image_urls
"""
from django.core.management.base import BaseCommand
from products.models import Product


UPDATES = {
    'GoPro HERO 13 Black': 'https://cdn.mos.cms.futurecdn.net/bmnufkc2Yr3eErTYgT6aYJ-1280-80.jpg',
    'Apple Watch Ultra 2': 'https://cdn.mos.cms.futurecdn.net/g5P3Srz9PLBYo3CSvV4dYA.jpg',
    'Twelve South HiRise 3 Deluxe': 'https://static0.howtogeekimages.com/wordpress/wp-content/uploads/wm/2023/09/twelve-south-hirise-3-deluxe-same-with-iphone-in-standby-mode.JPG?w=1600&h=1600&fit=crop',
}


class Command(BaseCommand):
    help = 'Update image URLs for GoPro HERO 13, Apple Watch Ultra 2, and Twelve South HiRise 3 Deluxe'

    def handle(self, *args, **options):
        for name_prefix, url in UPDATES.items():
            updated = Product.objects.filter(name__startswith=name_prefix).update(image_url=url)
            self.stdout.write(self.style.SUCCESS(f'{name_prefix}: {updated} products updated'))
