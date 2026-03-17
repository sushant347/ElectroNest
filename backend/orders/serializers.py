from rest_framework import serializers
from .models import (Order, OrderDetail, OrderStatus, Cart, Wishlist,
                     Review, PaymentMethod, Payment, Notification, CompareList, Coupon, CouponUsage)
from products.serializers import ProductSerializer
from accounts.serializers import CustomerAddressSerializer


class OrderStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model  = OrderStatus
        fields = '__all__'


class OrderDetailSerializer(serializers.ModelSerializer):
    total_price  = serializers.SerializerMethodField()
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.CharField(source='product.image_url', read_only=True, default='')
    product_detail = ProductSerializer(source='product', read_only=True)

    class Meta:
        model  = OrderDetail
        fields = ['id', 'order', 'product', 'product_name', 'product_image', 'product_detail', 'quantity', 'unit_price', 'total_price']

    def get_total_price(self, obj):
        return float(obj.total_price)


class OrderSerializer(serializers.ModelSerializer):
    details          = serializers.SerializerMethodField()
    status_name      = serializers.CharField(source='order_status.name', read_only=True)
    status           = serializers.CharField(source='order_status.name', read_only=True)
    customer_email   = serializers.CharField(source='customer.email', read_only=True)
    customer_name    = serializers.SerializerMethodField()
    user_name        = serializers.SerializerMethodField()
    user_email       = serializers.CharField(source='customer.email', read_only=True)
    user_phone       = serializers.CharField(source='customer.phone', read_only=True)
    items_count      = serializers.SerializerMethodField()
    grand_total      = serializers.SerializerMethodField()
    shipping_cost    = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    payment_method   = serializers.SerializerMethodField()
    payment_status   = serializers.SerializerMethodField()
    shipping_address_detail = CustomerAddressSerializer(source='address', read_only=True)
    shipping_address = serializers.SerializerMethodField()

    class Meta:
        model  = Order
        fields = '__all__'
        read_only_fields = ['customer', 'order_date', 'order_number', 'created_at', 'updated_at',
                            'address']

    def get_grand_total(self, obj):
        """True grand total = product subtotal + shipping cost."""
        return float((obj.total_amount or 0) + (obj.shipping_cost or 0))

    def get_details(self, obj):
        """Deduplicate order details — keep first row per product_id (handles legacy DB duplicates)."""
        details = obj.details.all()
        seen = set()
        unique = []
        for d in details:
            pid = d.product_id
            if pid not in seen:
                seen.add(pid)
                unique.append(d)
        return OrderDetailSerializer(unique, many=True).data

    def get_customer_name(self, obj):
        return f"{obj.customer.first_name} {obj.customer.last_name}"

    def get_user_name(self, obj):
        return f"{obj.customer.first_name} {obj.customer.last_name}"

    def get_shipping_address(self, obj):
        """Return a formatted address string for display in panels."""
        addr = obj.address
        if not addr:
            return 'N/A'
        parts = [p for p in [addr.street, addr.city, addr.province, addr.country] if p]
        return ', '.join(parts) or 'N/A'

    def get_items_count(self, obj):
        # Deduplicated count
        return len(set(d.product_id for d in obj.details.all()))

    def get_payment_method(self, obj):
        payment = Payment.objects.filter(order=obj).select_related('method').first()
        if payment and payment.method:
            return payment.method.name
        return 'N/A'

    def get_payment_status(self, obj):
        payment = Payment.objects.filter(order=obj).first()
        if payment:
            return 'Completed'
        return 'Pending'


class CartSerializer(serializers.ModelSerializer):
    product_detail = ProductSerializer(source='product', read_only=True)

    class Meta:
        model  = Cart
        fields = ['id', 'product', 'product_detail', 'order_count', 'created_at']


class WishlistSerializer(serializers.ModelSerializer):
    product_detail = ProductSerializer(source='product', read_only=True)

    class Meta:
        model  = Wishlist
        fields = ['id', 'product', 'product_detail', 'added_at']


class CompareListSerializer(serializers.ModelSerializer):
    product_detail = ProductSerializer(source='product', read_only=True)

    class Meta:
        model  = CompareList
        fields = ['id', 'product', 'product_detail', 'added_at']


class ReviewSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()

    class Meta:
        model  = Review
        fields = '__all__'
        read_only_fields = ['customer', 'review_date']

    def get_customer_name(self, obj):
        return f"{obj.customer.first_name} {obj.customer.last_name}"


class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model  = PaymentMethod
        fields = '__all__'


class PaymentSerializer(serializers.ModelSerializer):
    method_name = serializers.CharField(source='method.name', read_only=True)

    class Meta:
        model  = Payment
        fields = '__all__'


class NotificationSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    product_name = serializers.CharField(source='product.name', read_only=True, default=None)

    class Meta:
        model  = Notification
        fields = ['id', 'recipient', 'sender', 'sender_name', 'title', 'message',
                  'type', 'is_read', 'product', 'product_name', 'created_at']
        read_only_fields = ['created_at']

    def get_sender_name(self, obj):
        if obj.sender:
            return f"{obj.sender.first_name} {obj.sender.last_name}"
        return 'System'


class CouponSerializer(serializers.ModelSerializer):
    is_valid            = serializers.BooleanField(read_only=True)
    owner_name          = serializers.SerializerMethodField()
    customer_used_count = serializers.SerializerMethodField()

    class Meta:
        model  = Coupon
        fields = '__all__'
        read_only_fields = ['used_count', 'created_at', 'owner']

    def get_owner_name(self, obj):
        if not obj.owner_id:
            return None
        o = obj.owner
        name = f"{o.first_name} {o.last_name}".strip()
        return name or o.email

    def get_customer_used_count(self, obj):
        """How many times the requesting customer has already used this coupon."""
        request = self.context.get('request')
        if not request:
            return 0
        from products.models import Customer
        if not isinstance(request.user, Customer):
            return 0
        return CouponUsage.objects.filter(coupon=obj, customer=request.user).count()


class CouponUsageSerializer(serializers.ModelSerializer):
    coupon_code     = serializers.CharField(source='coupon.code', read_only=True)
    customer_email  = serializers.CharField(source='customer.email', read_only=True)

    class Meta:
        model  = CouponUsage
        fields = ['id', 'coupon', 'coupon_code', 'customer', 'customer_email', 'order', 'used_at']
        read_only_fields = ['used_at']