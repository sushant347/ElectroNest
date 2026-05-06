from rest_framework import serializers
from .models import PurchaseOrder, PurchaseOrderDetail
from orders.serializers import OrderStatusSerializer
from products.catalog_replacement import display_product_for_purchase_detail


class PurchaseOrderDetailSerializer(serializers.ModelSerializer):
    product_name  = serializers.SerializerMethodField()
    product_image = serializers.SerializerMethodField()
    product_owner = serializers.SerializerMethodField()
    product_price = serializers.SerializerMethodField()
    total_cost    = serializers.SerializerMethodField()

    class Meta:
        model  = PurchaseOrderDetail
        fields = ['id', 'purchase_order', 'product', 'product_name', 'product_image',
                  'product_owner', 'product_price', 'quantity', 'unit_cost', 'total_cost']

    def get_total_cost(self, obj):
        product = display_product_for_purchase_detail(obj)
        unit_cost = getattr(product, 'cost_price', obj.unit_cost) if product else obj.unit_cost
        return float((obj.quantity or 0) * unit_cost)

    def get_product_name(self, obj):
        product = display_product_for_purchase_detail(obj)
        return product.name if product else f'Product #{obj.product_id}'

    def get_product_image(self, obj):
        product = display_product_for_purchase_detail(obj)
        return getattr(product, 'image_url', '') or ''

    def get_product_owner(self, obj):
        product = display_product_for_purchase_detail(obj)
        return getattr(product, 'owner_name', '') or ''

    def get_product_price(self, obj):
        product = display_product_for_purchase_detail(obj)
        return float(getattr(product, 'selling_price', 0) or 0)


class PurchaseOrderSerializer(serializers.ModelSerializer):
    details       = PurchaseOrderDetailSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    status_name   = serializers.CharField(source='order_status.name', read_only=True)

    class Meta:
        model  = PurchaseOrder
        fields = '__all__'
