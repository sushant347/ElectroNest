from rest_framework import viewsets, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.core.cache import cache
from django.db.models import Sum, Count, F, Q, Prefetch
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta

from .models import PurchaseOrder, PurchaseOrderDetail
from .serializers import PurchaseOrderSerializer, PurchaseOrderDetailSerializer
from products.models import Product, Supplier
from products.catalog_replacement import display_product_for_detail, display_product_for_purchase_detail
from orders.models import Order, OrderStatus, OrderDetail, Payment
from admin_panel.models import AuditLog


def _line_item_store_name(product, product_id_fallback=None):
    """
    Label for warehouse store column. 'Unknown Store' appeared when Product.owner_name was blank
    or the product row was missing; we fall back to supplier name then SKU so rows stay identifiable.
    """
    if product is None:
        return f'Removed product #{product_id_fallback}' if product_id_fallback is not None else 'Removed product'
    owner = (getattr(product, 'owner_name', None) or '').strip()
    if owner:
        return owner
    supplier = getattr(product, 'supplier', None)
    if supplier is not None:
        sn = (getattr(supplier, 'name', None) or '').strip()
        if sn:
            return sn
    sku = (getattr(product, 'sku', None) or '').strip()
    if sku:
        return f'Store · SKU {sku}'
    return f'Store · product #{product.id}'


def _dashboard_product_for_detail(detail):
    product = getattr(detail, 'product', None)
    if getattr(getattr(product, 'category', None), 'name', '') == 'Legacy Catalog':
        return display_product_for_detail(detail)
    return product


def _dashboard_order_payload(order, date_field='order_date'):
    details = list(order.details.all())
    items = []
    display_total = 0.0

    for detail in details:
        product = _dashboard_product_for_detail(detail)
        unit_price = detail.unit_price or 0
        display_total += float(unit_price * detail.quantity)
        if len(items) < 5:
            items.append({
                'product_name': product.name if product else f'Product #{detail.product_id}',
                'quantity': detail.quantity,
                'product_id': product.id if product else detail.product_id,
                'variant_id': detail.variant_id,
                'unit_price': float(unit_price),
                'total_price': float(unit_price * detail.quantity),
            })

    customer = getattr(order, 'customer', None)
    first_name = getattr(customer, 'first_name', '') or ''
    last_name = getattr(customer, 'last_name', '') or ''
    order_date = getattr(order, date_field, None)

    return {
        'id': order.id,
        'order_number': order.order_number,
        'status': order.order_status.name if order.order_status else '',
        'customer_name': f"{first_name} {last_name}".strip() or 'Customer',
        'total_amount': display_total,
        'date': order_date.isoformat() if order_date else '',
        'items': items,
        'items_count': getattr(order, 'detail_count', len(details)),
    }


