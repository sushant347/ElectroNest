import csv
import io
import json
import random
import string
from datetime import timedelta

from rest_framework import viewsets, filters, status as drf_status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Avg, Count
from decimal import Decimal, InvalidOperation
from django.utils import timezone

from .models import Category, Supplier, Product, Review
from .serializers import CategorySerializer, SupplierSerializer, ProductSerializer, ReviewSerializer
from .price_matching import get_price_comparison
from .market_prices import get_market_price_snapshot
from admin_panel.models import AuditMixin, AuditLog

def _get_market_anchor_price(product: Product) -> Decimal:
    """Baseline market anchor used when product is created."""
    return (product.cost_price * Decimal('1.30')).quantize(Decimal('0.01'))


def _get_price_advantage_percent(product: Product) -> Decimal:
    """Stable non-fixed marketplace advantage in the 5-15% range."""
    created = product.created_at or timezone.now()
    stable_id = product.id or sum(ord(ch) for ch in (product.sku or product.name or "product"))
    seed = created.month + created.day + stable_id + sum(ord(ch) for ch in (product.name or ""))
    return (Decimal('6.5') + (Decimal(seed % 70) / Decimal('10'))).quantize(Decimal('0.1'))


def _compute_platform_price_from_market(market_price, product: Product) -> float:
    advantage = _get_price_advantage_percent(product)
    computed = Decimal(str(market_price)) * ((Decimal('100') - advantage) / Decimal('100'))
    return float(computed.quantize(Decimal('0.01')))


def _get_savings_percent(market_price: float, platform_price: float) -> float:
    if market_price <= 0:
        return 0
    return round(((market_price - platform_price) / market_price) * 100, 1)


def _compute_locked_platform_price(product: Product) -> Decimal:
    """Our platform price snapshot: market anchor minus a non-fixed advantage."""
    market_anchor = _get_market_anchor_price(product)
    multiplier = (Decimal('100') - _get_price_advantage_percent(product)) / Decimal('100')
    computed = (market_anchor * multiplier).quantize(Decimal('0.01'))
    # Respect DB check constraint: SellingPrice must be strictly > 0.
    return computed if computed > Decimal('0.00') else Decimal('0.01')


def _get_market_variation(product: Product, date_value, index: int, market_snapshot: dict) -> float:
    offer_volatility = float(market_snapshot.get('market_volatility_percent') or 0)
    volatility_weight = min(0.08, max(0.018, offer_volatility / 250))
    stable_id = product.id or sum(ord(ch) for ch in (product.sku or product.name or "product"))
    seasonal = ((date_value.month % 5) - 2) * 0.006
    weekday = (date_value.weekday() - 3) * 0.003
    cycle = (((date_value.day + stable_id + index) % 9) - 4) * 0.004
    return max(-0.12, min(0.12, seasonal + weekday + cycle + volatility_weight / 2))


def _get_fallback_volatility_percent(product: Product) -> float:
    stable_id = product.id or sum(ord(ch) for ch in (product.sku or product.name or "product"))
    return round(2.8 + ((stable_id % 37) / 10), 1)


def _get_trend_volatility_percent(price_history: list[dict], product: Product) -> float:
    prices = [float(row.get('market_price') or 0) for row in price_history if row.get('market_price')]
    if len(prices) > 1:
        average_price = sum(prices) / len(prices)
        if average_price:
            return round(max(((max(prices) - min(prices)) / average_price) * 100, 0.1), 1)
    return _get_fallback_volatility_percent(product)


class IsOwnerOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            getattr(request.user, 'role', None) in ('owner', 'admin')
        )


class CategoryViewSet(AuditMixin, viewsets.ModelViewSet):
    queryset         = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_audit_table_name(self):
        return 'Categories'


class SupplierViewSet(AuditMixin, viewsets.ModelViewSet):
    queryset           = Supplier.objects.all()
    serializer_class   = SupplierSerializer
    permission_classes = [IsAuthenticated]

    def get_audit_table_name(self):
        return 'Suppliers'


