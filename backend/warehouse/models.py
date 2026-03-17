from django.db import models
from products.models import Product, Supplier
from orders.models import OrderStatus


class PurchaseOrder(models.Model):
    id                     = models.AutoField(primary_key=True, db_column='PurchaseOrderID')
    supplier               = models.ForeignKey(Supplier, on_delete=models.CASCADE, db_column='SupplierID')
    order_date             = models.DateTimeField(auto_now_add=True, db_column='OrderDate')
    total_amount           = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, db_column='TotalAmount')
    expected_delivery_date = models.DateTimeField(null=True, blank=True, db_column='ExpectedDeliveryDate')
    created_at             = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')
    order_status           = models.ForeignKey(OrderStatus, null=True, blank=True, on_delete=models.SET_NULL, db_column='OrderStatusID')

    class Meta:
        db_table = 'PurchaseOrders'
        managed = False

    def __str__(self):
        return f"PO #{self.id} — {self.supplier.name}"


class PurchaseOrderDetail(models.Model):
    id             = models.AutoField(primary_key=True, db_column='PurchaseOrderDetailID')
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='details', db_column='PurchaseOrderID')
    product        = models.ForeignKey(Product, on_delete=models.PROTECT, db_column='ProductID')
    quantity       = models.IntegerField(db_column='Quantity')
    unit_cost      = models.DecimalField(max_digits=10, decimal_places=2, db_column='UnitCost')

    class Meta:
        db_table = 'PurchaseOrderDetails'
        managed = False

    @property
    def total_cost(self):
        return self.quantity * self.unit_cost

    def __str__(self):
        return f"{self.product.name} x{self.quantity}"