class IsWarehouseOrOwner(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and getattr(request.user, 'role', None) in ('warehouse', 'owner', 'admin')


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    serializer_class   = PurchaseOrderSerializer
    permission_classes = [IsWarehouseOrOwner]
    filter_backends    = [filters.SearchFilter, filters.OrderingFilter]
    search_fields      = ['supplier__name', 'order_status__name']
    ordering_fields    = ['order_date', 'total_amount', 'created_at']

    def get_queryset(self):
        qs = PurchaseOrder.objects.select_related('supplier', 'order_status').prefetch_related('details').all()
        supplier_id = self.request.query_params.get('supplier')
        status_id   = self.request.query_params.get('status')
        if supplier_id:
            qs = qs.filter(supplier_id=supplier_id)
        if status_id:
            qs = qs.filter(order_status_id=status_id)
        return qs.order_by('-created_at')

    @transaction.atomic
    def create(self, request):
        supplier_id = request.data.get('supplier')
        items       = request.data.get('items', [])
        status_name = request.data.get('status', 'Pending')
        expected    = request.data.get('expected_delivery_date')

        if not supplier_id or not items:
            return Response({'detail': 'Supplier and items are required'},
                            status=status.HTTP_400_BAD_REQUEST)

        order_status, _ = OrderStatus.objects.get_or_create(name=status_name)

        total = sum(Decimal(str(i.get('unit_cost', 0))) * int(i.get('quantity', 0)) for i in items)

        po = PurchaseOrder.objects.create(
            supplier               = Supplier.objects.get(id=supplier_id),
            total_amount           = total,
            expected_delivery_date = expected,
            order_status           = order_status,
        )

        details_info = []
        for item in items:
            PurchaseOrderDetail.objects.create(
                purchase_order = po,
                product_id     = item['product'],
                quantity       = item['quantity'],
                unit_cost      = item['unit_cost'],
            )
            try:
                prod = Product.objects.get(id=item['product'])
                details_info.append({
                    'product_id': item['product'],
                    'product_name': prod.name,
                    'quantity': item['quantity'],
                    'unit_cost': str(item['unit_cost']),
                })
            except Product.DoesNotExist:
                details_info.append({'product_id': item['product'], 'quantity': item['quantity']})

        AuditLog.log_action(
            action='INSERT',
            table_name='PurchaseOrders',
            record_id=po.id,
            user=request.user,
            new_values={
                'purchase_order_id': po.id,
                'supplier': Supplier.objects.get(id=supplier_id).name,
                'total_amount': str(total),
                'status': status_name,
                'items': details_info,
            },
        )

        return Response(PurchaseOrderSerializer(po).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'], url_path='receive')
    @transaction.atomic
    def receive(self, request, pk=None):
        """Mark a purchase order as delivered and add stock."""
        po = self.get_object()
        delivered_status, _ = OrderStatus.objects.get_or_create(name='Delivered')

        stock_changes = []
        for detail in po.details.all():
            old_stock = detail.product.stock
            detail.product.stock += detail.quantity
            detail.product.save()
            new_stock = detail.product.stock

            # Log individual stock update per product
            AuditLog.log_action(
                action='UPDATE',
                table_name='Products',
                record_id=detail.product.id,
                user=request.user,
                old_values={'stock': old_stock, 'product': detail.product.name},
                new_values={'stock': new_stock, 'product': detail.product.name,
                            'added': detail.quantity, 'source': f'PO #{po.id}'},
            )
            stock_changes.append({
                'product_id': detail.product.id,
                'product_name': detail.product.name,
                'old_stock': old_stock,
                'new_stock': new_stock,
                'added': detail.quantity,
            })

        po.order_status = delivered_status
        po.save()

        # Log PO reception
        AuditLog.log_action(
            action='UPDATE',
            table_name='PurchaseOrders',
            record_id=po.id,
            user=request.user,
            old_values={'status': 'Pending'},
            new_values={'status': 'Delivered', 'stock_changes': stock_changes},
        )

        return Response(PurchaseOrderSerializer(po).data)


class WarehouseDashboardView(APIView):
    permission_classes = [IsWarehouseOrOwner]

    def get(self, request):
        cached = cache.get('warehouse:dashboard:v4')
        if cached is not None:
            return Response(cached)

        visible_products  = Product.objects.exclude(category__name='Legacy Catalog')
        product_totals = visible_products.aggregate(
            total_products=Count('id'),
            total_stock=Sum('stock'),
            low_stock_count=Count('id', filter=Q(stock__lte=F('reorder_level'))),
        )
        total_products    = product_totals['total_products'] or 0
        total_stock       = product_totals['total_stock'] or 0
        low_stock_count   = product_totals['low_stock_count'] or 0
        pending_pos       = PurchaseOrder.objects.filter(order_status__name='Pending').count()

        low_stock_data = list(
            visible_products
            .filter(stock__lte=F('reorder_level'))
            .select_related('category')
            .values('id', 'name', 'sku', 'stock', 'reorder_level', 'brand', category_name=F('category__name'))[:10]
        )

        recent_pos = (
            PurchaseOrder.objects
            .select_related('supplier', 'order_status')
            .annotate(detail_count=Count('details'))
            .order_by('-created_at')[:10]
        )
        recent_pos_data = [{
            'id': po.id,
            'supplier_name': po.supplier.name if po.supplier else '',
            'status_name': po.order_status.name if po.order_status else 'Unknown',
            'total_amount': float(po.total_amount or 0),
            'details': [None] * (po.detail_count or 0),
        } for po in recent_pos]

        order_details_prefetch = Prefetch(
            'details',
            queryset=OrderDetail.objects.select_related('product__category', 'product__supplier'),
        )

        # Recent customer orders (Pending/Processing) that warehouse needs to handle
        pending_processing = (
            Order.objects
            .filter(order_status__name__in=['Pending', 'Processing'])
            .select_related('customer', 'order_status')
            .prefetch_related(order_details_prefetch)
            .annotate(detail_count=Count('details'))
            .filter(detail_count__gt=0)
            .order_by('-order_date')[:10]
        )
        recent_customer_orders = [_dashboard_order_payload(o, 'order_date') for o in pending_processing]

        # Shipped orders ready to deliver (only those with order details)
        shipped_orders = (
            Order.objects
            .filter(order_status__name='Shipped')
            .select_related('customer', 'order_status')
            .prefetch_related(order_details_prefetch)
            .annotate(detail_count=Count('details'))
            .filter(detail_count__gt=0)
            .order_by('-updated_at')[:10]
        )
        ready_to_deliver = [_dashboard_order_payload(o, 'updated_at') for o in shipped_orders]

        # Count of shipped orders ready to deliver
        shipped_count = Order.objects.filter(
            order_status__name='Shipped'
        ).annotate(detail_count=Count('details')).filter(detail_count__gt=0).count()

        data = {
            'total_products':   total_products,
            'total_stock':      total_stock,
            'low_stock_count':  low_stock_count,
            'pending_purchase_orders': pending_pos,
            'low_stock_items':  low_stock_data,
            'recent_purchase_orders': recent_pos_data,
            'recent_customer_orders': recent_customer_orders,
            'ready_to_deliver': ready_to_deliver,
            'shipped_count': shipped_count,
        }
        cache.set('warehouse:dashboard:v4', data, 120)
        return Response(data)


class StockMovementsView(APIView):
    """Return recent stock movements: shipped orders, received POs, and recently added/updated products."""
    permission_classes = [IsWarehouseOrOwner]

    def get(self, request):
        section = (request.query_params.get('section') or 'all').strip().lower()
        valid_sections = {'all', 'purchase_orders', 'shipped_orders', 'product_updates'}
        if section not in valid_sections:
            section = 'all'

        # Customer orders: `days=30|90|…` limits by order_date; `days=0` or `lifetime` = no date filter (full history).
        days_raw = (request.query_params.get('days') or '90').strip().lower()
        order_since = None
        if days_raw in ('0', 'lifetime', 'all', 'full'):
            order_since = None
        else:
            try:
                order_days = int(days_raw)
            except (TypeError, ValueError):
                order_days = 90
            order_days = max(1, min(order_days, 3660))
            order_since = timezone.now() - timedelta(days=order_days)

        customer_orders = []
        enriched_pos = []
        store_commission = {}
        product_updates = []
        shipped_total_count = 0
        try:
            row_limit = int(request.query_params.get('limit') or 5000)
        except (TypeError, ValueError):
            row_limit = 5000
        row_limit = max(20, min(row_limit, 30000))
        cache_key = f'warehouse:stock_movements:v6:{section}:{days_raw}:{row_limit}'
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        # 1. Customer orders (scoped by selected period in DB — not filtered only on the client)
        # Include all statuses except Cancelled — stock is deducted when order is placed
        active_statuses = OrderStatus.objects.exclude(name='Cancelled')
        if section in ('all', 'shipped_orders') and active_statuses.exists():
            status_ids = list(active_statuses.values_list('id', flat=True))
            order_q = Q(order_status_id__in=status_ids)
            if order_since is not None:
                order_q &= Q(order_date__gte=order_since)
            orders_qs = Order.objects.filter(order_q)
            shipped_total_count = orders_qs.count()
            orders = (
                orders_qs
                .select_related('customer', 'order_status', 'address')
                .prefetch_related(
                    'details__product__supplier',
                    'payments__method',
                )
                .order_by('-order_date', '-id')[:row_limit]
            )
            for o in orders:
                items = []
                for d in o.details.all():
                    try:
                        product = display_product_for_detail(d)
                    except Product.DoesNotExist:
                        product = None

                    product_id = product.id if product else d.product_id
                    product_name = product.name if product else f'Product #{d.product_id}'
                    store_name = _line_item_store_name(product, d.product_id)
                    unit_price = d.unit_price or 0
                    items.append({
                        'product_name': product_name,
                        'quantity': d.quantity,
                        'unit_price': float(unit_price),
                        'total_price': float(d.quantity * unit_price),
                        'product_id': product_id,
                        'variant_id': d.variant_id,
                        'store_name': store_name,
                    })
                pay_list = list(o.payments.all())
                payment = pay_list[0] if pay_list else None
                # Derive store name from the products in this order
                store_names = list(dict.fromkeys(
                    i['store_name'] for i in items if i.get('store_name')
                ))
                store_label = ', '.join(store_names) if store_names else 'No store on line items'

                shipping_cost = float(getattr(o, 'shipping_cost', 200))
                display_total = sum(i['total_price'] for i in items)

                customer_orders.append({
                    'id': o.id,
                    'order_number': o.order_number,
                    'status': o.order_status.name if o.order_status else '',
                    'customer_name': f"{o.customer.first_name} {o.customer.last_name}",
                    'user_email': o.customer.email,
                    'user_phone': o.customer.phone,
                    'shipping_address': (
                        f"{o.address.street}, {o.address.city}, "
                        f"{o.address.province}, {o.address.country}"
                        if o.address else 'N/A'
                    ),
                    'total_amount': display_total,
                    'grand_total': display_total + float(shipping_cost or 0),
                    'shipping_cost': shipping_cost,
                    'store_name': store_label,
                    'date': o.updated_at.isoformat() if o.updated_at else '',
                    'order_date': o.order_date.isoformat() if o.order_date else '',
                    'items': items,
                    'items_count': len(items),
                    'payment_method': payment.method.name if payment and payment.method else 'N/A',
                    'payment_status': (
                        'Completed'
                        if payment and payment.method and payment.method.name not in ('Cash', 'Cash on Delivery', 'COD')
                        else 'Completed'
                        if payment and payment.method and payment.method.name in ('Cash', 'Cash on Delivery', 'COD') and (o.order_status and o.order_status.name == 'Delivered')
                        else 'Pending'
                    ),
                })

        if section in ('all', 'purchase_orders'):
            all_pos_qs = PurchaseOrder.objects.all()
            if order_since is not None:
                all_pos_qs = all_pos_qs.filter(created_at__gte=order_since)

            all_pos = (
                all_pos_qs
                .select_related('supplier', 'order_status')
                .prefetch_related('details__product__supplier')
                .order_by('-created_at')[:50]
            )

            # Commission logic:
            #   Normal shipping  → 10% of product selling_price + shipping_cost
            #   Free shipping    → 12% of product selling_price
            store_commission = {}  # { store_name: { product_revenue, shipping_revenue, commission, orders } }

            for po in all_pos:
                po_items = []
                po_product_ids = []
                for d in po.details.all():
                    product = display_product_for_purchase_detail(d)
                    po_product_ids.append(product.id)
                    po_items.append({
                        'product_id': product.id,
                        'product_name': product.name,
                        'product_image': product.image_url or '',
                        'product_owner': _line_item_store_name(product, d.product_id),
                        'product_price': float(product.selling_price),
                        'quantity': d.quantity,
                        'unit_cost': float(product.cost_price),
                        'total_cost': float(d.quantity * product.cost_price),
                    })

                # Find originating customer order: Order with same products, created close to PO
                originating_order = None
                customer_name = 'N/A'
                order_number = ''
                order_id = None
                order_status_name = ''
                shipping_cost = 0.0
                order_total = 0.0
                commission_items = []

                if po_product_ids:
                    # Look for the most recent order containing any of these products within ±1 day
                    window_start = po.created_at - timedelta(days=1)
                    window_end = po.created_at + timedelta(days=1)
                    candidate = (
                        Order.objects
                        .filter(
                            details__product_id__in=po_product_ids,
                            order_date__range=(window_start, window_end)
                        )
                        .select_related('customer', 'order_status')
                        .order_by('-order_date')
                        .first()
                    )
                    if candidate:
                        originating_order = candidate
                        customer_name = f"{candidate.customer.first_name} {candidate.customer.last_name}"
                        order_number = candidate.order_number
                        order_id = candidate.id
                        order_status_name = candidate.order_status.name if candidate.order_status else ''
                        shipping_cost = float(getattr(candidate, 'shipping_cost', 0) or 0)
                        order_total = 0.0
                        for detail in candidate.details.select_related('product__category', 'product__supplier').all():
                            product = display_product_for_detail(detail)
                            unit_price = detail.unit_price or 0
                            line_total = float(unit_price * detail.quantity)
                            order_total += line_total
                            commission_items.append({
                                'product_owner': _line_item_store_name(product, detail.product_id),
                                'quantity': detail.quantity,
                                'line_total': line_total,
                            })

                po_status = po.order_status.name if po.order_status else 'Unknown'
                store_names_in_po = list(dict.fromkeys(
                    i['product_owner'] for i in po_items if i.get('product_owner')
                ))
                store_label = ', '.join(store_names_in_po) if store_names_in_po else 'No store on line items'

                enriched_pos.append({
                    'id': po.id,
                    'supplier_name': po.supplier.name if po.supplier else '',
                    'status_name': po_status,
                    'total_amount': float(po.total_amount or 0),
                    'order_date': po.order_date.isoformat() if po.order_date else '',
                    'store_name': store_label,
                    # Originating customer order info
                    'customer_name': customer_name,
                    'customer_order_id': order_id,
                    'customer_order_number': order_number,
                    'customer_order_status': order_status_name,
                    'shipping_cost': shipping_cost,
                    'order_total': order_total,
                    'items': po_items,
                    'items_count': len(po_items),
                })

                # Commission calculation per store — only for Shipped or Delivered orders
                if order_status_name in ('Shipped', 'Delivered'):
                    is_free_shipping = shipping_cost == 0
                    commission_source = commission_items or [
                        {
                            'product_owner': item['product_owner'],
                            'quantity': item['quantity'],
                            'line_total': item['product_price'] * item['quantity'],
                        }
                        for item in po_items
                    ]
                    for item in commission_source:
                        sname = item['product_owner'] or 'Unassigned'
                        if sname not in store_commission:
                            store_commission[sname] = {
                                'product_revenue': 0.0,
                                'shipping_revenue': 0.0,
                                'commission': 0.0,
                                'free_shipping_commission': 0.0,
                                'orders': 0,
                            }
                        item_total = item['line_total']
                        store_commission[sname]['product_revenue'] += item_total
                        store_commission[sname]['orders'] += 1

                        if is_free_shipping:
                            # 12% of product price if free shipping
                            comm = item_total * 0.12
                            store_commission[sname]['free_shipping_commission'] += comm
                            store_commission[sname]['commission'] += comm
                        else:
                            # 10% of product price + shipping per item
                            shipping_per_item = shipping_cost / max(len(commission_source), 1)
                            comm = item_total * 0.10 + shipping_per_item
                            store_commission[sname]['shipping_revenue'] += shipping_per_item
                            store_commission[sname]['commission'] += comm

        # Round commission values
        for sname in store_commission:
            for k in store_commission[sname]:
                if isinstance(store_commission[sname][k], float):
                    store_commission[sname][k] = round(store_commission[sname][k], 2)

        # 3. Recently updated products (stock changes by owners)
        if section in ('all', 'product_updates'):
            recent_products_qs = Product.objects.exclude(category__name='Legacy Catalog')
            if order_since is not None:
                recent_products_qs = recent_products_qs.filter(updated_at__gte=order_since)

            recent_products = (
                recent_products_qs
                .select_related('category')
                .order_by('-updated_at')[:20]
            )
            product_updates = [{
                'id': p.id,
                'name': p.name,
                'owner_name': p.owner_name or '',
                'stock': p.stock,
                'reorder_level': p.reorder_level,
                'category': p.category.name if p.category else '',
                'date': p.updated_at.isoformat() if p.updated_at else '',
            } for p in recent_products]

        # Aggregate shipping cost by store
        store_shipping_summary = {}
        for ord_data in customer_orders:
            store = ord_data.get('store_name', 'Unknown Store')
            store_shipping_summary[store] = (
                store_shipping_summary.get(store, 0) + ord_data.get('shipping_cost', 0)
            )

        data = {
            'shipped_orders': customer_orders,
            'enriched_purchase_orders': enriched_pos,
            'product_updates': product_updates,
            'store_shipping_summary': store_shipping_summary,
            'store_commission': store_commission,
            'total_counts': {
                'shipped_orders': shipped_total_count if section in ('all', 'shipped_orders') else len(customer_orders),
                'enriched_purchase_orders': len(enriched_pos),
                'product_updates': len(product_updates),
            },
            'limits': {
                'row_limit': row_limit,
            },
        }
        cache.set(cache_key, data, 90)
        return Response(data)
