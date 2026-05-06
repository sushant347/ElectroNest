from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.db.models import Sum, Count, Avg, F, Case, When, Value, DecimalField
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
        now       = timezone.now()
        from_date = now - timedelta(days=days)
        prev_from = from_date - timedelta(days=days)

        store = get_owner_store_name(request.user)

        # Compute revenue and profit from OrderDetails (accurate per-product)
        curr_detail_qs = (
            OrderDetail.objects
            .filter(order__order_date__gte=from_date)
            .exclude(order__order_status__name='Cancelled')
        )
        prev_detail_qs = (
            OrderDetail.objects
            .filter(order__order_date__gte=prev_from, order__order_date__lt=from_date)
            .exclude(order__order_status__name='Cancelled')
        )
        curr_totals = _display_detail_totals(curr_detail_qs, store=store)
        prev_totals = _display_detail_totals(prev_detail_qs, store=store)

        curr_revenue = curr_totals['revenue']
        curr_profit  = curr_totals['profit']
        prev_revenue = prev_totals['revenue']

        curr_orders    = len(curr_totals['order_ids'])
        prev_orders    = len(prev_totals['order_ids'])
        curr_customers = len(curr_totals['customer_ids'])
        prev_customers = len(prev_totals['customer_ids'])

        def pct_change(curr, prev):
            if prev == 0:
                return 0
            return round(((curr - prev) / prev) * 100, 1)

        # Total customers from legacy Customers table (single query)
        from django.db.models import Count as _Count
        cust_agg = Customer.objects.aggregate(
            total=_Count('id'),
            active=_Count(Case(When(is_active=True, then=Value(1)), output_field=DecimalField())),
        )
        total_db_customers = cust_agg['total']
        active_db_customers = cust_agg['active']

        return Response({
            'total_revenue':    curr_revenue,
            'total_profit':     curr_profit,
            'total_orders':     curr_orders,
            'total_customers':  total_db_customers,
            'active_customers': active_db_customers,
            'ordering_customers': curr_customers,
            'revenue_change':   pct_change(curr_revenue, prev_revenue),
            'orders_change':    pct_change(curr_orders, prev_orders),
            'customers_change': pct_change(curr_customers, prev_customers),
        })


class RevenueTrendView(APIView):
    permission_classes = [IsOwnerOrAdmin]

    def get(self, request):
        days   = int(request.query_params.get('days', 3650))
        period = request.query_params.get('period', 'daily')
        from_date = timezone.now() - timedelta(days=days)

        store = get_owner_store_name(request.user)
        if not store:
            store = request.query_params.get('owner_name', '').strip() or None
        trunc = TruncDay if period == 'daily' else TruncMonth

        # Compute both revenue and profit from OrderDetails (per-product accurate)
        detail_qs = (
            OrderDetail.objects
            .filter(order__order_date__gte=from_date)
            .exclude(order__order_status__name='Cancelled')
        )
        fmt = '%Y-%m-%d' if period == 'daily' else '%Y-%m'
        buckets = {}
        for detail in detail_qs.select_related('order', 'product__category', 'product__supplier'):
            product = display_product_for_detail(detail)
            if not product:
                continue
            if store and store.lower() not in (product.owner_name or '').lower():
                continue
            raw_period = detail.order.order_date.date().replace(day=1) if period == 'monthly' else detail.order.order_date.date()
            if raw_period not in buckets:
                buckets[raw_period] = {'revenue': 0.0, 'profit': 0.0, 'orders': set()}
            qty = detail.quantity or 0
            unit_price = float(product.selling_price or detail.unit_price or 0)
            cost_price = min(max(float(product.cost_price or 0), 0), unit_price)
            buckets[raw_period]['revenue'] += qty * unit_price
            buckets[raw_period]['profit'] += qty * (unit_price - cost_price)
            buckets[raw_period]['orders'].add(detail.order_id)

        return Response([{
            'period':  key.strftime(fmt),
            'month':   key.strftime('%b %Y') if period == 'monthly' else key.strftime(fmt),
            'revenue': round(value['revenue'], 2),
            'profit':  round(value['profit'], 2),
            'orders':  len(value['orders']),
        } for key, value in sorted(buckets.items())])


