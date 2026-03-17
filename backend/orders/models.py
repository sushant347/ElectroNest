from django.db import models
from accounts.models import CustomUser, CustomerAddress
from products.models import Product, Customer


class OrderStatus(models.Model):
    id   = models.AutoField(primary_key=True, db_column='OrderStatusID')
    name = models.CharField(max_length=50, unique=True, db_column='StatusName')

    class Meta:
        db_table = 'OrderStatus'
        managed = False

    def __str__(self):
        return self.name


class Order(models.Model):
    id                      = models.AutoField(primary_key=True, db_column='OrderID')
    order_number            = models.CharField(max_length=50, unique=True, db_column='OrderNumber')
    customer                = models.ForeignKey(Customer, on_delete=models.CASCADE, db_column='CustomerID')
    order_status            = models.ForeignKey(OrderStatus, null=True, blank=True, on_delete=models.SET_NULL, db_column='OrderStatusID')
    order_date              = models.DateTimeField(auto_now_add=True, db_column='OrderDate')
    total_amount            = models.DecimalField(max_digits=10, decimal_places=2, db_column='TotalAmount')
    address                 = models.ForeignKey(CustomerAddress, null=True, blank=True, on_delete=models.SET_NULL, db_column='AddressID', related_name='orders')
    shipping_cost           = models.DecimalField(max_digits=10, decimal_places=2, default=200, db_column='ShippingCost')
    estimated_delivery_date = models.DateTimeField(null=True, blank=True, db_column='EstimatedDeliveryDate')
    tracking_number         = models.CharField(max_length=50, blank=True, default='', db_column='TrackingNumber')
    created_at              = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')
    updated_at              = models.DateTimeField(auto_now=True, db_column='UpdatedAt')

    class Meta:
        db_table = 'Orders'
        managed = False

    def __str__(self):
        return f"Order {self.order_number}"


class OrderDetail(models.Model):
    id         = models.AutoField(primary_key=True, db_column='OrderDetailID')
    order      = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='details', db_column='OrderID')
    product    = models.ForeignKey(Product, on_delete=models.PROTECT, db_column='ProductID')
    quantity   = models.IntegerField(db_column='Quantity')
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, db_column='UnitPrice')

    class Meta:
        db_table = 'OrderDetails'
        managed = False

    @property
    def total_price(self):
        return self.quantity * self.unit_price

    def __str__(self):
        return f"{self.product.name} x{self.quantity}"


class Cart(models.Model):
    id          = models.AutoField(primary_key=True, db_column='CartID')
    customer    = models.ForeignKey(Customer, on_delete=models.CASCADE, db_column='CustomerID')
    product     = models.ForeignKey(Product, on_delete=models.CASCADE, db_column='ProductID')
    order_count = models.IntegerField(default=0, db_column='OrderCount')
    created_at  = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')

    class Meta:
        db_table = 'Cart'
        managed = False

    def __str__(self):
        return f"{self.customer.email} — {self.product.name}"


class Wishlist(models.Model):
    id       = models.AutoField(primary_key=True, db_column='WishlistID')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, db_column='CustomerID')
    product  = models.ForeignKey(Product, on_delete=models.CASCADE, db_column='ProductID')
    added_at = models.DateTimeField(auto_now_add=True, db_column='AddedAt')

    class Meta:
        db_table = 'Whishlist'
        managed = False

    def __str__(self):
        return f"{self.customer.email} — {self.product.name}"


class Review(models.Model):
    id          = models.AutoField(primary_key=True, db_column='ReviewID')
    product     = models.ForeignKey(Product, on_delete=models.CASCADE, db_column='ProductID')
    customer    = models.ForeignKey(Customer, on_delete=models.CASCADE, db_column='CustomerID')
    rating      = models.DecimalField(max_digits=2, decimal_places=1, db_column='Rating')
    comment     = models.CharField(max_length=255, blank=True, default='', db_column='Comment')
    review_date = models.DateTimeField(auto_now_add=True, db_column='ReviewDate')

    class Meta:
        db_table = 'Reviews'
        managed = False

    def __str__(self):
        return f"{self.customer.email} — {self.product.name} ({self.rating}★)"


