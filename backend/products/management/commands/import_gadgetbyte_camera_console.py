import hashlib
import json
import re
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
from html import unescape
from urllib.parse import unquote

import requests
from bs4 import BeautifulSoup
from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.db.models import Sum
from django.utils import timezone
from django.utils.html import strip_tags

from orders.models import Cart, CompareList, CouponUsage, Notification, Order, OrderDetail, Payment, ProductQuestion, Wishlist
from products.management.commands.import_gadgetbyte_catalog import (
    _discounted_price,
    _owner_for,
    _owner_names,
    _stock_for,
)
from products.models import Category, Customer, MarketPriceSnapshot, Product, ProductVariant, Review
from warehouse.models import PurchaseOrderDetail


SOURCE_CATEGORIES = [
    {
        'id': 2101,
        'name': 'Cameras',
        'url': 'https://www.gadgetbytenepal.com/category/camera-price-nepal/',
        'prefix': 'GBN-CAM',
        'sold_min': 150,
        'sold_max': 200,
    },
    {
        'id': 2102,
        'name': 'Gaming Consoles',
        'url': 'https://www.gadgetbytenepal.com/category/handheld/',
        'prefix': 'GBN-HANDHELD',
        'sold_min': 100,
        'sold_max': 250,
    },
]

COMMENTS = [
    'The product matched the listing and felt genuine in daily use.',
    'Packaging was neat, delivery was smooth, and the device works as expected.',
    'Good value for the price. The listed specs and actual product line up well.',
    'I bought this after comparing a few options and the experience has been reliable.',
    'The build quality feels solid and the store handled the order professionally.',
    'Setup was simple and performance has been consistent so far.',
    'The item arrived in good condition and looks exactly like the product page.',
    'Useful product overall. The price, condition, and features feel balanced.',
]
RATINGS = [3.5, 4.0, 4.0, 4.5, 4.5, 5.0]


def _stable_int(seed, mod):
    return int(hashlib.sha256(str(seed).encode('utf-8')).hexdigest()[:12], 16) % mod


def _clean(value, limit=None):
    text = re.sub(r'\s+', ' ', strip_tags(unescape(str(value or '')))).strip()
    return text[:limit] if limit else text


def _money(value, default='0.00'):
    if value in (None, '', 'null'):
        return Decimal(default)
    try:
        return Decimal(str(value).replace(',', '')).quantize(Decimal('0.01'))
    except (InvalidOperation, ValueError):
        return Decimal(default)


def _slug_from_href(href):
    slug = (href or '').strip('/').rsplit('/', 1)[-1]
    return re.sub(r'[^a-z0-9-]+', '-', slug.lower()).strip('-')


def _product_name(raw_title):
    title = _clean(raw_title, 140)
    title = re.sub(r'\s*[-|].*$', '', title).strip()
    title = re.sub(r'\s*(?:Price in Nepal|Specs|Specifications|Features|Launch Date|Availability).*$', '', title, flags=re.I).strip()
    title = re.sub(r'\b(?:launched?|announced?|reviewed?)\b.*$', '', title, flags=re.I).strip()
    title = re.sub(r'\s+as\s+a\s+.*$', '', title, flags=re.I).strip()
    title = re.sub(r'\s+', ' ', title).strip()
    return title[:100]


def _brand(name):
    first = (name or '').split(' ', 1)[0].strip()
    aliases = {
        'Asus': 'ASUS',
        'Ayaneo': 'AYANEO',
        'Fujifilm': 'FUJIFILM',
        'Valve': 'Valve',
    }
    return aliases.get(first, first)[:50]


def _image_urls_from_html(html):
    urls = []
    patterns = [
        r'<meta[^>]+(?:property|name)="(?:og:image|twitter:image)"[^>]+content="([^"]+)"',
        r'src="(https://media\.gadgetbytenepal\.com/[^"]+\.(?:jpg|jpeg|png|webp))"',
        r'/_next/image/\?url=([^&"\s]+)',
    ]
    for pattern in patterns:
        for raw in re.findall(pattern, html, flags=re.I):
            url = unquote(unescape(raw))
            if url.startswith('http') and 'media.gadgetbytenepal.com' in url:
                urls.append(url)
    return list(dict.fromkeys(urls))


