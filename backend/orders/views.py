from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.db import transaction
from decimal import Decimal
import uuid

from .models import (Order, OrderDetail, OrderStatus, Cart, Wishlist,
                     Review, PaymentMethod, Payment, Notification, CompareList, Coupon, CouponUsage)
from .serializers import (OrderSerializer, CartSerializer,
                          WishlistSerializer, ReviewSerializer,
                          PaymentMethodSerializer, PaymentSerializer,
                          NotificationSerializer, OrderStatusSerializer,
                          CompareListSerializer, CouponSerializer, CouponUsageSerializer)
from products.models import Product, Customer
from accounts.models import CustomUser
from accounts.models import CustomerAddress
from admin_panel.models import AuditMixin, AuditLog


class OrderViewSet(AuditMixin, viewsets.ModelViewSet):
    serializer_class   = OrderSerializer
    permission_classes = [IsAuthenticated]

    def _notify_owners(self, order):
        """Send an in-app notification to each product owner who has items in this order."""
        from collections import defaultdict
        from django.db.models import Value
        from django.db.models.functions import Concat

        owner_products = defaultdict(list)
        for detail in order.details.select_related('product').all():
            owner_name_str = (detail.product.owner_name or '').strip()
            if owner_name_str:
                owner_products[owner_name_str].append(detail.product.name)

        for owner_name_str, product_names in owner_products.items():
            # Match by full name (first_name + ' ' + last_name) to handle multi-word first names
            owner_user = (
                CustomUser.objects
                .filter(role='owner')
                .annotate(full_name=Concat('first_name', Value(' '), 'last_name'))
                .filter(full_name__iexact=owner_name_str)
                .first()
            )
            # Fallback: try partial match on last_name
            if not owner_user:
                parts = owner_name_str.split()
                if parts:
                    owner_user = CustomUser.objects.filter(
                        role='owner', last_name__iexact=parts[-1]
                    ).first()
            if owner_user:
                preview = ', '.join(product_names[:3])
                if len(product_names) > 3:
                    preview += f' +{len(product_names)-3} more'
                Notification.objects.create(
                    recipient = owner_user,
                    title     = f'New Order #{order.order_number}',
                    message   = f'Order placed for: {preview}. Total: NPR {order.total_amount}',
                    type      = 'order_update',
                )

    @staticmethod
    def _auto_restock_pos(restock_needed):
        """
        Auto-create PurchaseOrders for every product in a customer order.

        restock_needed: list of Product instances (already saved with new stock).
        - A PO is generated for EVERY purchased product (not only when below reorder_level).
        - Groups products by their FK supplier.
        - Skips products that have no supplier.
        - Skips products that already have a Pending PO detail (avoids duplicates).
        - Reorder qty = max(1, reorder_level * 2 - current_stock) i.e. restock
          up to 2x the reorder_level.
        - unit_cost is taken from product.cost_price.
        """
        if not restock_needed:
            return

        # Lazy imports to avoid circular dependency
        from warehouse.models import PurchaseOrder as PO, PurchaseOrderDetail as POD
        from django.db.models import Q

        pending_status, _ = OrderStatus.objects.get_or_create(name='Pending')

        # Find which products already have an open (Pending) PO detail
        # so we don't create duplicate restock orders
        already_pending_ids = set(
            POD.objects.filter(
                purchase_order__order_status__name='Pending',
                product_id__in=[p.id for p in restock_needed],
            ).values_list('product_id', flat=True)
        )

        # Group by supplier — products with supplier=None are skipped
        from collections import defaultdict
        by_supplier = defaultdict(list)
        for product in restock_needed:
            if product.supplier_id and product.id not in already_pending_ids:
                by_supplier[product.supplier_id].append(product)

        for supplier_id, products in by_supplier.items():
            total = sum(
                product.cost_price * max(1, product.reorder_level * 2 - product.stock)
                for product in products
            )
            po = PO.objects.create(
                supplier_id  = supplier_id,
                total_amount = total,
                order_status = pending_status,
            )
            for product in products:
                reorder_qty = max(1, product.reorder_level * 2 - product.stock)
                POD.objects.create(
                    purchase_order = po,
                    product        = product,
                    quantity       = reorder_qty,
                    unit_cost      = product.cost_price,
                )
            AuditLog.log_action(
                action='INSERT',
                table_name='PurchaseOrders',
                record_id=po.id,
                new_values={
                    'auto_generated': True,
                    'supplier_id': supplier_id,
                    'total_amount': str(total),
                    'reason': 'Stock dropped to/below reorder level after customer purchase',
                    'products': [p.name for p in products],
                },
            )

    @staticmethod
    def _compute_shipping(addr, coupon_applies, coupon):
        """Compute shipping cost for an order matching Checkout.jsx logic.
        Nepal = NPR 200, India = NPR 3500. Free-delivery coupon → 0."""
        if coupon_applies and coupon is not None and getattr(coupon, 'free_delivery', False):
            return Decimal('0')
        if addr and (addr.country or '').strip().lower() == 'india':
            return Decimal('3500')
        return Decimal('200')

    def _resolve_address(self, customer, address_id, form_data):
        """Return a CustomerAddress for this customer.
        Prefers an existing address by ID; reuses matching address; auto-creates only if truly new."""
        if address_id:
            addr = CustomerAddress.objects.filter(id=address_id, customer=customer).first()
            if addr:
                return addr

        city   = form_data.get('city', '')
        street = form_data.get('street', '') or form_data.get('address', '')
        if not city:
            return None

        # Try to reuse an existing address with the same street+city
        existing = CustomerAddress.objects.filter(
            customer=customer, street=street, city=city, address_type='Shipping'
        ).first()
        if existing:
            return existing

        return CustomerAddress.objects.create(
            customer     = customer,
            street       = street,
            city         = city,
            province     = form_data.get('province', ''),
            postal_code  = form_data.get('postal_code', ''),
            country      = form_data.get('country', 'Nepal'),
            address_type = 'Shipping',
        )

    def get_queryset(self):
        from django.db.models import Prefetch
        user = self.request.user
        payments_prefetch = Prefetch('payments', queryset=Payment.objects.select_related('method'))
        if isinstance(user, CustomUser):
            # Owner: see only orders that contain their products
            # AND only prefetch the details belonging to this owner
            if user.role == 'owner':
                store_name = f"{user.first_name} {user.last_name}".strip()
                own_details = OrderDetail.objects.filter(
                    product__owner_name__icontains=store_name
                ).select_related('product')
                return (
                    Order.objects
                    .filter(details__product__owner_name__icontains=store_name)
                    .distinct()
                    .select_related('order_status', 'customer', 'address')
                    .prefetch_related(Prefetch('details', queryset=own_details), payments_prefetch)
                )
            # Admin / warehouse: see all orders — deduplicate details
            return (
                Order.objects
                .select_related('order_status', 'customer', 'address')
                .prefetch_related(
                    Prefetch('details', queryset=OrderDetail.objects.select_related('product').order_by('product_id', 'id').distinct()),
                    payments_prefetch,
                ).all()
            )
        # Customers: see only their own orders — deduplicate details
        return (
            Order.objects.filter(customer=user)
            .select_related('order_status', 'address')
            .prefetch_related(
                Prefetch('details', queryset=OrderDetail.objects.select_related('product').order_by('product_id', 'id').distinct()),
                payments_prefetch,
            )
        )

    @transaction.atomic
    def create(self, request):
        try:
            customer = request.user
            if isinstance(customer, CustomUser):
                return Response(
                    {'detail': 'Staff accounts cannot place customer orders.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Update customer phone if provided in the request
            phone = request.data.get('phone', '').strip()
            if phone and phone != customer.phone:
                customer.phone = phone
                customer.save(update_fields=['phone'])

            # Accept items directly from frontend OR fall back to cart
            items_data = request.data.get('items', None)

            # Resolve address — AddressType on the CustomerAddress row tells us Shipping vs Billing
            addr = self._resolve_address(
                customer,
                request.data.get('address_id'),
                request.data,
            )

            # Resolve coupon if provided
            coupon = None
            coupon_code = (request.data.get('coupon_code') or '').strip()
            if coupon_code:
                try:
                    coupon = Coupon.objects.get(code__iexact=coupon_code)
                    if not coupon.is_valid:
                        coupon = None
                except Coupon.DoesNotExist:
                    coupon = None

            if items_data and isinstance(items_data, list) and len(items_data) > 0:
                # Create order from provided items list
                # First merge duplicate product_ids (sum quantities)
                from collections import defaultdict
                merged = {}
                for item_data in items_data:
                    pid = item_data.get('product_id') or item_data.get('id')
                    qty = int(item_data.get('quantity', 1))
                    if pid in merged:
                        merged[pid] += qty
                    else:
                        merged[pid] = qty

                # Validate all products and group by store
                items_by_store = defaultdict(list)
                for product_id, quantity in merged.items():
                    try:
                        product = Product.objects.get(id=product_id)
                    except Product.DoesNotExist:
                        return Response(
                            {'detail': f'Product {product_id} not found'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    if product.stock < quantity:
                        return Response(
                            {'detail': f'Not enough stock for {product.name}'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    # Group by owner_name (store)
                    store_key = (product.owner_name or 'Unknown Store').strip()
                    items_by_store[store_key].append((product, quantity))

                pending_status, _ = OrderStatus.objects.get_or_create(name='Pending')
                method_id = request.data.get('method_id')
                created_orders = []

                # Create one order per store
                for store_name, order_items in items_by_store.items():
                    store_total = sum(p.selling_price * q for p, q in order_items)

                    # Calculate discount before creating the order so total_amount is correct
                    coupon_applies = (
                        coupon is not None and (
                            coupon.owner_id is None or
                            (coupon.owner_store_name or '').strip().lower() == store_name.lower()
                        )
                    )
                    discount = Decimal(str(coupon.discount_percent)) if coupon_applies else Decimal('0')
                    payable = store_total * (1 - discount / 100)
                    if coupon_applies and coupon.max_discount and store_total - payable > coupon.max_discount:
                        payable = store_total - coupon.max_discount

                    shipping_cost = self._compute_shipping(addr, coupon_applies, coupon)

                    order = Order.objects.create(
                        order_number  = f'ORD-{uuid.uuid4().hex[:8].upper()}',
                        customer      = customer,
                        order_status  = pending_status,
                        total_amount  = payable,
                        shipping_cost = shipping_cost,
                        address       = addr,
                    )

                    order_items_log = []
                    restock_needed_store = []
                    for product, quantity in order_items:
                        old_stock = product.stock
                        OrderDetail.objects.create(
                            order      = order,
                            product    = product,
                            quantity   = quantity,
                            unit_price = product.selling_price,
                        )
                        product.stock      -= quantity
                        product.units_sold += quantity
                        product.save()
                        # Always add to restock list — auto-PO created for every customer purchase
                        restock_needed_store.append(product)
                        AuditLog.log_action(
                            action='UPDATE',
                            table_name='Products',
                            record_id=product.id,
                            old_values={'stock': old_stock, 'product': product.name},
                            new_values={'stock': product.stock, 'product': product.name,
                                        'deducted': quantity, 'source': f'Order #{order.order_number}'},
                        )
                        order_items_log.append({'product': product.name, 'quantity': quantity,
                                                'unit_price': str(product.selling_price)})

                    AuditLog.log_action(
                        action='INSERT',
                        table_name='Orders',
                        record_id=order.id,
                        new_values={'order_number': order.order_number,
                                    'customer_id': customer.id,
                                    'total_amount': str(payable),
                                    'store': store_name,
                                    'items': order_items_log},
                    )

                    # Create payment if method provided
                    if method_id:
                        try:
                            method = PaymentMethod.objects.get(id=method_id)
                            Payment.objects.create(
                                order            = order,
                                method           = method,
                                discount_percent = discount,
                                payable_amount   = payable,
                            )
                        except PaymentMethod.DoesNotExist:
                            pass

                    # Notify product owners for this order
                    self._notify_owners(order)
                    # Auto-create restock POs for products that hit/crossed reorder_level
                    self._auto_restock_pos(restock_needed_store)
                    created_orders.append(order)

                # Record coupon usage (per-customer table + global counter)
                if coupon:
                    coupon.used_count += 1
                    coupon.save(update_fields=['used_count'])
                    CouponUsage.objects.create(
                        coupon=coupon,
                        customer=customer,
                        order=created_orders[0] if created_orders else None,
                    )

                # Clear cart for these products
                all_products = [p for items in items_by_store.values() for p, q in items]
                Cart.objects.filter(
                    customer=customer,
                    product__in=all_products
                ).delete()

                # Return the first order (or could return all orders)
                return Response(OrderSerializer(created_orders[0] if created_orders else None).data, status=status.HTTP_201_CREATED)

            # Fall back to cart-based checkout
            cart_items = Cart.objects.filter(customer=customer).select_related('product')
            if not cart_items.exists():
                return Response({'detail': 'Cart is empty. Please add items to your cart first.'}, status=status.HTTP_400_BAD_REQUEST)

            # Check stock
            for item in cart_items:
                if item.product.stock < item.order_count:
                    return Response(
                        {'detail': f'Not enough stock for {item.product.name}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Calculate total
            total_amount = sum(item.product.selling_price * item.order_count for item in cart_items)

            # Calculate discount before creating the order so total_amount is correct
            discount = Decimal(str(coupon.discount_percent)) if coupon else Decimal('0')
            payable = total_amount * (1 - discount / 100)
            if coupon and coupon.max_discount and total_amount - payable > coupon.max_discount:
                payable = total_amount - coupon.max_discount

            # Get or create Pending status
            pending_status, _ = OrderStatus.objects.get_or_create(name='Pending')

            shipping_cost = self._compute_shipping(
                addr,
                coupon is not None,  # for cart-path, coupon always applies if present
                coupon,
            )

            order = Order.objects.create(
                order_number  = f'ORD-{uuid.uuid4().hex[:8].upper()}',
                customer      = customer,
                order_status  = pending_status,
                total_amount  = payable,
                shipping_cost = shipping_cost,
                address       = addr,
            )

            cart_items_log = []
            restock_needed_cart = []
            for item in cart_items:
                old_stock = item.product.stock
                OrderDetail.objects.create(
                    order      = order,
                    product    = item.product,
                    quantity   = item.order_count,
                    unit_price = item.product.selling_price,
                )
                # Deduct stock & update units_sold
                item.product.stock      -= item.order_count
                item.product.units_sold += item.order_count
                item.product.save()
                # Always add to restock list — auto-PO created for every customer purchase
                restock_needed_cart.append(item.product)
                AuditLog.log_action(
                    action='UPDATE',
                    table_name='Products',
                    record_id=item.product.id,
                    old_values={'stock': old_stock, 'product': item.product.name},
                    new_values={'stock': item.product.stock, 'product': item.product.name,
                                'deducted': item.order_count, 'source': f'Order #{order.order_number}'},
                )
                cart_items_log.append({'product': item.product.name, 'quantity': item.order_count,
                                       'unit_price': str(item.product.selling_price)})

            AuditLog.log_action(
                action='INSERT',
                table_name='Orders',
                record_id=order.id,
                new_values={'order_number': order.order_number,
                            'customer_id': customer.id,
                            'total_amount': str(payable),
                            'items': cart_items_log},
            )

            # Create payment if method provided
            method_id = request.data.get('method_id')
            if method_id:
                try:
                    method = PaymentMethod.objects.get(id=method_id)
                    Payment.objects.create(
                        order            = order,
                        method           = method,
                        discount_percent = discount,
                        payable_amount   = payable,
                    )
                except PaymentMethod.DoesNotExist:
                    pass

            # Increment coupon usage
            if coupon:
                coupon.used_count += 1
                coupon.save(update_fields=['used_count'])

            # Clear cart
            cart_items.delete()

            # Notify product owners
            self._notify_owners(order)
            # Auto-create restock POs for products that hit/crossed reorder_level
            self._auto_restock_pos(restock_needed_cart)

            return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['patch'], url_path='cancel')
    @transaction.atomic
    def cancel(self, request, pk=None):
        order = self.get_object()
        cancelled_status = OrderStatus.objects.filter(name='Cancelled').first()

        if not order.order_status or order.order_status.name != 'Pending':
            return Response({'detail': 'Only pending orders can be cancelled'},
                            status=status.HTTP_400_BAD_REQUEST)

        restored = []
        for detail in order.details.all():
            old_stock = detail.product.stock
            detail.product.stock      += detail.quantity
            detail.product.units_sold -= detail.quantity
            detail.product.save()
            AuditLog.log_action(
                action='UPDATE',
                table_name='Products',
                record_id=detail.product.id,
                user=request.user,
                old_values={'stock': old_stock, 'product': detail.product.name},
                new_values={'stock': detail.product.stock, 'product': detail.product.name,
                            'restored': detail.quantity, 'source': f'Cancelled Order #{order.order_number}'},
            )
            restored.append({'product': detail.product.name, 'quantity': detail.quantity})

        order.order_status = cancelled_status
        order.save()

        AuditLog.log_action(
            action='UPDATE',
            table_name='Orders',
            record_id=order.id,
            user=request.user,
            old_values={'status': 'Pending', 'order_number': order.order_number},
            new_values={'status': 'Cancelled', 'stock_restored': restored},
        )

        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['patch'], url_path='update-status')
    def update_status(self, request, pk=None):
        order = self.get_object()
        status_val = request.data.get('order_status')
        if status_val:
            new_status = None
            # Try by ID first
            try:
                new_status = OrderStatus.objects.get(id=int(status_val))
            except (OrderStatus.DoesNotExist, ValueError, TypeError):
                pass
            # Fallback: try by name
            if not new_status:
                new_status = OrderStatus.objects.filter(name=status_val).first()
            if not new_status:
                return Response({'detail': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
            order.order_status = new_status
            order.save()

            # When an order is marked Shipped, notify all warehouse staff
            if new_status.name == 'Shipped':
                warehouse_users = CustomUser.objects.filter(role='warehouse', is_active=True)
                city = order.address.city if order.address else 'customer'
                for wh_user in warehouse_users:
                    Notification.objects.create(
                        recipient=wh_user,
                        sender=request.user if isinstance(request.user, CustomUser) else None,
                        title=f'Order #{order.order_number} Ready to Deliver',
                        message=f'Order #{order.order_number} has been shipped and is ready for delivery to {city}. Items: {order.details.count()}.',
                        type='order_update',
                    )

        tracking = request.data.get('tracking_number')
        if tracking:
            order.tracking_number = tracking
            order.save()
        est_date = request.data.get('estimated_delivery_date')
        if est_date:
            order.estimated_delivery_date = est_date
            order.save()
        return Response(OrderSerializer(order).data)


class OrderStatusViewSet(viewsets.ReadOnlyModelViewSet):
    queryset           = OrderStatus.objects.all()
    serializer_class   = OrderStatusSerializer
    permission_classes = [IsAuthenticated]


class CartViewSet(viewsets.ModelViewSet):
    serializer_class   = CartSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Cart.objects.filter(customer=self.request.user).select_related('product')

    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)

    def create(self, request, *args, **kwargs):
        product_id  = request.data.get('product')
        order_count = int(request.data.get('order_count', 1))
        MAX_QTY = 6
        # Use filter().first() to safely handle any duplicate entries
        existing = Cart.objects.filter(customer=request.user, product_id=product_id)
        item = existing.first()
        if item:
            # Delete extra duplicates if any exist
            existing.exclude(pk=item.pk).delete()
            item.order_count = min(item.order_count + order_count, MAX_QTY)
            item.save()
            return Response(CartSerializer(item).data)
        # Clamp new item quantity
        data = request.data.copy()
        data['order_count'] = min(order_count, MAX_QTY)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=201)

    @action(detail=False, methods=['delete'], url_path='clear')
    def clear(self, request):
        Cart.objects.filter(customer=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class WishlistViewSet(viewsets.ModelViewSet):
    serializer_class   = WishlistSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Wishlist.objects.filter(customer=self.request.user).select_related('product')

    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)


class CompareListViewSet(viewsets.ModelViewSet):
    serializer_class   = CompareListSerializer
    permission_classes = [IsAuthenticated]
    MAX_COMPARE = 3

    def get_queryset(self):
        return CompareList.objects.filter(customer=self.request.user).select_related('product')

    def create(self, request, *args, **kwargs):
        product_id = request.data.get('product')
        # Prevent duplicates
        existing = CompareList.objects.filter(customer=request.user, product_id=product_id).first()
        if existing:
            return Response(CompareListSerializer(existing).data)
        # Enforce max 3 products
        if CompareList.objects.filter(customer=request.user).count() >= self.MAX_COMPARE:
            return Response(
                {'detail': 'You can compare up to 3 products only.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(customer=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['delete'], url_path='clear')
    def clear(self, request):
        CompareList.objects.filter(customer=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class   = ReviewSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        product_id = self.request.query_params.get('product')
        if product_id:
            return Review.objects.filter(product_id=product_id)
        return Review.objects.filter(customer=self.request.user)

    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)


class PaymentMethodViewSet(viewsets.ReadOnlyModelViewSet):
    queryset           = PaymentMethod.objects.all()
    serializer_class   = PaymentMethodSerializer
    permission_classes = [IsAuthenticated]


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class   = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if isinstance(user, CustomUser):
            return Payment.objects.select_related('method', 'order').all()
        # Customer: filter by their orders
        return Payment.objects.filter(order__customer=user).select_related('method', 'order')


class NotificationViewSet(viewsets.ModelViewSet):
    """Notifications are only for staff (owner / admin / warehouse)."""
    serializer_class   = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not isinstance(user, CustomUser):
            return Notification.objects.none()
        return Notification.objects.filter(recipient=user).select_related('sender', 'product')

    @action(detail=True, methods=['patch'], url_path='read')
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save()
        return Response(NotificationSerializer(notif).data)

    @action(detail=False, methods=['patch'], url_path='read-all')
    def mark_all_read(self, request):
        if not isinstance(request.user, CustomUser):
            return Response({'status': 'ok'})
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({'status': 'ok'})

    @action(detail=False, methods=['delete'], url_path='clear-all')
    def clear_all(self, request):
        if not isinstance(request.user, CustomUser):
            return Response({'status': 'ok'})
        Notification.objects.filter(recipient=request.user).delete()
        return Response({'status': 'ok'})


class SendLowStockAlertView(APIView):
    """Warehouse manager sends low-stock notification to the product's owner."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        product_id = request.data.get('product_id')
        if not product_id:
            return Response({'detail': 'product_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({'detail': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

        # Find owner by matching owner_name (full name = first_name + ' ' + last_name)
        owner_name = product.owner_name or ''
        from django.db.models import Value
        from django.db.models.functions import Concat
        owner = (
            CustomUser.objects
            .filter(role='owner')
            .annotate(full_name=Concat('first_name', Value(' '), 'last_name'))
            .filter(full_name__iexact=owner_name.strip())
            .first()
        )
        if not owner:
            parts = owner_name.strip().split()
            if parts:
                owner = CustomUser.objects.filter(role='owner', last_name__iexact=parts[-1]).first()

        if not owner:
            return Response({'detail': f'Could not find owner for "{owner_name}"'}, status=status.HTTP_404_NOT_FOUND)

        notif = Notification.objects.create(
            recipient=owner,
            sender=request.user,
            title=f'Low Stock Alert: {product.name}',
            message=f'{product.name} (SKU: {product.sku}) has only {product.stock} units left (reorder level: {product.reorder_level}). Please restock.',
            type='low_stock',
            product=product,
        )
        return Response(NotificationSerializer(notif).data, status=status.HTTP_201_CREATED)


class CouponViewSet(viewsets.ModelViewSet):
    """CRUD for coupons (owner/admin) + validate/list actions for customers."""
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer

    def get_permissions(self):
        return [IsAuthenticated()]

    def get_queryset(self):
        from django.utils import timezone
        from django.db.models import F, Value
        from django.db.models.functions import Concat
        user = self.request.user

        if isinstance(user, CustomUser):
            if user.role == 'admin':
                # Admins see all coupons
                return Coupon.objects.select_related('owner').order_by('-created_at')
            if user.role == 'owner':
                # Owners see only their own coupons
                return Coupon.objects.filter(owner=user).select_related('owner').order_by('-created_at')

        # Customers: active, non-expired, not exhausted — filtered by store owner name
        if self.action in ('list', 'retrieve'):
            now = timezone.now()
            qs = Coupon.objects.filter(
                is_active=True,
                valid_from__lte=now,
                valid_until__gte=now,
                used_count__lt=F('usage_limit'),
            ).select_related('owner')

            # Optional ?owner_name= filter so customers only see coupons for the store they're viewing
            owner_name = self.request.query_params.get('owner_name', '').strip()
            if owner_name:
                # Return coupons that belong to this specific store OR are platform-wide (owner=null)
                from django.db.models import Q
                qs = qs.annotate(
                    full_name=Concat('owner__first_name', Value(' '), 'owner__last_name')
                ).filter(
                    Q(full_name__iexact=owner_name) | Q(owner__isnull=True)
                )

            return qs.order_by('-created_at')

        return Coupon.objects.none()

    def create(self, request, *args, **kwargs):
        if not (isinstance(request.user, CustomUser) and request.user.role in ('owner', 'admin')):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Admins may pass an explicit owner; owners are auto-assigned to themselves
        if request.user.role == 'owner':
            serializer.save(owner=request.user)
        else:
            serializer.save()
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        if not (isinstance(request.user, CustomUser) and request.user.role in ('owner', 'admin')):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        # Owners can only edit their own coupons
        if request.user.role == 'owner':
            coupon = self.get_object()
            if coupon.owner_id != request.user.id:
                return Response({'detail': 'You can only edit your own coupons.'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not (isinstance(request.user, CustomUser) and request.user.role in ('owner', 'admin')):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        # Owners can only delete their own coupons
        if request.user.role == 'owner':
            coupon = self.get_object()
            if coupon.owner_id != request.user.id:
                return Response({'detail': 'You can only delete your own coupons.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'], url_path='my-usage')
    def my_usage(self, request):
        """Return this customer's coupon usage history."""
        try:
            customer = Customer.objects.get(user=request.user)
        except Customer.DoesNotExist:
            return Response([], status=status.HTTP_200_OK)
        usages = CouponUsage.objects.filter(customer=customer).select_related('coupon', 'order')
        return Response(CouponUsageSerializer(usages, many=True).data)

    @action(detail=False, methods=['post'], url_path='validate')
    def validate(self, request):
        from django.db.models import Value
        from django.db.models.functions import Concat

        code = request.data.get('code', '').strip()
        if not code:
            return Response({'detail': 'Coupon code is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            coupon = Coupon.objects.select_related('owner').get(code__iexact=code)
        except Coupon.DoesNotExist:
            return Response({'detail': 'Invalid coupon code.'}, status=status.HTTP_404_NOT_FOUND)

        if not coupon.is_valid:
            return Response({'detail': 'This coupon has expired or is no longer valid.'}, status=status.HTTP_400_BAD_REQUEST)

        # Store-ownership check: if the coupon belongs to a specific owner, verify
        # the request provides a matching owner_name (the store the customer is buying from)
        owner_name_param = (request.data.get('owner_name') or '').strip()
        if coupon.owner_id:
            coupon_store = coupon.owner_store_name or ''
            if owner_name_param and coupon_store.lower() != owner_name_param.lower():
                return Response(
                    {'detail': 'This coupon is not valid for this store.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Per-customer usage check
        if isinstance(request.user, Customer):
            times_used = CouponUsage.objects.filter(coupon=coupon, customer=request.user).count()
            if times_used >= coupon.per_customer_limit:
                return Response({'detail': 'You have already used this coupon the maximum number of times.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'id': coupon.id,
            'code': coupon.code,
            'discount_percent': float(coupon.discount_percent),
            'max_discount': float(coupon.max_discount) if coupon.max_discount else None,
            'min_order_amount': float(coupon.min_order_amount),
            'free_delivery': coupon.free_delivery,
            'owner_name': coupon.owner_store_name,
        })