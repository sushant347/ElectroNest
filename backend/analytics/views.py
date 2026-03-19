from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Avg, F, Case, When, Value, DecimalField
from django.db.models.functions import TruncDay, TruncMonth
from django.utils import timezone
from datetime import timedelta

from orders.models import Order, OrderDetail
from products.models import Product, Category, Customer
from accounts.models import CustomUser

from .ml_services import get_customer_rfm, get_demand_forecast, get_product_recommendations, get_comprehensive_forecast, get_churn_prediction, get_dynamic_pricing


class IsOwnerOrAdmin(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and getattr(request.user, 'role', None) in ('owner', 'admin', 'warehouse')


def get_owner_store_name(user):
    """Return 'First Last' if user is an owner, else None."""
    if hasattr(user, 'role') and user.role == 'owner':
        name = f"{user.first_name} {user.last_name}".strip()
        return name or None
    return None


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
        if store:
            curr_detail_qs = curr_detail_qs.filter(product__owner_name__icontains=store)
            prev_detail_qs = prev_detail_qs.filter(product__owner_name__icontains=store)

        curr_agg = curr_detail_qs.aggregate(
            revenue=Sum(F('quantity') * F('unit_price')),
            profit=Sum(safe_profit_expr()),
        )
        prev_agg = prev_detail_qs.aggregate(
            revenue=Sum(F('quantity') * F('unit_price')),
        )

        curr_revenue = float(curr_agg['revenue'] or 0)
        curr_profit  = float(curr_agg['profit'] or 0)
        prev_revenue = float(prev_agg['revenue'] or 0)

        # Order counts (distinct orders containing this owner's products)
        curr_orders_qs = Order.objects.filter(order_date__gte=from_date).exclude(order_status__name='Cancelled')
        prev_orders_qs = Order.objects.filter(order_date__gte=prev_from, order_date__lt=from_date).exclude(order_status__name='Cancelled')
        if store:
            curr_orders_qs = curr_orders_qs.filter(details__product__owner_name__icontains=store).distinct()
            prev_orders_qs = prev_orders_qs.filter(details__product__owner_name__icontains=store).distinct()

        curr_orders    = curr_orders_qs.count()
        prev_orders    = prev_orders_qs.count()
        curr_customers = curr_orders_qs.values('customer').distinct().count()
        prev_customers = prev_orders_qs.values('customer').distinct().count()

        def pct_change(curr, prev):
            if prev == 0:
                return 0
            return round(((curr - prev) / prev) * 100, 1)

        # Total customers from legacy Customers table
        total_db_customers = Customer.objects.count()
        active_db_customers = Customer.objects.filter(is_active=True).count()

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
        if store:
            detail_qs = detail_qs.filter(product__owner_name__icontains=store)

        data = (
            detail_qs
            .annotate(period=trunc('order__order_date'))
            .values('period')
            .annotate(
                revenue=Sum(F('quantity') * F('unit_price')),
                profit=Sum(safe_profit_expr()),
                orders=Count('order', distinct=True),
            )
            .order_by('period')
        )

        fmt = '%Y-%m-%d' if period == 'daily' else '%Y-%m'

        return Response([{
            'period':  item['period'].strftime(fmt),
            'month':   item['period'].strftime('%b %Y') if period == 'monthly' else item['period'].strftime(fmt),
            'revenue': float(item['revenue'] or 0),
            'profit':  float(item['profit'] or 0),
            'orders':  item['orders'],
        } for item in data])


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
        if store:
            top_qs = top_qs.filter(product__owner_name__icontains=store)

        data = (
            top_qs
            .values('product__id', 'product__name', 'product__brand', 'product__category__name',
                    'product__description', 'product__image_url', 'product__owner_name')
            .annotate(
                total_quantity_sold=Sum('quantity'),
                total_revenue=Sum(F('quantity') * F('unit_price'))
            )
            .order_by('-total_revenue')[:50]
        )

        return Response([{
            'rank':                idx + 1,
            'product_id':          item['product__id'],
            'name':                item['product__name'],
            'brand':               item['product__brand'],
            'category':            item['product__category__name'],
            'owner_name':          item.get('product__owner_name', ''),
            'description':         item.get('product__description', ''),
            'image_url':           item.get('product__image_url', ''),
            'total_quantity_sold': item['total_quantity_sold'],
            'total_revenue':       float(item['total_revenue'] or 0),
        } for idx, item in enumerate(data)])


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

        data = (
            qs
            .values('product__category__name')
            .annotate(
                total_revenue=Sum(F('quantity') * F('unit_price')),
                total_orders=Count('order', distinct=True),
                product_count=Count('product', distinct=True)
            )
            .order_by('-total_revenue')
        )

        return Response([{
            'category_name': item['product__category__name'] or 'Uncategorized',
            'total_revenue': float(item['total_revenue'] or 0),
            'total_orders':  item['total_orders'],
            'product_count': item['product_count'],
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

        data = status_qs.values('order_status__name').annotate(value=Count('id'))

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


class CustomerSegmentationView(APIView):
    permission_classes = [IsOwnerOrAdmin]

    def get(self, request):
        days = int(request.query_params.get('days', 90))
        rfm_data = get_customer_rfm(days=days)
        return Response(rfm_data)


class DemandForecastView(APIView):
    permission_classes = [IsOwnerOrAdmin]

    def get(self, request, product_id):
        history = int(request.query_params.get('history', 30))
        forecast = int(request.query_params.get('forecast', 7))
        forecast_data = get_demand_forecast(product_id, days_history=history, forecast_days=forecast)
        return Response(forecast_data)


class ProductRecommendationsView(APIView):
    permission_classes = [IsOwnerOrAdmin]

    def get(self, request, product_id):
        limit = int(request.query_params.get('limit', 5))
        recs = get_product_recommendations(product_id, limit=limit)
        return Response(recs)


class ComprehensiveForecastView(APIView):
    """Full multi-model forecast with graphs data, metrics, decision matrix, decomposition."""
    permission_classes = [IsOwnerOrAdmin]

    def get(self, request, product_id):
        days = int(request.query_params.get('days', 30))
        forecast_days = int(request.query_params.get('forecast_days', 7))
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
        days = int(request.query_params.get('days', 90))
        threshold = int(request.query_params.get('threshold', 30))
        result = get_churn_prediction(days=days, churn_threshold_days=threshold)
        return Response(result)


class DynamicPricingView(APIView):
    """Suggest price adjustment for a product based on demand trends."""
    permission_classes = [IsOwnerOrAdmin]

    def get(self, request, product_id):
        result = get_dynamic_pricing(product_id)
        return Response(result)