def _extract_price(html):
    table_prices = []
    soup = BeautifulSoup(html, 'html.parser')
    for table in soup.find_all('table'):
        table_text = _clean(table.get_text(' ', strip=True))
        if not re.search(r'(price\s+in\s+nepal|npr|rs\.?)', table_text, re.I):
            continue
        for raw in re.findall(r'(?:NPR|Rs\.?|रू)\s*([0-9][0-9,]{3,})', table_text, flags=re.I):
            price = _money(raw)
            if price >= 5000:
                table_prices.append(price)
    if table_prices:
        return max(table_prices)

    patterns = [
        r'(?:NPR|Rs\.?|रू)\s*([0-9][0-9,]{3,})',
        r'"price"\s*:\s*"?([0-9][0-9,]{3,})"?',
    ]
    prices = []
    for pattern in patterns:
        for raw in re.findall(pattern, html, flags=re.I):
            price = _money(raw)
            if price >= 5000:
                prices.append(price)
    return min(prices) if prices else Decimal('0.00')


def _specs_from_list(node):
    specs = {}
    if not node:
        return specs
    for li in node.find_all('li', recursive=False):
        text = _clean(li.get_text(' ', strip=True), 240)
        if ':' not in text:
            continue
        key, value = [part.strip() for part in text.split(':', 1)]
        key = re.sub(r'\s+', ' ', key).strip(' :-')
        value = re.sub(r'\s+', ' ', value).strip(' :-')
        if not key or not value:
            continue
        if key.lower() in {'source', 'source url', 'source_url', 'price', 'price in nepal'}:
            continue
        specs[key[:80]] = value[:220]
    return specs


def _add_if_match(specs, label, text, pattern):
    if label in specs:
        return
    match = re.search(pattern, text, flags=re.I)
    if match:
        specs[label] = _clean(match.group(1), 220)


def _augment_specs_from_description(specs, description):
    text = _clean(description, 2200)
    if not text:
        return specs
    _add_if_match(specs, 'Sensor', text, r'((?:\d+(?:\.\d+)?MP|APS-C|full[- ]frame)[^.]{0,120}sensor[^.]*)')
    _add_if_match(specs, 'Weight', text, r'(?:weigh(?:s|ing)?|weight(?: of)?)[^0-9]{0,20}([0-9]+(?:\.[0-9]+)?\s*grams?[^.]*)')
    _add_if_match(specs, 'Display', text, r'([0-9](?:\.[0-9])?[- ]inch[^.]{0,140}(?:display|screen|lcd|oled|ips)[^.]*)')
    _add_if_match(specs, 'Processor', text, r'((?:AMD|Intel|Qualcomm|Ryzen|Core)[^.]{0,120}(?:processor|chip|apu)[^.]*)')
    _add_if_match(specs, 'Memory', text, r'([0-9]+\s*GB[^.]{0,80}(?:RAM|LPDDR|memory)[^.]*)')
    _add_if_match(specs, 'Storage', text, r'([0-9]+\s*(?:GB|TB)[^.]{0,90}(?:SSD|storage|NVMe|UFS)[^.]*)')
    _add_if_match(specs, 'Battery', text, r'([0-9,]+\s*mAh[^.]{0,120}|(?:battery|recording)[^.]{0,120}(?:shots|minutes|hours)[^.]*)')
    _add_if_match(specs, 'Video', text, r'((?:4K|FHD|1080p|2160p)[^.]{0,120}(?:fps|video|recording)[^.]*)')
    visible_specs = [key for key in specs if not key.startswith('_')]
    if not visible_specs:
        specs['Overview'] = text[:220]
    return specs


def _specs_json(specs):
    payload = dict(specs or {})
    text = json.dumps(payload, ensure_ascii=False)
    if len(text) <= 3000:
        return text
    full_description = payload.get('_full_description', '')
    for limit in (1600, 1200, 900, 600, 300, 0):
        if limit:
            payload['_full_description'] = _clean(full_description, limit)
        else:
            payload.pop('_full_description', None)
        text = json.dumps(payload, ensure_ascii=False)
        if len(text) <= 3000:
            return text
    return json.dumps({}, ensure_ascii=False)