class ProductViewSet(AuditMixin, viewsets.ModelViewSet):
    queryset         = Product.objects.select_related('category', 'supplier')
    serializer_class = ProductSerializer
    filter_backends  = [filters.SearchFilter, filters.OrderingFilter]
    search_fields    = ['name', 'sku', 'brand']
    ordering_fields  = ['name', 'selling_price', 'stock', 'created_at']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsOwnerOrAdmin()]

    def get_audit_table_name(self):
        return 'Products'

    def _generate_sku(self):
        """Generate a unique SKU like PRD-AB3X9K2M."""
        while True:
            sku = 'PRD-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            if not Product.objects.filter(sku=sku).exists():
                return sku

    def perform_create(self, serializer):
        product_preview = Product(
            id=0,
            cost_price=serializer.validated_data.get('cost_price', Decimal('0.00')),
            created_at=timezone.now(),
        )
        # Create-time locked pricing based on market anchor and discount band.
        # This value is persisted and won't auto-change when market changes later.
        locked_price = _compute_locked_platform_price(product_preview)
        save_kwargs = {'sku': self._generate_sku(), 'selling_price': locked_price}
        # Use owner_name from payload if explicitly set; otherwise derive from the logged-in user
        if not serializer.validated_data.get('owner_name', '').strip():
            save_kwargs['owner_name'] = f"{self.request.user.first_name} {self.request.user.last_name}".strip()
        serializer.save(**save_kwargs)

    def _attach_review_stats(self, products):
        product_list = list(products)
        product_ids = [p.id for p in product_list]
        if not product_ids:
            return product_list

        stats = {
            row['product_id']: row
            for row in Review.objects
            .filter(product_id__in=product_ids)
            .order_by()
            .values('product_id')
            .annotate(
                average_rating=Avg('rating'),
                review_count=Count('id'),
            )
        }
        for product in product_list:
            row = stats.get(product.id)
            product.average_rating = row['average_rating'] if row else 0
            product.review_count = row['review_count'] if row else 0
        return product_list

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            products = self._attach_review_stats(page)
            serializer = self.get_serializer(products, many=True)
            return self.get_paginated_response(serializer.data)

        products = self._attach_review_stats(queryset)
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)

    def get_queryset(self):
        qs       = super().get_queryset()
        category = self.request.query_params.get('category')
        brand    = self.request.query_params.get('brand')
        owner    = self.request.query_params.get('owner')
        if category:
            qs = qs.filter(category__id=category)
        if brand:
            qs = qs.filter(brand__icontains=brand)
        if owner:
            qs = qs.filter(owner_name__icontains=owner)

        # ── Smart Filtering: min_price, max_price ──
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        if min_price:
            try:
                qs = qs.filter(selling_price__gte=Decimal(min_price))
            except (InvalidOperation, ValueError):
                pass
        if max_price:
            try:
                qs = qs.filter(selling_price__lte=Decimal(max_price))
            except (InvalidOperation, ValueError):
                pass

        # Owners see only their own products when the 'my_products' param is set
        if (self.request.query_params.get('my_products')
                and hasattr(self.request, 'user')
                and self.request.user.is_authenticated
                and hasattr(self.request.user, 'role')
                and self.request.user.role == 'owner'):
            store_name = f"{self.request.user.first_name} {self.request.user.last_name}"
            qs = qs.filter(owner_name__icontains=store_name.strip())

        # ── Smart Sorting ──
        sort_by = self.request.query_params.get('sort_by', '')
        action = getattr(self, 'action', None)
        if action == 'retrieve' or sort_by == 'top_rated':
            qs = qs.annotate(
                average_rating=Avg('reviews__rating'),
                review_count=Count('reviews', distinct=True)
            )

        if sort_by == 'price_low':
            qs = qs.order_by('selling_price')
        elif sort_by == 'price_high':
            qs = qs.order_by('-selling_price')
        elif sort_by == 'newest':
            qs = qs.order_by('-created_at')
        elif sort_by == 'best_selling':
            qs = qs.order_by('-units_sold')
        elif sort_by == 'top_rated':
            qs = qs.order_by('-average_rating')

        return qs


