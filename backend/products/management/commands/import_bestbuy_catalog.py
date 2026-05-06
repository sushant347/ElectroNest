import hashlib
import re
import json
import os
from html import unescape
from decimal import Decimal
from urllib.parse import unquote

import requests
from django.core.management.base import BaseCommand
from django.db import transaction

from products.management.commands.import_gadgetbyte_catalog import (
    _clean_text,
    _discounted_price,
    _owner_for,
    _owner_names,
    _stable_index,
    _stock_for,
)
from products.models import Category, Product, ProductVariant


API_URL = 'https://api.bestbuy.com/v1/products'
USD_TO_NPR = Decimal('133.00')

BESTBUY_CATEGORIES = [
    {'id': 2101, 'name': 'Cameras', 'query': 'camera', 'gadgetbyte_url': 'https://www.gadgetbytenepal.com/category/camera-price-nepal/'},
    {'id': 2102, 'name': 'Gaming Consoles', 'query': 'gaming console', 'gadgetbyte_url': 'https://www.gadgetbytenepal.com/category/handheld/'},
]

FALLBACK_PRODUCTS = {
    'Cameras': [
        ('Sony ZV-E10L', 'Sony', 75000, 'https://media.gadgetbytenepal.com/2021/07/Sony-ZV-E10-Price-in-Nepal-2021.jpg'),
        ('Sony Alpha A6400', 'Sony', 135000, 'https://media.gadgetbytenepal.com/2019/01/Sony-Alpha-A6400.jpg'),
        ('Canon EOS R50 Mirrorless Camera', 'Canon', 112000, 'https://media.gadgetbytenepal.com/2023/02/Canon-EOS-R50.jpg'),
        ('Nikon Z30 Mirrorless Camera', 'Nikon', 115000, 'https://media.gadgetbytenepal.com/2022/07/Nikon-Z30.jpg'),
        ('Fujifilm X-S20 Mirrorless Camera', 'Fujifilm', 189000, 'https://media.gadgetbytenepal.com/2023/05/Fujifilm-X-S20.jpg'),
        ('Sony Alpha A7 IV', 'Sony', 335000, 'https://media.gadgetbytenepal.com/2021/10/Sony-Alpha-A7-IV.jpg'),
    ],
    'Gaming Consoles': [
        ('Asus ROG Xbox Ally', 'ASUS', 110900, 'https://media.gadgetbytenepal.com/2025/06/ROG-XBOX-ALLY.jpg'),
        ('Asus ROG Ally X', 'ASUS', 145000, 'https://media.gadgetbytenepal.com/2024/06/Asus-ROG-Ally-X-Price-Nepal.jpg'),
        ('Lenovo Legion Go', 'Lenovo', 125000, 'https://media.gadgetbytenepal.com/2023/09/Lenovo-Legion-Go-price-in-Nepal.jpg'),
        ('Valve Steam Deck OLED', 'Valve', 95000, 'https://media.gadgetbytenepal.com/2023/11/Valve-Steam-Deck-OLED-Price-in-Nepal.jpg'),
        ('MSI Claw A1M', 'MSI', 118000, 'https://media.gadgetbytenepal.com/2024/01/MSI-Claw-A1M-Price-in-Nepal.jpg'),
        ('AYANEO NEXT 2', 'AYANEO', 210000, 'https://media.gadgetbytenepal.com/2026/02/Ayaneo-NEXT-2-Gaming-Handheld-price-in-Nepal.jpg'),
    ],
}


def _hash(seed, mod):
    return int(hashlib.sha256(str(seed).encode('utf-8')).hexdigest()[:12], 16) % mod


def _to_npr(usd):
    return Decimal(str(usd or 1)).quantize(Decimal('0.01')) if Decimal(str(usd or 1)) > 5000 else (Decimal(str(usd or 1)) * USD_TO_NPR).quantize(Decimal('0.01'))


def _brand_from_name(name):
    first = (name or '').split(' ', 1)[0].strip()
    return {'Asus': 'ASUS', 'Ayaneo': 'AYANEO'}.get(first, first)[:50]