def _extract_specs_and_description(html, meta_description=''):
    soup = BeautifulSoup(html, 'html.parser')
    specs = {}
    for heading in soup.find_all(['h2', 'h3', 'h4']):
        heading_text = _clean(heading.get_text(' ', strip=True), 160).lower()
        if 'spec' not in heading_text:
            continue
        sibling = heading
        for _ in range(6):
            sibling = sibling.find_next_sibling()
            if sibling is None:
                break
            if sibling.name == 'ul':
                specs = _specs_from_list(sibling)
                if specs:
                    break
        if specs:
            break

    content = []
    stop_phrases = [
        'we’d love to hear your thoughts',
        "we'd love to hear your thoughts",
        'be the first to share your thoughts',
        'privacy policy',
        'happy commenting',
    ]
    skip_phrases = [
        'advertisement',
        'meanwhile',
        'check out our',
        'price in nepal and availability',
        'related posts',
        'latest posts',
        'best mobile phones',
    ]
    for node in soup.find_all(['p', 'span']):
        text = _clean(node.get_text(' ', strip=True), 500)
        if len(text) < 45:
            continue
        lowered = text.lower()
        if any(stop in lowered for stop in stop_phrases):
            break
        if any(skip in lowered for skip in skip_phrases):
            continue
        text = re.sub(r'^By\s+[A-Za-z .|&-]+\s+', '', text).strip()
        if len(text) < 45:
            continue
        if text in content:
            continue
        content.append(text)
        if sum(len(item) for item in content) > 1900:
            break

    full_description = _clean(' '.join(content) or meta_description, 2200)
    specs = _augment_specs_from_description(specs, full_description or meta_description)
    if full_description:
        specs['_full_description'] = full_description
    return specs, full_description


def _article_details(url, timeout):
    try:
        res = requests.get(url, timeout=timeout, headers={'User-Agent': 'Mozilla/5.0'})
        res.raise_for_status()
    except requests.RequestException:
        return {}
    html = res.text
    title = ''
    title_match = re.search(r'<title>(.*?)</title>', html, re.I | re.S)
    if title_match:
        title = _product_name(title_match.group(1))
    desc_match = re.search(r'<meta[^>]+(?:property|name)="(?:og:description|description)"[^>]+content="([^"]+)"', html, re.I)
    meta_description = _clean(desc_match.group(1) if desc_match else '', 255)
    specs, full_description = _extract_specs_and_description(html, meta_description)
    return {
        'name': title,
        'image': (_image_urls_from_html(html) or [''])[0],
        'price': _extract_price(html),
        'description': meta_description,
        'full_description': full_description,
        'specifications': specs,
    }


def _category_links(html, category_name):
    links = []
    seen = set()
    for match in re.finditer(r'<a\b([^>]*?)>(.*?)</a>', html, re.I | re.S):
        attrs, body = match.groups()
        href_match = re.search(r'href="([^"]+)"', attrs)
        if not href_match:
            continue
        href = href_match.group(1)
        if href.startswith('/category') or '/category/' in href:
            continue
        title_match = re.search(r'title="([^"]+)"', attrs)
        title = _clean(title_match.group(1) if title_match else body, 140)
        href = href if href.startswith('http') else f'https://www.gadgetbytenepal.com{href}'
        slug = _slug_from_href(href)
        if not slug or slug in seen:
            continue
        lower = f'{title} {slug}'.lower()
        if category_name == 'Cameras':
            if any(skip in lower for skip in ['sony-camera-price', 'canon-camera-price', 'nikon-camera-price', 'fujifilm-camera-price']):
                continue
            if not any(word in lower for word in ['sony', 'canon', 'nikon', 'fujifilm', 'gopro', 'camera', 'alpha', 'eos', 'zv-', 'z30']):
                continue
        else:
            if not any(word in lower for word in ['ally', 'ayaneo', 'legion-go', 'steam-deck', 'claw', 'handheld', 'xbox', 'onexplayer', 'nitro-blaze']):
                continue
        seen.add(slug)
        links.append((title, href, slug))
    return links


def _rows_from_gadgetbyte(category, limit, timeout):
    res = requests.get(category['url'], timeout=timeout, headers={'User-Agent': 'Mozilla/5.0'})
    res.raise_for_status()
    rows = []
    seen_names = set()
    for raw_title, href, slug in _category_links(res.text, category['name']):
        if len(rows) >= limit:
            break
        details = _article_details(href, timeout)
        name = _product_name(details.get('name') or raw_title)
        if not name or name.lower() in seen_names:
            continue
        image = details.get('image')
        price = details.get('price')
        if not image or price <= 0:
            continue
        seen_names.add(name.lower())
        rows.append({
            'slug': slug,
            'name': name,
            'brand': _brand(name),
            'price': price,
            'image': image,
            'description': details.get('description') or f'{name} listed from GadgetByte Nepal.',
            'full_description': details.get('full_description') or details.get('description') or f'{name} listed from GadgetByte Nepal.',
            'specifications': details.get('specifications') or {},
            'url': href,
        })
    return rows


