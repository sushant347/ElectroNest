from rest_framework import serializers
from .models import Category, Supplier, Product, Review


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Category
        fields = '__all__'


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Supplier
        fields = '__all__'


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    average_rating = serializers.SerializerMethodField(read_only=True)
    review_count = serializers.IntegerField(read_only=True)

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