class TopProductsView(APIView):
    permission_classes = [IsOwnerOrAdmin]

    def get(self, request):
        days      = int(request.query_params.get('days', 3650))
        from_date = timezone.now() - timedelta(days=days)

        top_qs = (
            OrderDetail.objects
            .filter(order__order_date__gte=from_date)
            .exclude(order__order_status__name='Cancelled')
        )
        store = get_owner_store_name(request.user)
        if not store:
            store = request.query_params.get('owner_name', '').strip() or None
        product_map = {}
        for detail in top_qs.select_related('product__category', 'product__supplier'):
            product = display_product_for_detail(detail)
            if not product:
                continue
            if store and store.lower() not in (product.owner_name or '').lower():
                continue
            key = product.id
            if key not in product_map:
                product_map[key] = {
                    'product_id': product.id,
                    'name': product.name,
                    'brand': product.brand,
                    'category': product.category.name if product.category else '',
                    'owner_name': product.owner_name,
                    'description': product.description,
                    'image_url': product.image_url,
                    'total_quantity_sold': 0,
                    'total_revenue': 0.0,
                }
            product_map[key]['total_quantity_sold'] += detail.quantity or 0
            product_map[key]['total_revenue'] += float((detail.quantity or 0) * (product.selling_price or detail.unit_price or 0))

        data = sorted(product_map.values(), key=lambda item: item['total_revenue'], reverse=True)[:50]
        return Response([{**item, 'rank': idx + 1} for idx, item in enumerate(data)])


class CategoryPerformanceView(APIView):
    permission_classes = [IsOwnerOrAdmin]

    def get(self, request):
        days      = int(request.query_params.get('days', 3650))
        from_date = timezone.now() - timedelta(days=days)

        qs = (
            OrderDetail.objects
            .filter(order__order_date__gte=from_date)
            .exclude(order__order_status__name='Cancelled')
        )

        # Owner sees only their own products' category performance
        if hasattr(request, 'user') and request.user.is_authenticated and getattr(request.user, 'role', None) == 'owner':
            store_name = f"{request.user.first_name} {request.user.last_name}".strip()
            if store_name:
                qs = qs.filter(product__owner_name__icontains=store_name)

        category_map = {}
        for detail in qs.select_related('product__category', 'product__supplier'):
            product = display_product_for_detail(detail)
            category = product.category.name if product and product.category else 'Uncategorized'
            if category not in category_map:
                category_map[category] = {
                    'category_name': category,
                    'total_revenue': 0.0,
                    'order_ids': set(),
                    'product_ids': set(),
                }
            category_map[category]['total_revenue'] += float((detail.quantity or 0) * (product.selling_price or detail.unit_price or 0))
            category_map[category]['order_ids'].add(detail.order_id)
            if product:
                category_map[category]['product_ids'].add(product.id)

        data = sorted(category_map.values(), key=lambda item: item['total_revenue'], reverse=True)
        return Response([{
            'category_name': item['category_name'],
            'total_revenue': item['total_revenue'],
            'total_orders': len(item['order_ids']),
            'product_count': len(item['product_ids']),
        } for item in data])


class PaymentMethodsView(APIView):
    permission_classes = [IsOwnerOrAdmin]

    def get(self, request):
        days      = int(request.query_params.get('days', 3650))
        from_date = timezone.now() - timedelta(days=days)

        from orders.models import Payment
        data = (
            Payment.objects
            .filter(paid_at__gte=from_date)
            .values('method__name')
            .annotate(value=Sum('payable_amount'))
            .order_by('-value')
        )

        return Response([{
            'name':  item['method__name'],
            'value': float(item['value'] or 0),
        } for item in data])


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
        products = Product.objects.filter(stock__lte=F('reorder_level')).select_related('category')
        store = get_owner_store_name(request.user)
        if store:
            products = products.filter(owner_name__icontains=store)

        return Response([{
            'id':            p.id,
            'product_id':    p.id,
            'name':          p.name,
            'category_name': p.category.name if p.category else '',
            'brand_name':    p.brand,
            'owner_name':    p.owner_name,
            'stock':         p.stock,
            'stock_quantity': p.stock,
            'reorder_level': p.reorder_level,
        } for p in products])


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