def _month_start(months_ago=0):
    today = timezone.localdate()
    month_index = today.month - months_ago
    year = today.year + ((month_index - 1) // 12)
    month = ((month_index - 1) % 12) + 1
    return date(year, month, 1)


def _trend_multiplier(seed, months_ago):
    if months_ago == 0:
        return Decimal('1')
    return Decimal('1') + (Decimal(months_ago) * Decimal('0.014')) + (Decimal(_stable_int(f'{seed}-{months_ago}', 31) - 15) / Decimal('1000'))


def _store_snapshots(product, row):
    for months_ago in (2, 1, 0):
        market_price = (row['price'] * _trend_multiplier(row['slug'], months_ago)).quantize(Decimal('0.01'))
        spread = Decimal('0.025') + (Decimal(_stable_int(f"{row['slug']}-spread-{months_ago}", 30)) / Decimal('1000'))
        MarketPriceSnapshot.objects.update_or_create(
            product=product,
            month=_month_start(months_ago),
            defaults={
                'market_price': market_price,
                'lowest_market_price': (market_price * (Decimal('1') - spread)).quantize(Decimal('0.01')),
                'highest_market_price': (market_price * (Decimal('1') + spread / Decimal('2'))).quantize(Decimal('0.01')),
                'volatility_percent': (spread * Decimal('100')).quantize(Decimal('0.01')),
                'source': 'gadgetbyte_api',
                'currency_note': 'Market baseline fetched from GadgetByte Nepal category page.',
                'offers_json': json.dumps([{
                    'name': product.name,
                    'price': float(row['price']),
                    'original_price': float(row['price']),
                    'currency': 'NPR',
                    'store': 'GadgetByte Nepal',
                    'url': row['url'],
                    'score': 1,
                    'spec_match_score': 1,
                }]),
            },
        )


class Command(BaseCommand):
    help = 'Replace Cameras and Gaming Consoles with genuine GadgetByte category products and remap references.'

    def add_arguments(self, parser):
        parser.add_argument('--per-category', type=int, default=16)
        parser.add_argument('--timeout', type=int, default=20)

    @transaction.atomic
    def handle(self, *args, **options):
        per_category = max(1, min(options['per_category'], 40))
        owners = _owner_names()
        imported_by_category = {}
        old_products_by_category = {}

        for category_def in SOURCE_CATEGORIES:
            category, _ = Category.objects.update_or_create(id=category_def['id'], defaults={'name': category_def['name']})
            old_products_by_category[category_def['name']] = list(Product.objects.filter(category=category).order_by('id'))
            self.stdout.write(f"Fetching {category_def['name']} from {category_def['url']}")
            rows = _rows_from_gadgetbyte(category_def, per_category, options['timeout'])
            if not rows:
                raise RuntimeError(f"No GadgetByte products were extracted for {category_def['name']}.")
            imported = []
            for row in rows:
                sku = f"{category_def['prefix']}-{row['slug']}"[:50]
                selling_price = _discounted_price(row['price'], row['slug'])
                stock = _stock_for(row['slug'], 7, 32)
                product, _ = Product.objects.update_or_create(
                    sku=sku,
                    defaults={
                        'name': row['name'][:100],
                        'category': category,
                        'brand': row['brand'][:50],
                        'owner_name': _owner_for(row['slug'], owners),
                        'selling_price': selling_price,
                        'cost_price': max(Decimal('1.00'), (selling_price * Decimal('0.82')).quantize(Decimal('0.01'))),
                        'discount_price': None,
                        'stock': stock,
                        'reorder_level': min(6, max(1, stock // 3)),
                        'description': row['description'][:255],
                        'image_url': row['image'][:255],
                        'specifications': _specs_json(row['specifications']),
                    },
                )
                ProductVariant.objects.filter(product=product).delete()
                ProductVariant.objects.create(
                    product=product,
                    title='Standard',
                    sku=f"{sku}-STD"[:80],
                    specs='Standard configuration',
                    price=selling_price,
                    discount_price=None,
                    stock=stock,
                    source_id=row['slug'][:80],
                    is_default=True,
                    is_active=True,
                )
                _store_snapshots(product, row)
                imported.append(product)
            imported_by_category[category_def['name']] = imported
            self.stdout.write(self.style.SUCCESS(f"{category_def['name']}: imported {len(imported)} genuine GadgetByte products"))

        remapped = self._remap_old_products(old_products_by_category, imported_by_category)
        deleted = self._delete_old_products(old_products_by_category, imported_by_category)
        sales = self._rebuild_sales(imported_by_category)
        reviews = self._rebuild_reviews(imported_by_category)

        self.stdout.write(self.style.SUCCESS(
            f"Remapped {remapped} references, deleted {deleted} old camera/console products, "
            f"created {sales} sales units and {reviews} reviews for GadgetByte camera/console products."
        ))

    def _pick(self, products, seed):
        return products[_stable_int(seed, len(products))]

    def _default_variant(self, product):
        return ProductVariant.objects.filter(product=product, is_active=True).order_by('-is_default', 'id').first()

    def _remap_old_products(self, old_products_by_category, imported_by_category):
        remapped = 0
        for category_name, old_products in old_products_by_category.items():
            old_ids = [p.id for p in old_products if p.id not in {n.id for n in imported_by_category[category_name]}]
            if not old_ids:
                continue
            new_products = imported_by_category[category_name]
            seeded_order_ids = list(
                OrderDetail.objects
                .filter(product_id__in=old_ids, order__order_number__startswith='CATSALE-')
                .values_list('order_id', flat=True)
                .distinct()
            )
            seeded_order_ids += list(
                OrderDetail.objects
                .filter(product_id__in=old_ids, order__order_number__startswith='GBNCATSALE-')
                .values_list('order_id', flat=True)
                .distinct()
            )
            if seeded_order_ids:
                Payment.objects.filter(order_id__in=seeded_order_ids).update(order=None)
                CouponUsage.objects.filter(order_id__in=seeded_order_ids).update(order=None)
                OrderDetail.objects.filter(order_id__in=seeded_order_ids).delete()
                with connection.cursor() as cursor:
                    for order_id in seeded_order_ids:
                        cursor.execute('DELETE FROM Orders WHERE OrderID = %s', [order_id])
            for idx, detail in enumerate(OrderDetail.objects.filter(product_id__in=old_ids).order_by('id')):
                product = self._pick(new_products, f'od-{detail.id}-{idx}')
                variant = self._default_variant(product)
                detail.product = product
                detail.variant = variant
                detail.unit_price = Decimal(variant.price if variant else product.selling_price)
                detail.save(update_fields=['product', 'variant', 'unit_price'])
                order = detail.order
                total = sum((Decimal(d.unit_price or 0) * Decimal(d.quantity or 0)) for d in order.details.all())
                order.total_amount = total.quantize(Decimal('0.01'))
                order.save(update_fields=['total_amount'])
                remapped += 1
            for model in (Cart, Wishlist, CompareList):
                for idx, row in enumerate(model.objects.filter(product_id__in=old_ids).order_by('id')):
                    product = self._pick(new_products, f'{model.__name__}-{row.id}-{idx}')
                    row.product = product
                    fields = ['product']
                    if hasattr(row, 'variant'):
                        row.variant = self._default_variant(product)
                        fields.append('variant')
                    row.save(update_fields=fields)
                    remapped += 1
            for idx, row in enumerate(PurchaseOrderDetail.objects.filter(product_id__in=old_ids).order_by('id')):
                product = self._pick(new_products, f'po-{row.id}-{idx}')
                row.product = product
                row.unit_cost = product.cost_price
                row.save(update_fields=['product', 'unit_cost'])
                remapped += 1
            for model in (ProductQuestion, Notification):
                for idx, row in enumerate(model.objects.filter(product_id__in=old_ids).order_by('id')):
                    product = self._pick(new_products, f'{model.__name__}-{row.id}-{idx}')
                    row.product = product
                    row.save(update_fields=['product'])
                    remapped += 1
            Review.objects.filter(product_id__in=old_ids).delete()
        return remapped

    def _delete_old_products(self, old_products_by_category, imported_by_category):
        deleted = 0
        with connection.cursor() as cursor:
            for category_name, old_products in old_products_by_category.items():
                keep_ids = {p.id for p in imported_by_category[category_name]}
                for product in old_products:
                    if product.id in keep_ids:
                        continue
                    if OrderDetail.objects.filter(product=product).exists() or PurchaseOrderDetail.objects.filter(product=product).exists():
                        continue
                    ProductVariant.objects.filter(product=product).delete()
                    MarketPriceSnapshot.objects.filter(product=product).delete()
                    Review.objects.filter(product=product).delete()
                    cursor.execute('DELETE FROM Products WHERE ProductID = %s', [product.id])
                    deleted += 1
        return deleted

    def _rebuild_sales(self, imported_by_category):
        status_model = Order._meta.get_field('order_status').remote_field.model
        delivered, _ = status_model.objects.get_or_create(name='Delivered')
        customer_ids = list(Customer.objects.filter(is_active=True).values_list('id', flat=True).order_by('id'))
        if not customer_ids:
            return 0
        created_units = 0
        now = timezone.now()
        for category_def in SOURCE_CATEGORIES:
            products = imported_by_category[category_def['name']]
            for product in products:
                old_seeded_ids = list(
                    OrderDetail.objects
                    .filter(product=product, order__order_number__startswith=f'GBNCATSALE-{product.id}-')
                    .values_list('order_id', flat=True)
                    .distinct()
                )
                if old_seeded_ids:
                    Payment.objects.filter(order_id__in=old_seeded_ids).update(order=None)
                    CouponUsage.objects.filter(order_id__in=old_seeded_ids).update(order=None)
                    OrderDetail.objects.filter(order_id__in=old_seeded_ids).delete()
                    with connection.cursor() as cursor:
                        for order_id in old_seeded_ids:
                            cursor.execute('DELETE FROM Orders WHERE OrderID = %s', [order_id])
                target = category_def['sold_min'] + _stable_int(product.sku, category_def['sold_max'] - category_def['sold_min'] + 1)
                existing = int(OrderDetail.objects.filter(product=product).exclude(order__order_status__name='Cancelled').aggregate(total=Sum('quantity'))['total'] or 0)
                missing = max(0, target - existing)
                variant = self._default_variant(product)
                index = 0
                while missing > 0:
                    qty = min(missing, 1 + _stable_int(f'{product.id}-{index}-qty', 4))
                    customer_id = customer_ids[_stable_int(f'{product.id}-{index}-customer', len(customer_ids))]
                    unit_price = Decimal(variant.price if variant else product.selling_price).quantize(Decimal('0.01'))
                    order = Order.objects.create(
                        order_number=f'GBNCATSALE-{product.id}-{index}',
                        customer_id=customer_id,
                        order_status=delivered,
                        total_amount=(unit_price * qty).quantize(Decimal('0.01')),
                        shipping_cost=Decimal('200.00'),
                    )
                    order_date = now - timedelta(days=5 + _stable_int(f'{product.id}-{index}-date', 260))
                    Order.objects.filter(id=order.id).update(order_date=order_date, created_at=order_date, updated_at=order_date)
                    OrderDetail.objects.create(order=order, product=product, variant=variant, quantity=qty, unit_price=unit_price)
                    created_units += qty
                    missing -= qty
                    index += 1
                sold = int(OrderDetail.objects.filter(product=product).exclude(order__order_status__name='Cancelled').aggregate(total=Sum('quantity'))['total'] or 0)
                product.units_sold = sold
                product.save(update_fields=['units_sold'])
        return created_units

    def _rebuild_reviews(self, imported_by_category):
        customer_ids = list(Customer.objects.filter(is_active=True).values_list('id', flat=True).order_by('id'))
        if not customer_ids:
            return 0
        created = 0
        for products in imported_by_category.values():
            for product in products:
                Review.objects.filter(product=product).delete()
                target = int((product.units_sold or 0) * 0.8)
                used_customers = set()
                for idx in range(target):
                    start = (_stable_int(f'{product.id}-{idx}-review-customer', len(customer_ids)) + idx) % len(customer_ids)
                    customer_id = customer_ids[start]
                    for offset in range(len(customer_ids)):
                        candidate = customer_ids[(start + offset) % len(customer_ids)]
                        if candidate not in used_customers:
                            customer_id = candidate
                            break
                    used_customers.add(customer_id)
                    review = Review.objects.create(
                        product=product,
                        customer_id=customer_id,
                        rating=Decimal(str(RATINGS[_stable_int(f'{product.id}-{idx}-rating', len(RATINGS))])),
                        comment=COMMENTS[_stable_int(f'{product.id}-{idx}-comment', len(COMMENTS))],
                    )
                    review_date = timezone.now() - timedelta(days=3 + _stable_int(f'{product.id}-{idx}-review-date', 200))
                    review.created_at = review_date
                    review.save(update_fields=['created_at'])
                    created += 1
        return created
