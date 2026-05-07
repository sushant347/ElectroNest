from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.core.cache import cache
from django.db.models import Sum, Count, Avg, F, Case, When, Value, DecimalField, ExpressionWrapper
from django.db.models.functions import TruncDay, TruncMonth
from django.utils import timezone
from datetime import timedelta

from orders.models import Order, OrderDetail
from products.models import Product, Category, Customer
from products.catalog_replacement import display_product_for_detail
from accounts.models import CustomUser

from .jobs import enqueue_job, get_job


class IsOwnerOrAdmin(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and getattr(request.user, 'role', None) in ('owner', 'admin', 'warehouse')


def get_owner_store_name(user):
    """Return 'First Last' if user is an owner, else None."""
    if hasattr(user, 'role') and user.role == 'owner':
        name = f"{user.first_name} {user.last_name}".strip()
        return name or None
    return None


def _wants_async(request):
    raw = (request.query_params.get('async') or '').strip().lower()
    return raw in ('1', 'true', 'yes')


def _wants_meta(request):
    raw = (request.query_params.get('include_meta') or '').strip().lower()
    return raw in ('1', 'true', 'yes')


def _cache_key(request, name, extra=''):
    user = getattr(request, 'user', None)
    role = getattr(user, 'role', 'customer')
    uid = getattr(user, 'id', 'anon')
    return f'analytics:{name}:{role}:{uid}:{extra}'


def _cached_response(request, name, extra, builder, ttl=45):
    key = _cache_key(request, name, extra)
    cached = cache.get(key)
    if cached is not None:
        return Response(cached)
    data = builder()
    cache.set(key, data, ttl)
    return Response(data)


def safe_profit_expr():
    """
    Compute profit safely: quantity * (unit_price - bounded_cost_price).
    Handles bad CostPrice data (negative values, values exceeding selling price)
    by clamping cost_price to [0, unit_price] using Case/When (SQL Server compatible).
    """
    bounded_cost = Case(
        When(product__cost_price__lt=0, then=Value(0, output_field=DecimalField())),
        When(product__cost_price__gt=F('unit_price'), then=F('unit_price')),
        default=F('product__cost_price'),
        output_field=DecimalField(),
    )
    return F('quantity') * (F('unit_price') - bounded_cost)


def revenue_expr():
    return ExpressionWrapper(F('quantity') * F('unit_price'), output_field=DecimalField(max_digits=14, decimal_places=2))


def _payment_method_label(name):
    if name in ('BankTransfer', 'Bank Transfer'):
        return 'Bank'
    if name in ('eSewa', 'ESewa'):
        return 'Esewa'
    if name == 'Cash on Delivery':
        return 'Cash'
    return name or 'Unknown'


def _owner_filtered_details(request, qs):
    store = get_owner_store_name(request.user)
    if not store:
        store = request.query_params.get('owner_name', '').strip() or None
    if store:
        qs = qs.filter(product__owner_name__icontains=store)
    return qs


def _display_detail_totals(qs, store=None):
    revenue = 0.0
    profit = 0.0
    order_ids = set()
    customer_ids = set()
    for detail in qs.select_related('order__customer', 'product__category', 'product__supplier'):
        product = display_product_for_detail(detail)
        if not product:
            continue
        if store and store.lower() not in (product.owner_name or '').lower():
            continue
        qty = detail.quantity or 0
        unit_price = float(product.selling_price or detail.unit_price or 0)
        cost_price = min(max(float(product.cost_price or 0), 0), unit_price)
        revenue += qty * unit_price
        profit += qty * (unit_price - cost_price)
        order_ids.add(detail.order_id)
        if getattr(detail, 'order', None):
            customer_ids.add(detail.order.customer_id)
    return {
        'revenue': revenue,
        'profit': profit,
        'order_ids': order_ids,
        'customer_ids': customer_ids,
    }


class SalesOverviewView(APIView):
    permission_classes = [IsOwnerOrAdmin]

    def get(self, request):
        days      = int(request.query_params.get('days', 3650))
        def build():
            now       = timezone.now()
            from_date = now - timedelta(days=days)
            prev_from = from_date - timedelta(days=days)

            base_qs = OrderDetail.objects.exclude(order__order_status__name='Cancelled')
            curr_qs = _owner_filtered_details(request, base_qs.filter(order__order_date__gte=from_date))
            prev_qs = _owner_filtered_details(request, base_qs.filter(order__order_date__gte=prev_from, order__order_date__lt=from_date))

            curr = curr_qs.aggregate(
                revenue=Sum(revenue_expr()),
                profit=Sum(safe_profit_expr()),
                orders=Count('order_id', distinct=True),
                customers=Count('order__customer_id', distinct=True),
            )
            prev = prev_qs.aggregate(
                revenue=Sum(revenue_expr()),
                orders=Count('order_id', distinct=True),
                customers=Count('order__customer_id', distinct=True),
            )

            def pct_change(curr_value, prev_value):
                curr_value = float(curr_value or 0)
                prev_value = float(prev_value or 0)
                return 0 if prev_value == 0 else round(((curr_value - prev_value) / prev_value) * 100, 1)

            cust_agg = Customer.objects.aggregate(
                total=Count('id'),
                active=Count(Case(When(is_active=True, then=Value(1)), output_field=DecimalField())),
            )
            return {
                'total_revenue':    float(curr['revenue'] or 0),
                'total_profit':     float(curr['profit'] or 0),
                'total_orders':     curr['orders'] or 0,
                'total_customers':  cust_agg['total'] or 0,
                'active_customers': cust_agg['active'] or 0,
                'ordering_customers': curr['customers'] or 0,
                'revenue_change':   pct_change(curr['revenue'], prev['revenue']),
                'orders_change':    pct_change(curr['orders'], prev['orders']),
                'customers_change': pct_change(curr['customers'], prev['customers']),
            }
        return _cached_response(request, 'sales_overview', days, build)


class RevenueTrendView(APIView):
    permission_classes = [IsOwnerOrAdmin]

    def get(self, request):
        days   = int(request.query_params.get('days', 3650))
        period = request.query_params.get('period', 'daily')
        def build():
            from_date = timezone.now() - timedelta(days=days)
            trunc = TruncDay if period == 'daily' else TruncMonth
            fmt = '%Y-%m-%d' if period == 'daily' else '%Y-%m'
            detail_qs = _owner_filtered_details(request, OrderDetail.objects.filter(order__order_date__gte=from_date).exclude(order__order_status__name='Cancelled'))
            rows = (
                detail_qs
                .annotate(period_value=trunc('order__order_date'))
                .values('period_value')
                .annotate(revenue=Sum(revenue_expr()), profit=Sum(safe_profit_expr()), orders=Count('order_id', distinct=True))
                .order_by('period_value')
            )
            return [{
                'period':  row['period_value'].strftime(fmt),
                'month':   row['period_value'].strftime('%b %Y') if period == 'monthly' else row['period_value'].strftime(fmt),
                'revenue': round(float(row['revenue'] or 0), 2),
                'profit':  round(float(row['profit'] or 0), 2),
                'orders':  row['orders'] or 0,
            } for row in rows]
        return _cached_response(request, 'revenue_trend', f'{days}:{period}', build)


class TopProductsView(APIView):
    permission_classes = [IsOwnerOrAdmin]

    def get(self, request):
        days      = int(request.query_params.get('days', 3650))
        def build():
            from_date = timezone.now() - timedelta(days=days)
            qs = _owner_filtered_details(request, OrderDetail.objects.filter(order__order_date__gte=from_date).exclude(order__order_status__name='Cancelled'))
            rows = (
                qs.values('product_id', 'product__name', 'product__brand', 'product__category__name', 'product__owner_name', 'product__description', 'product__image_url')
                .annotate(total_quantity_sold=Sum('quantity'), total_revenue=Sum(revenue_expr()))
                .order_by('-total_revenue')[:50]
            )
            return [{
                'rank': idx + 1,
                'product_id': row['product_id'],
                'name': row['product__name'] or '',
                'brand': row['product__brand'] or '',
                'category': row['product__category__name'] or '',
                'owner_name': row['product__owner_name'] or '',
                'description': row['product__description'] or '',
                'image_url': row['product__image_url'] or '',
                'total_quantity_sold': row['total_quantity_sold'] or 0,
                'total_revenue': float(row['total_revenue'] or 0),
            } for idx, row in enumerate(rows)]
        return _cached_response(request, 'top_products', days, build)


class CategoryPerformanceView(APIView):
    permission_classes = [IsOwnerOrAdmin]

    def get(self, request):
        days      = int(request.query_params.get('days', 3650))
        def build():
            from_date = timezone.now() - timedelta(days=days)
            qs = _owner_filtered_details(request, OrderDetail.objects.filter(order__order_date__gte=from_date).exclude(order__order_status__name='Cancelled'))
            rows = (
                qs.values('product__category__name')
                .annotate(total_revenue=Sum(revenue_expr()), total_orders=Count('order_id', distinct=True), product_count=Count('product_id', distinct=True))
                .order_by('-total_revenue')
            )
            return [{
                'category_name': row['product__category__name'] or 'Uncategorized',
                'total_revenue': float(row['total_revenue'] or 0),
                'total_orders': row['total_orders'] or 0,
                'product_count': row['product_count'] or 0,
            } for row in rows]
        return _cached_response(request, 'category_performance', days, build)


class PaymentMethodsView(APIView):
    permission_classes = [IsOwnerOrAdmin]

    def get(self, request):
        days      = int(request.query_params.get('days', 3650))
        from_date = timezone.now() - timedelta(days=days)

        detail_qs = (
            OrderDetail.objects
            .filter(order__order_date__gte=from_date, order__payments__isnull=False)
            .exclude(order__order_status__name='Cancelled')
        )
        detail_qs = _owner_filtered_details(request, detail_qs)
        rows = (
            detail_qs
            .values('order__payments__method__name')
            .annotate(value=Sum(revenue_expr()))
            .order_by('-value')
        )

        totals = {}
        for item in rows:
            label = _payment_method_label(item['order__payments__method__name'])
            totals[label] = totals.get(label, 0.0) + float(item['value'] or 0)

        preferred_order = {'Cash': 0, 'Esewa': 1, 'Khalti': 2, 'Bank': 3}
        return Response([
            {'name': name, 'value': round(value, 2)}
            for name, value in sorted(totals.items(), key=lambda kv: (preferred_order.get(kv[0], 99), kv[0]))
            if value > 0
        ])


class OrderStatusView(APIView):
    permission_classes = [IsOwnerOrAdmin]

    def get(self, request):
        days      = int(request.query_params.get('days', 3650))
        from_date = timezone.now() - timedelta(days=days)

        status_qs = Order.objects.filter(order_date__gte=from_date)
        store = get_owner_store_name(request.user)
        if store:
            status_qs = status_qs.filter(details__product__owner_name__icontains=store).distinct()

        data = status_qs.order_by().values('order_status__name').annotate(value=Count('id')).order_by('-value')

        return Response([{
            'name':  item['order_status__name'] or 'Unknown',
            'value': item['value'],
        } for item in data])


class LowStockView(APIView):
    permission_classes = [IsOwnerOrAdmin]

    def get(self, request):
        def build():
            products = Product.objects.filter(stock__lte=F('reorder_level')).select_related('category')
            store = get_owner_store_name(request.user)
            if store:
                products = products.filter(owner_name__icontains=store)

            return [{
                'id':            p.id,
                'product_id':    p.id,
                'name':          p.name,
                'category_name': p.category.name if p.category else '',
                'brand_name':    p.brand,
                'owner_name':    p.owner_name,
                'stock':         p.stock,
                'stock_quantity': p.stock,
                'reorder_level': p.reorder_level,
            } for p in products]

        return _cached_response(request, 'low_stock', 'v2', build, ttl=120)


class AnalyticsJobStatusView(APIView):
    permission_classes = [IsOwnerOrAdmin]

    def get(self, request, job_id):
        job = get_job(job_id)
        if not job:
            return Response({'detail': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(job)


class CustomerSegmentationView(APIView):
    permission_classes = [IsOwnerOrAdmin]

    def get(self, request):
        from .ml_services import get_customer_rfm

        days = int(request.query_params.get('days', 90))
        include_meta = _wants_meta(request)
        if _wants_async(request):
            job_id = enqueue_job('segmentation', get_customer_rfm, days=days, include_meta=include_meta)
            return Response({'job_id': job_id, 'status': 'queued'})
        rfm_data = get_customer_rfm(days=days, include_meta=include_meta)
        return Response(rfm_data)


class DemandForecastView(APIView):
    permission_classes = [IsOwnerOrAdmin]

    def get(self, request, product_id):
        from .ml_services import get_demand_forecast

        history = int(request.query_params.get('history', 30))
        forecast = int(request.query_params.get('forecast', 7))
        if _wants_async(request):
            job_id = enqueue_job('demand_forecast', get_demand_forecast, product_id, days_history=history, forecast_days=forecast)
            return Response({'job_id': job_id, 'status': 'queued'})
        forecast_data = get_demand_forecast(product_id, days_history=history, forecast_days=forecast)
        return Response(forecast_data)


class ProductRecommendationsView(APIView):
    permission_classes = [IsOwnerOrAdmin]

    def get(self, request, product_id):
        from .ml_services import get_product_recommendations

        limit = int(request.query_params.get('limit', 5))
        include_meta = _wants_meta(request)
        if _wants_async(request):
            job_id = enqueue_job('recommendations', get_product_recommendations, product_id, limit=limit, include_meta=include_meta)
            return Response({'job_id': job_id, 'status': 'queued'})
        recs = get_product_recommendations(product_id, limit=limit, include_meta=include_meta)
        return Response(recs)


class ComprehensiveForecastView(APIView):
    """Full multi-model forecast with graphs data, metrics, decision matrix, decomposition."""
    permission_classes = [IsOwnerOrAdmin]

    def get(self, request, product_id):
        from .ml_services import get_comprehensive_forecast

        days = int(request.query_params.get('days', 30))
        forecast_days = int(request.query_params.get('forecast_days', 7))
        if _wants_async(request):
            job_id = enqueue_job('comprehensive_forecast', get_comprehensive_forecast, product_id, days_history=days, forecast_days=forecast_days)
            return Response({'job_id': job_id, 'status': 'queued'})
        result = get_comprehensive_forecast(product_id, days_history=days, forecast_days=forecast_days)
        return Response(result)


class ProductGrowthView(APIView):
    """Day-by-day units sold + revenue for a single product (for growth charts)."""
    permission_classes = [IsOwnerOrAdmin]

    def get(self, request, product_id):
        days      = int(request.query_params.get('days', 90))
        from_date = timezone.now() - timedelta(days=days)

        # Fetch the product details
        try:
            product = Product.objects.get(id=product_id)
            selling_price = float(product.selling_price)
            cost_price    = float(product.cost_price)
            # Profit margin ratio from current prices (e.g. 0.065 = 6.5%)
            # Applied to the historical unit_price so profit scales correctly
            # even when orders were placed at discounted / older prices.
            margin_ratio = ((selling_price - cost_price) / selling_price) if selling_price > 0 else 0.0
            product_info = {
                'description':   product.description or '',
                'image_url':     product.image_url or '',
                'margin_ratio':  margin_ratio,
            }
        except Product.DoesNotExist:
            product_info = {'description': '', 'image_url': '', 'margin_ratio': 0.0}

        rows = (
            OrderDetail.objects
            .filter(product_id=product_id, order__order_date__gte=from_date)
            .exclude(order__order_status__name='Cancelled')
            .annotate(day=TruncDay('order__order_date'))
            .values('day')
            .annotate(
                units=Sum('quantity'),
                revenue=Sum(F('quantity') * F('unit_price')),
            )
            .order_by('day')
        )

        # Compute profit in Python: revenue * margin_ratio
        # This gives the realistic profit that scales with whatever price was charged.
        margin = product_info['margin_ratio']
        days_list    = []
        units_list   = []
        revenue_list = []
        profit_list  = []

        for r in rows:
            rev    = float(r['revenue'] or 0)
            profit = round(rev * margin, 2)
            days_list.append(str(r['day'].date()))
            units_list.append(r['units'])
            revenue_list.append(round(rev, 2))
            profit_list.append(profit)

        total_units   = sum(units_list)
        total_revenue = round(sum(revenue_list), 2)
        total_profit  = round(sum(profit_list), 2)

        return Response({
            'product_id':    product_id,
            'description':   product_info['description'],
            'image_url':     product_info['image_url'],
            'days':          days_list,
            'units':         units_list,
            'revenue':       revenue_list,
            'profit':        profit_list,
            'total_units':   total_units,
            'total_revenue': total_revenue,
            'total_profit':  total_profit,
        })


class ChurnPredictionView(APIView):
    """Predict customer churn using RFM + logistic regression."""
    permission_classes = [IsOwnerOrAdmin]

    def get(self, request):
        from .ml_services import get_churn_prediction

        days = int(request.query_params.get('days', 90))
        threshold = int(request.query_params.get('threshold', 30))
        if _wants_async(request):
            job_id = enqueue_job('churn_prediction', get_churn_prediction, days=days, churn_threshold_days=threshold)
            return Response({'job_id': job_id, 'status': 'queued'})
        result = get_churn_prediction(days=days, churn_threshold_days=threshold)
        return Response(result)


class DynamicPricingView(APIView):
    """Suggest price adjustment for a product based on demand trends."""
    permission_classes = [IsOwnerOrAdmin]

    def get(self, request, product_id):
        from .ml_services import get_dynamic_pricing

        if _wants_async(request):
            job_id = enqueue_job('dynamic_pricing', get_dynamic_pricing, product_id)
            return Response({'job_id': job_id, 'status': 'queued'})
        result = get_dynamic_pricing(product_id)
        return Response(result)
