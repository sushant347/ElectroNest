from rest_framework import viewsets, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.db.models import Sum, Count, F
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta

from .models import PurchaseOrder, PurchaseOrderDetail
from .serializers import PurchaseOrderSerializer, PurchaseOrderDetailSerializer
from products.models import Product, Supplier
from orders.models import Order, OrderStatus, OrderDetail
from admin_panel.models import AuditLog


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
        total_products    = Product.objects.count()
        total_stock       = Product.objects.aggregate(t=Sum('stock'))['t'] or 0
        low_stock_count   = Product.objects.filter(stock__lte=F('reorder_level')).count()
        pending_pos       = PurchaseOrder.objects.filter(order_status__name='Pending').count()

        low_stock_items = list(Product.objects.filter(
            stock__lte=F('reorder_level')
        ).select_related('category')[:10])

        low_stock_data = [{
            'id': p.id,
            'name': p.name,
            'sku': p.sku,
            'stock': p.stock,
            'reorder_level': p.reorder_level,
            'category_name': p.category.name if p.category else '',
            'brand': p.brand,
        } for p in low_stock_items]

        recent_pos = PurchaseOrder.objects.select_related(
            'supplier', 'order_status'
        ).order_by('-created_at')[:10]

        # Recent customer orders (Pending/Processing) that warehouse needs to handle
        recent_customer_orders = []
        pending_processing = (
            Order.objects
            .filter(order_status__name__in=['Pending', 'Processing'])
            .select_related('customer', 'order_status')
            .annotate(detail_count=Count('details'))
            .filter(detail_count__gt=0)
            .order_by('-order_date')[:10]
        )
        for o in pending_processing:
            items = []
            for d in o.details.select_related('product')[:5]:
                try:
                    items.append({
                        'product_name': d.product.name,
                        'quantity': d.quantity,
                        'product_id': d.product.id,
                    })
                except Exception:
                    items.append({
                        'product_name': f'Product #{d.product_id}',
                        'quantity': d.quantity,
                        'product_id': d.product_id,
                    })
            recent_customer_orders.append({
                'id': o.id,
                'order_number': o.order_number,
                'status': o.order_status.name if o.order_status else '',
                'customer_name': f"{o.customer.first_name} {o.customer.last_name}",
                'total_amount': float(o.total_amount),
                'date': o.order_date.isoformat() if o.order_date else '',
                'items': items,
                'items_count': o.detail_count,
            })

        # Shipped orders ready to deliver (only those with order details)
        ready_to_deliver = []
        shipped_orders = (
            Order.objects
            .filter(order_status__name='Shipped')
            .select_related('customer', 'order_status')
            .annotate(detail_count=Count('details'))
            .filter(detail_count__gt=0)
            .order_by('-updated_at')[:10]
        )
        for o in shipped_orders:
            items = []
            for d in o.details.select_related('product')[:5]:
                try:
                    items.append({
                        'product_name': d.product.name,
                        'quantity': d.quantity,
                        'product_id': d.product.id,
                    })
                except Exception:
                    items.append({
                        'product_name': f'Product #{d.product_id}',
                        'quantity': d.quantity,
                        'product_id': d.product_id,
                    })
            ready_to_deliver.append({
                'id': o.id,
                'order_number': o.order_number,
                'status': o.order_status.name if o.order_status else '',
                'customer_name': f"{o.customer.first_name} {o.customer.last_name}",
                'total_amount': float(o.total_amount),
                'date': o.updated_at.isoformat() if o.updated_at else '',
                'items': items,
                'items_count': o.detail_count,
            })

        # Count of shipped orders ready to deliver
        shipped_count = Order.objects.filter(
            order_status__name='Shipped'
        ).annotate(detail_count=Count('details')).filter(detail_count__gt=0).count()

        return Response({
            'total_products':   total_products,
            'total_stock':      total_stock,
            'low_stock_count':  low_stock_count,
            'pending_purchase_orders': pending_pos,
            'low_stock_items':  low_stock_data,
            'recent_purchase_orders': PurchaseOrderSerializer(recent_pos, many=True).data,
            'recent_customer_orders': recent_customer_orders,
            'ready_to_deliver': ready_to_deliver,
            'shipped_count': shipped_count,
        })