def _absolute_url(url):
    if not url:
        return ''
    if url.startswith('/'):
        return f'https://www.gadgetbytenepal.com{url}'
    return url


def _extract_next_image_urls(html):
    urls = []
    for raw in re.findall(r'/_next/image/\?url=([^&"\s]+)', html):
        url = unquote(unescape(raw))
        if url.startswith('http') and 'media.gadgetbytenepal.com' in url:
            urls.append(url)
    return list(dict.fromkeys(urls))


def _article_details(url, timeout):
    try:
        res = requests.get(url, timeout=timeout, headers={'User-Agent': 'Mozilla/5.0'})
        res.raise_for_status()
    except requests.RequestException:
        return {}
    html = res.text
    title_match = re.search(r'<title>(.*?)</title>', html, re.I | re.S)
    image_match = re.search(r'<meta[^>]+(?:property|name)="(?:og:image|twitter:image)"[^>]+content="([^"]+)"', html, re.I)
    desc_match = re.search(r'<meta[^>]+(?:property|name)="(?:og:description|description)"[^>]+content="([^"]+)"', html, re.I)
    price_match = re.search(r'(?:NPR|Rs\.?|रू)\s*([0-9][0-9,]{3,})', html, re.I)
    title = _clean_text(title_match.group(1) if title_match else '', 120)
    title = re.sub(r'\s*(?:Price in Nepal|Specifications|Features|Availability).*$', '', title, flags=re.I).strip()
    return {
        'name': title,
        'image': image_match.group(1) if image_match else '',
        'description': _clean_text(desc_match.group(1) if desc_match else '', 255),
        'price': Decimal((price_match.group(1) if price_match else '0').replace(',', '') or '0'),
    }


def _gadgetbyte_rows(category_name, url, limit, timeout):
    try:
        res = requests.get(url, timeout=timeout, headers={'User-Agent': 'Mozilla/5.0'})
        res.raise_for_status()
    except requests.RequestException:
        return []
    html = res.text
    rows = []
    seen = set()
    card_matches = re.findall(
        r'<a[^>]+title="([^"]+)"[^>]+href="([^"]+)"[^>]*>.*?</a>',
        html,
        re.I | re.S,
    )
    if category_name == 'Gaming Consoles' and not card_matches:
        images = _extract_next_image_urls(html)
        for image in images:
            if len(rows) >= limit:
                break
            filename = image.rsplit('/', 1)[-1].rsplit('.', 1)[0].replace('-', ' ')
            if any(skip in filename.lower() for skip in ['logo', 'banner']):
                continue
            name = re.sub(r'\bprice\b.*$', '', filename, flags=re.I).strip()
            key = name.lower()
            if not name or key in seen:
                continue
            seen.add(key)
            rows.append({
                'source_id': f'GBN-HANDHELD-{len(rows) + 1}',
                'name': _clean_text(name, 100),
                'brand': _brand_from_name(name),
                'price': FALLBACK_PRODUCTS[category_name][min(len(rows), len(FALLBACK_PRODUCTS[category_name]) - 1)][2],
                'image': image,
                'description': f'{name} handheld gaming console with portable performance and modern gaming controls.',
            })
        return rows

    for title, href in card_matches:
        if len(rows) >= limit:
            break
        title = _clean_text(title, 120)
        if not title or title.lower() in {'sony', 'canon', 'nikon', 'fujifilm'}:
            continue
        article_url = _absolute_url(href)
        details = _article_details(article_url, timeout)
        name = details.get('name') or title
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        rows.append({
            'source_id': f'GBN-{category_name.upper().replace(" ", "-")}-{len(rows) + 1}',
            'name': _clean_text(name, 100),
            'brand': _brand_from_name(name),
            'price': details.get('price') or FALLBACK_PRODUCTS[category_name][min(len(rows), len(FALLBACK_PRODUCTS[category_name]) - 1)][2],
            'image': details.get('image') or FALLBACK_PRODUCTS[category_name][min(len(rows), len(FALLBACK_PRODUCTS[category_name]) - 1)][3],
            'description': details.get('description') or f'{name} listed from GadgetByte Nepal category data.',
        })
    return rows


