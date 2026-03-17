from rest_framework import serializers
from .models import PurchaseOrder, PurchaseOrderDetail
from orders.serializers import OrderStatusSerializer


class PurchaseOrderDetailSerializer(serializers.ModelSerializer):
    product_name  = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.CharField(source='product.image_url', read_only=True, default='')
    product_owner = serializers.CharField(source='product.owner_name', read_only=True, default='')
    product_price = serializers.DecimalField(source='product.selling_price', max_digits=10, decimal_places=2, read_only=True)
    total_cost    = serializers.SerializerMethodField()

    class Meta:
        model  = PurchaseOrderDetail
        fields = ['id', 'purchase_order', 'product', 'product_name', 'product_image',
                  'product_owner', 'product_price', 'quantity', 'unit_cost', 'total_cost']

    def get_total_cost(self, obj):
        return float(obj.total_cost)


class PurchaseOrderSerializer(serializers.ModelSerializer):
    details       = PurchaseOrderDetailSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    status_name   = serializers.CharField(source='order_status.name', read_only=True)

    class Meta:
        model  = PurchaseOrder
        fields = '__all__'