class StockMovementsView(APIView):
    """Return recent stock movements: shipped orders, received POs, and recently added/updated products."""
    permission_classes = [IsWarehouseOrOwner]

    def get(self, request):
        since = timezone.now() - timedelta(days=30)

        # 1. All customer orders (stock went OUT on creation)
        # Include all statuses except Cancelled — stock is deducted when order is placed
        active_statuses = OrderStatus.objects.exclude(name='Cancelled')
        customer_orders = []
        if active_statuses.exists():
            status_ids = list(active_statuses.values_list('id', flat=True))
            orders = (
                Order.objects
                .filter(order_status_id__in=status_ids, updated_at__gte=since)
                .select_related('customer', 'order_status', 'address')
                .prefetch_related('details__product')
                .order_by('-updated_at')[:20]
            )
            from orders.models import Payment
            for o in orders:
                items = []
                for d in o.details.all():
                    items.append({
                        'product_name': d.product.name,
                        'quantity': d.quantity,
                        'unit_price': float(d.unit_price),
                        'total_price': float(d.quantity * d.unit_price),
                        'product_id': d.product.id,
                        'store_name': (d.product.owner_name or 'Unknown Store').strip(),
                    })
                payment = Payment.objects.filter(order_id=o.id).select_related('method').first()
                # Derive store name from the products in this order
                store_names = list(dict.fromkeys(
                    i['store_name'] for i in items if i.get('store_name')
                ))
                store_label = ', '.join(store_names) if store_names else 'Unknown Store'

                shipping_cost = float(getattr(o, 'shipping_cost', 200))

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
                    'total_amount': float(o.total_amount),
                    'grand_total': float(o.total_amount) + float(shipping_cost or 0),
                    'shipping_cost': shipping_cost,
                    'store_name': store_label,
                    'date': o.updated_at.isoformat() if o.updated_at else '',
                    'items': items,
                    'items_count': len(items),
                    'payment_method': payment.method.name if payment and payment.method else 'N/A',
                    'payment_status': 'Completed' if payment else 'Pending',
                })

        # 2. Enriched Purchase Orders with customer info, shipping, commission
        from datetime import timedelta as td
        all_pos = (
            PurchaseOrder.objects
            .filter(created_at__gte=since)
            .select_related('supplier', 'order_status')
            .prefetch_related('details__product')
            .order_by('-created_at')[:50]
        )

        enriched_pos = []
        # Commission logic:
        #   Normal shipping  → 10% of product selling_price + shipping_cost
        #   Free shipping    → 12% of product selling_price
        store_commission = {}  # { store_name: { product_revenue, shipping_revenue, commission, orders } }

        for po in all_pos:
            po_items = []
            po_product_ids = []
            for d in po.details.all():
                po_product_ids.append(d.product.id)
                po_items.append({
                    'product_id': d.product.id,
                    'product_name': d.product.name,
                    'product_image': d.product.image_url or '',
                    'product_owner': (d.product.owner_name or '').strip(),
                    'product_price': float(d.product.selling_price),
                    'quantity': d.quantity,
                    'unit_cost': float(d.unit_cost),
                    'total_cost': float(d.quantity * d.unit_cost),
                })

            # Find originating customer order: Order with same products, created close to PO
            originating_order = None
            customer_name = 'N/A'
            order_number = ''
            order_id = None
            order_status_name = ''
            shipping_cost = 0.0
            order_total = 0.0

            if po_product_ids:
                # Look for the most recent order containing any of these products within ±1 day
                window_start = po.created_at - td(days=1)
                window_end = po.created_at + td(days=1)
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
                    order_total = float(candidate.total_amount)

            po_status = po.order_status.name if po.order_status else 'Unknown'
            store_names_in_po = list(dict.fromkeys(
                i['product_owner'] for i in po_items if i.get('product_owner')
            ))
            store_label = ', '.join(store_names_in_po) if store_names_in_po else 'Unknown Store'

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

            # Commission calculation per store
            is_free_shipping = shipping_cost == 0
            for item in po_items:
                sname = item['product_owner'] or 'Unknown Store'
                if sname not in store_commission:
                    store_commission[sname] = {
                        'product_revenue': 0.0,
                        'shipping_revenue': 0.0,
                        'commission': 0.0,
                        'free_shipping_commission': 0.0,
                        'orders': 0,
                    }
                item_total = item['product_price'] * item['quantity']
                store_commission[sname]['product_revenue'] += item_total
                store_commission[sname]['orders'] += 1

                if is_free_shipping:
                    # 12% of product price if free shipping
                    comm = item_total * 0.12
                    store_commission[sname]['free_shipping_commission'] += comm
                    store_commission[sname]['commission'] += comm
                else:
                    # 10% of product price + shipping per item
                    shipping_per_item = shipping_cost / max(len(po_items), 1)
                    comm = item_total * 0.10 + shipping_per_item
                    store_commission[sname]['shipping_revenue'] += shipping_per_item
                    store_commission[sname]['commission'] += comm

        # Round commission values
        for sname in store_commission:
            for k in store_commission[sname]:
                if isinstance(store_commission[sname][k], float):
                    store_commission[sname][k] = round(store_commission[sname][k], 2)

        # 3. Recently updated products (stock changes by owners)
        recent_products = (
            Product.objects
            .filter(updated_at__gte=since)
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

        return Response({
            'shipped_orders': customer_orders,
            'enriched_purchase_orders': enriched_pos,
            'product_updates': product_updates,
            'store_shipping_summary': store_shipping_summary,
            'store_commission': store_commission,
        })