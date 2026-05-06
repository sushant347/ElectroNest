from rest_framework import serializers
from django.db.models import Sum
from .models import Category, Supplier, Product, ProductVariant, Review
from orders.models import OrderDetail


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Category
        fields = '__all__'


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Supplier
        fields = '__all__'


class ProductVariantSerializer(serializers.ModelSerializer):
    effective_price = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ProductVariant
        fields = '__all__'
        extra_kwargs = {
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
        }

    def get_effective_price(self, obj):
        discount = obj.discount_price
        if discount is not None and discount > 0 and discount < obj.price:
            return float(discount)
        return float(obj.price)


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    average_rating = serializers.SerializerMethodField(read_only=True)
    review_count = serializers.SerializerMethodField(read_only=True)
    rating_count = serializers.SerializerMethodField(read_only=True)
    units_sold = serializers.SerializerMethodField(read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta:
        model  = Product
        fields = '__all__'
        extra_kwargs = {
            # sku is auto-generated in perform_create — never required from the client
            'sku':        {'required': False},
            # owner_name is set from the authenticated user in perform_create
            'owner_name': {'required': False},
            # these are always auto-managed
            'units_sold': {'required': False},
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
        }

    def get_average_rating(self, obj):
        value = getattr(obj, 'average_rating', None)
        if value is None:
            return 0
        return round(float(value), 1)

    def get_review_count(self, obj):
        return int(getattr(obj, 'review_count', 0) or 0)

    def get_rating_count(self, obj):
        sold = self.get_units_sold(obj)
        # Customer-facing rating volume follows the requested 80% of sold units.
        return int(sold * 0.8) if sold > 0 else self.get_review_count(obj)

    def get_units_sold(self, obj):
        stored = int(getattr(obj, '_live_units_sold', getattr(obj, 'units_sold', 0)) or 0)
        if stored > 0:
            return stored
        return int(
            OrderDetail.objects
            .filter(product=obj)
            .exclude(order__order_status__name='Cancelled')
            .aggregate(total=Sum('quantity'))['total']
            or 0
        )


class ReviewSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField(read_only=True)
    product_name  = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model  = Review
        fields = ['id', 'product', 'product_name', 'customer', 'customer_name', 'rating', 'comment', 'created_at']
        read_only_fields = ['customer', 'created_at']

    def get_customer_name(self, obj):
        return f"{obj.customer.first_name} {obj.customer.last_name}"

    def validate_rating(self, value):
        if value is not None:
            v = float(value)
            if not (0.5 <= v <= 5.0) or (v * 2) % 1 != 0:
                raise serializers.ValidationError("Rating must be between 0.5 and 5.0 in 0.5 increments.")
        return value