class PaymentMethod(models.Model):
    id   = models.AutoField(primary_key=True, db_column='MethodID')
    name = models.CharField(max_length=50, unique=True, db_column='MethodName')

    class Meta:
        db_table = 'PaymentMethods'
        managed = False

    def __str__(self):
        return self.name


class Payment(models.Model):
    id               = models.AutoField(primary_key=True, db_column='PaymentID')
    order            = models.ForeignKey(Order, null=True, blank=True, on_delete=models.SET_NULL, db_column='OrderID')
    method           = models.ForeignKey(PaymentMethod, on_delete=models.PROTECT, db_column='MethodID')
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0, db_column='DiscountPercent')
    payable_amount   = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, db_column='PayableAmount')
    paid_at          = models.DateTimeField(auto_now_add=True, db_column='PaidAt')

    class Meta:
        db_table = 'Payments'
        managed = False

    def __str__(self):
        return f"Payment #{self.id} — Order #{self.order_id}"


class CompareList(models.Model):
    id       = models.AutoField(primary_key=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='compare_items', db_column='CustomerID', db_constraint=False)
    product  = models.ForeignKey(Product, on_delete=models.CASCADE, db_column='ProductID', db_constraint=False)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'CompareList'
        managed  = True
        ordering = ['-added_at']
        unique_together = ('customer', 'product')

    def __str__(self):
        return f"{self.customer.email} — {self.product.name}"


class Coupon(models.Model):
    id               = models.AutoField(primary_key=True)
    # Store-owner association — null means platform-wide (admin only)
    owner            = models.ForeignKey(
        'accounts.CustomUser',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='coupons',
        db_column='OwnerID',
        db_constraint=False,   # Coupon.id is int; CustomUser.id is bigint → MSSQL rejects cross-type FK
        help_text='The store owner this coupon belongs to. Null = platform-wide (admin only).',
    )
    code             = models.CharField(max_length=50, unique=True)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    max_discount     = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    min_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    usage_limit      = models.IntegerField(default=100)
    used_count       = models.IntegerField(default=0)
    per_customer_limit = models.IntegerField(default=1, help_text='Max times one customer can use this coupon')
    free_delivery    = models.BooleanField(default=False, help_text='Waive delivery charge when this coupon is applied')
    is_active        = models.BooleanField(default=True)
    valid_from       = models.DateTimeField()
    valid_until      = models.DateTimeField()
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'Coupons'
        managed  = True

    def __str__(self):
        store = self.owner_store_name or 'Platform'
        return f"{self.code} ({self.discount_percent}%) [{store}]"

    @property
    def owner_store_name(self):
        """Return '<First> <Last>' of the owning user, or None."""
        if not self.owner_id:
            return None
        o = self.owner
        name = f"{o.first_name} {o.last_name}".strip()
        return name or o.email

    @property
    def is_valid(self):
        from django.utils import timezone
        now = timezone.now()
        return (
            self.is_active
            and self.used_count < self.usage_limit
            and self.valid_from <= now <= self.valid_until
        )


class CouponUsage(models.Model):
    """Tracks per-customer coupon usage so limits don't bleed between users."""
    coupon     = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name='customer_usages')
    customer   = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='coupon_usages')
    order      = models.ForeignKey(Order, on_delete=models.SET_NULL, null=True, blank=True, related_name='coupon_usages', db_constraint=False)
    used_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'CouponUsage'
        managed  = True
        ordering = ['-used_at']

    def __str__(self):
        return f"{self.customer.email} used {self.coupon.code}"


class Notification(models.Model):
    TYPES = [
        ('low_stock', 'Low Stock Alert'),
        ('order_update', 'Order Update'),
        ('purchase_order', 'Purchase Order'),
        ('general', 'General'),
    ]
    id         = models.AutoField(primary_key=True)
    recipient  = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='notifications')
    sender     = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_notifications')
    title      = models.CharField(max_length=200)
    message    = models.TextField()
    type       = models.CharField(max_length=20, choices=TYPES, default='general')
    is_read    = models.BooleanField(default=False)
    product    = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'Notifications'
        managed  = True
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.type}] {self.title} → {self.recipient}"