class Command(BaseCommand):
    help = 'Import extra electronics categories from Best Buy API or deterministic fallback data.'

    def add_arguments(self, parser):
        parser.add_argument('--per-category', type=int, default=6)
        parser.add_argument('--api-key', default=os.environ.get('BESTBUY_API_KEY', ''))
        parser.add_argument('--timeout', type=int, default=20)

    def _fetch_api_rows(self, query, limit, api_key, timeout):
        if not api_key:
            return []
        params = {
            'apiKey': api_key,
            'format': 'json',
            'pageSize': limit,
            'show': 'sku,name,manufacturer,salePrice,regularPrice,shortDescription,image,customerReviewAverage,customerReviewCount',
        }
        res = requests.get(f'{API_URL}(search={query})', params=params, timeout=timeout)
        res.raise_for_status()
        return res.json().get('products') or []

    def _rows_for_category(self, cat, limit, api_key, timeout):
        api_rows = self._fetch_api_rows(cat['query'], limit, api_key, timeout)
        if api_rows:
            return [{
                'source_id': str(row.get('sku')),
                'name': row.get('name'),
                'brand': row.get('manufacturer') or (row.get('name') or '').split(' ', 1)[0],
                'price': row.get('salePrice') or row.get('regularPrice') or 1,
                'image': row.get('image') or '',
                'description': row.get('shortDescription') or '',
            } for row in api_rows if row.get('name')]
        gb_rows = _gadgetbyte_rows(cat['name'], cat['gadgetbyte_url'], limit, timeout)
        if gb_rows:
            return gb_rows
        return [{
            'source_id': f"{cat['name']}-{idx + 1}",
            'name': name,
            'brand': brand,
            'price': price,
            'image': image,
            'description': f'{name} with current-generation electronics features, reliable performance, and practical everyday usability.',
        } for idx, (name, brand, price, image) in enumerate(FALLBACK_PRODUCTS[cat['name']][:limit])]

    @transaction.atomic
    def handle(self, *args, **options):
        owners = _owner_names()
        imported = 0
        for cat in BESTBUY_CATEGORIES:
            category, _ = Category.objects.update_or_create(id=cat['id'], defaults={'name': cat['name']})
            rows = self._rows_for_category(cat, options['per_category'], options['api_key'], options['timeout'])
            for row in rows:
                actual_price = _to_npr(row['price'])
                selling_price = _discounted_price(actual_price, row['source_id'])
                stock = _stock_for(row['source_id'], 7, 32)
                product, _ = Product.objects.update_or_create(
                    sku=f"BBY-{row['source_id']}",
                    defaults={
                        'name': row['name'][:100],
                        'category': category,
                        'brand': (row['brand'] or '')[:50],
                        'owner_name': _owner_for(row['source_id'], owners),
                        'selling_price': selling_price,
                        'cost_price': max(Decimal('1.00'), (selling_price * Decimal('0.82')).quantize(Decimal('0.01'))),
                        'stock': stock,
                        'reorder_level': min(6, max(1, stock // 3)),
                        'description': (row['description'] or '')[:255],
                        'image_url': (row['image'] or '')[:255],
                        'specifications': json.dumps({
                            'Market': 'US electronics retail',
                            'Imported Category': cat['name'],
                        })[:3000],
                    },
                )
                ProductVariant.objects.update_or_create(
                    product=product,
                    title='Standard',
                    defaults={
                        'sku': f"BBY-{row['source_id']}-STD"[:80],
                        'specs': 'Standard configuration',
                        'price': selling_price,
                        'discount_price': None,
                        'stock': stock,
                        'source_id': str(row['source_id'])[:80],
                        'is_default': True,
                        'is_active': True,
                    },
                )
                imported += 1
            self.stdout.write(self.style.SUCCESS(f"{cat['name']}: imported {len(rows)} products"))
        self.stdout.write(self.style.SUCCESS(f'Done. Imported/updated {imported} Best Buy category products.'))