class PriceHistoryView(APIView):
    """Return price history for the price comparison graph on the product detail page."""
    permission_classes = [AllowAny]

    def get(self, request, product_id):
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({'detail': 'Product not found.'}, status=drf_status.HTTP_404_NOT_FOUND)

        locked_platform_price = _compute_locked_platform_price(product)
        actual_selling_price = float(product.selling_price or locked_platform_price)
        cost_price = float(product.cost_price)
        discount_price = float(product.discount_price) if product.discount_price else None

        market_snapshot = get_market_price_snapshot(product)
        market_price = market_snapshot.get('market_price')
        if market_price is None:
            return Response({
                'product_id': product_id,
                'product_name': product.name,
                'current_selling_price': actual_selling_price,
                'actual_selling_price': actual_selling_price,
                'current_cost_price': cost_price,
                'current_discount_price': discount_price,
                'market_price': None,
                'lowest_market_price': None,
                'highest_market_price': None,
                'market_volatility_percent': 0,
                'price_advantage_percent': None,
                'market_source': 'no_live_market_data',
                'market_offers': [],
                'savings_percent': None,
                'price_history': [],
                'detail': 'No same-product live market offer was found.',
            })
        market_anchor = market_price
        selling_price = actual_selling_price
        price_advantage_percent = _get_savings_percent(market_price, selling_price)

        # Audit logs are used only for real event dates; the comparison values
        # are based on the latest fetched market snapshot.
        history_dates = []
        logs = (
            AuditLog.objects
            .filter(table_name='Products', record_id=product_id, action__in=['UPDATE', 'CREATE', 'INSERT'])
            .order_by('timestamp')
        )

        for log in logs:
            try:
                old_vals = json.loads(log.old_values) if log.old_values else {}
                new_vals = json.loads(log.new_values) if log.new_values else {}
            except (json.JSONDecodeError, TypeError):
                old_vals = {}
                new_vals = {}

            new_price = new_vals.get('selling_price') or new_vals.get('SellingPrice')
            if new_price is not None:
                history_dates.append(log.timestamp)

        if not history_dates:
            now = timezone.now()
            created_at = product.created_at or now
            total_days = max(1, (now.date() - created_at.date()).days)
            step_days = max(1, total_days // 8)
            current = created_at

            while current <= now:
                history_dates.append(current)
                current += timedelta(days=step_days)

        now = timezone.now()
        if not history_dates or history_dates[-1].strftime('%Y-%m-%d') != now.strftime('%Y-%m-%d'):
            history_dates.append(now)

        price_history = []
        unique_dates = []
        seen_dates = set()
        for value in history_dates:
            key = value.strftime('%Y-%m-%d')
            if key in seen_dates:
                continue
            seen_dates.add(key)
            unique_dates.append(value)

        for index, value in enumerate(unique_dates):
            is_latest = value.strftime('%Y-%m-%d') == now.strftime('%Y-%m-%d')
            row_market_price = market_anchor if is_latest else round(
                market_anchor * (1 + _get_market_variation(product, value, index, market_snapshot)),
                2,
            )
            row_platform_price = selling_price
            row_volatility = max(
                abs(row_market_price - row_platform_price),
                row_market_price * max(0.02, float(market_snapshot.get('market_volatility_percent') or 4) / 200),
            )
            price_history.append({
                'date': value.strftime('%Y-%m-%d'),
                'our_price': row_platform_price,
                'market_price': round(row_market_price, 2),
                'market_low': round(max(0.01, row_market_price - row_volatility), 2),
                'market_high': round(row_market_price + (row_volatility * 0.25), 2),
            })
            price_history[-1]['market_band'] = [
                price_history[-1]['market_low'],
                price_history[-1]['market_high'],
            ]

        # Compute savings
        savings_percent = _get_savings_percent(market_price, selling_price)
        trend_volatility_percent = max(
            float(market_snapshot.get('market_volatility_percent') or 0),
            _get_trend_volatility_percent(price_history, product),
        )

        return Response({
            'product_id': product_id,
            'product_name': product.name,
            'current_selling_price': selling_price,
            'actual_selling_price': actual_selling_price,
            'current_cost_price': cost_price,
            'current_discount_price': discount_price,
            'market_price': market_price,
            'lowest_market_price': market_snapshot.get('lowest_market_price'),
            'highest_market_price': market_snapshot.get('highest_market_price'),
            'market_volatility_percent': round(trend_volatility_percent, 1),
            'price_advantage_percent': max(0, price_advantage_percent),
            'market_source': market_snapshot.get('source', 'fallback'),
            'market_offers': market_snapshot.get('offers', []),
            'savings_percent': max(0, savings_percent),
            'price_history': price_history,
        })


class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class   = ReviewSerializer
    http_method_names  = ['get', 'post', 'head', 'options']   # no PUT/PATCH/DELETE

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = Review.objects.select_related('product', 'customer').all()
        product_id = self.request.query_params.get('product')
        mine       = self.request.query_params.get('mine')
        if product_id:
            qs = qs.filter(product__id=product_id)
        if mine == 'true':
            qs = qs.filter(customer=self.request.user)
        return qs

    def perform_create(self, serializer):
        # Prevent duplicate reviews
        product_id = self.request.data.get('product')
        if Review.objects.filter(product__id=product_id, customer=self.request.user).exists():
            raise ValidationError('You have already reviewed this product.')
        serializer.save(customer=self.request.user)


class BrandsListView(APIView):
    """Return distinct non-empty brand names from the Products table."""
    permission_classes = [AllowAny]

    def get(self, request):
        brands = (
            Product.objects
            .exclude(brand='')
            .values_list('brand', flat=True)
            .distinct()
            .order_by('brand')
        )
        return Response(list(brands))


class BulkImportProductsView(APIView):
    """CSV bulk import for products. Owner uploads a CSV file with product data."""
    permission_classes = [IsOwnerOrAdmin]
    parser_classes = [MultiPartParser, FormParser]

    REQUIRED_COLUMNS = {'name', 'selling_price', 'cost_price'}

    def post(self, request):
        csv_file = request.FILES.get('file')
        if not csv_file:
            return Response({'detail': 'No CSV file provided.'}, status=drf_status.HTTP_400_BAD_REQUEST)

        if not csv_file.name.endswith('.csv'):
            return Response({'detail': 'File must be a .csv file.'}, status=drf_status.HTTP_400_BAD_REQUEST)

        try:
            decoded = csv_file.read().decode('utf-8-sig')
            reader = csv.DictReader(io.StringIO(decoded))
        except Exception:
            return Response({'detail': 'Could not read CSV file. Ensure it is UTF-8 encoded.'}, status=drf_status.HTTP_400_BAD_REQUEST)

        headers = set(reader.fieldnames or [])
        missing = self.REQUIRED_COLUMNS - headers
        if missing:
            return Response({'detail': f'Missing required columns: {", ".join(sorted(missing))}'}, status=drf_status.HTTP_400_BAD_REQUEST)

        owner_name = f"{request.user.first_name} {request.user.last_name}".strip()
        created = []
        errors = []

        for row_num, row in enumerate(reader, start=2):
            name = (row.get('name') or '').strip()
            if not name:
                errors.append(f'Row {row_num}: missing name')
                continue

            try:
                selling_price = Decimal(row.get('selling_price', '0').strip())
                cost_price = Decimal(row.get('cost_price', '0').strip())
            except (InvalidOperation, ValueError):
                errors.append(f'Row {row_num}: invalid price for "{name}"')
                continue

            # Resolve category
            category = None
            cat_name = (row.get('category') or '').strip()
            if cat_name:
                category, _ = Category.objects.get_or_create(name=cat_name)

            # Resolve supplier
            supplier = None
            sup_name = (row.get('supplier') or '').strip()
            if sup_name:
                supplier = Supplier.objects.filter(name__iexact=sup_name).first()

            stock = int(row.get('stock', '64').strip() or '64')
            reorder_level = int(row.get('reorder_level', '10').strip() or '10')

            product = Product.objects.create(
                name=name,
                sku=row.get('sku', '').strip() or f'BULK-{name[:10].upper().replace(" ", "")}-{row_num}',
                brand=row.get('brand', '').strip(),
                description=row.get('description', '').strip(),
                cost_price=cost_price,
                stock=stock,
                reorder_level=reorder_level,
                category=category,
                supplier=supplier,
                owner_name=owner_name,
                image_url=row.get('image_url', '').strip(),
            )
            # Apply the same locked discount rule for imported rows.
            product.selling_price = _compute_locked_platform_price(product)
            product.save(update_fields=['selling_price'])
            created.append({'id': product.id, 'name': product.name})

        if created:
            AuditLog.log_action(
                action='INSERT',
                table_name='Products',
                record_id=0,
                new_values={'bulk_import': True, 'count': len(created), 'owner': owner_name},
            )

        return Response({
            'created_count': len(created),
            'error_count': len(errors),
            'created': created,
            'errors': errors[:20],
        }, status=drf_status.HTTP_201_CREATED if created else drf_status.HTTP_400_BAD_REQUEST)


class PriceComparisonView(APIView):
    """AI-assisted product matching and market price comparison."""
    permission_classes = [AllowAny]

    def post(self, request):
        product_name = str(request.data.get('product_name', '')).strip()
        raw_price = request.data.get('price')

        if not product_name:
            return Response(
                {'detail': 'product_name is required.'},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        try:
            price = float(raw_price)
        except (TypeError, ValueError):
            return Response(
                {'detail': 'price must be a valid number.'},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        if price < 0:
            return Response(
                {'detail': 'price cannot be negative.'},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        try:
            result = get_price_comparison(product_name=product_name, my_price=price)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=drf_status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response(
                {'detail': 'Unable to compare market prices right now.'},
                status=drf_status.HTTP_503_SERVICE_UNAVAILABLE
            )

        return Response(result, status=drf_status.HTTP_200_OK)
