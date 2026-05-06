from django.db import models


class Category(models.Model):
    id   = models.AutoField(primary_key=True, db_column='CategoryID')
    name = models.CharField(max_length=50, db_column='CategoryName')

    class Meta:
        db_table = 'Categories'
        managed = False
        ordering = ['id']
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name


class Supplier(models.Model):
    id                  = models.AutoField(primary_key=True, db_column='SupplierID')
    name                = models.CharField(max_length=100, db_column='SupplierName')
    contact_person_name = models.CharField(max_length=50, blank=True, default='', db_column='ContactPersonName')
    contact_email       = models.CharField(max_length=100, blank=True, default='', db_column='ContactEmail')
    phone               = models.CharField(max_length=20, blank=True, default='', db_column='Phone')
    city                = models.CharField(max_length=255, blank=True, default='', db_column='City')
    country             = models.CharField(max_length=255, blank=True, default='', db_column='Country')
    is_active           = models.BooleanField(default=True, db_column='isActive')
    created_at          = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')

    class Meta:
        db_table = 'Suppliers'
        managed = False
        ordering = ['id']

    def __str__(self):
        return self.name


class Product(models.Model):
    id             = models.AutoField(primary_key=True, db_column='ProductID')
    sku            = models.CharField(max_length=50, unique=True, db_column='SKU')
    name           = models.CharField(max_length=100, db_column='ProductName')
    category       = models.ForeignKey(Category, null=True, blank=True, on_delete=models.SET_NULL, db_column='CategoryID')
    brand          = models.CharField(max_length=50, blank=True, default='', db_column='Brand')
    owner_name     = models.CharField(max_length=100, blank=True, default='', db_column='OwnerName')
    supplier       = models.ForeignKey(Supplier, null=True, blank=True, on_delete=models.SET_NULL, db_column='SupplierID')
    selling_price  = models.DecimalField(max_digits=10, decimal_places=2, db_column='SellingPrice')
    cost_price     = models.DecimalField(max_digits=10, decimal_places=2, db_column='CostPrice')
    stock          = models.IntegerField(default=0, db_column='Stock')
    reorder_level  = models.IntegerField(default=10, db_column='ReorderLevel')
    description    = models.CharField(max_length=255, blank=True, default='', db_column='ProductDescription')
    image_url      = models.CharField(max_length=255, blank=True, default='', db_column='ProductImageURL')
    specifications = models.CharField(max_length=3000, blank=True, default='', db_column='ProductSpecifications')
    discount_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, db_column='DiscountPrice')
    units_sold     = models.IntegerField(default=0, db_column='UnitsSold')
    created_at     = models.DateTimeField(auto_now_add=True, db_column='createdAt')
    updated_at     = models.DateTimeField(auto_now=True, db_column='updatedAt')

    class Meta:
        db_table = 'Products'
        managed = False
        ordering = ['-id']

    def __str__(self):
        return self.name


class ProductVariant(models.Model):
    id = models.BigAutoField(primary_key=True, db_column='VariantID')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants', db_column='ProductID')
    title = models.CharField(max_length=120, db_column='VariantTitle')
    sku = models.CharField(max_length=80, blank=True, default='', db_column='VariantSKU')
    color = models.CharField(max_length=60, blank=True, default='', db_column='VariantColor')
    specs = models.CharField(max_length=500, blank=True, default='', db_column='VariantSpecs')
    price = models.DecimalField(max_digits=12, decimal_places=2, db_column='VariantPrice')
    discount_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, db_column='VariantDiscountPrice')
    stock = models.IntegerField(default=0, db_column='VariantStock')
    source_id = models.CharField(max_length=80, blank=True, default='', db_column='SourceVariantID')
    is_default = models.BooleanField(default=False, db_column='IsDefault')
    is_active = models.BooleanField(default=True, db_column='IsActive')
    created_at = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')
    updated_at = models.DateTimeField(auto_now=True, db_column='UpdatedAt')

    class Meta:
        db_table = 'ProductVariants'
        ordering = ['product_id', '-is_default', 'price', 'id']
        unique_together = [('product', 'title')]

    def __str__(self):
        return f"{self.product.name} - {self.title}"


class MarketPriceSnapshot(models.Model):
    id = models.BigAutoField(primary_key=True, db_column='SnapshotID')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='market_price_snapshots', db_column='ProductID')
    month = models.DateField(db_column='SnapshotMonth')
    market_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, db_column='MarketPrice')
    lowest_market_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, db_column='LowestMarketPrice')
    highest_market_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, db_column='HighestMarketPrice')
    volatility_percent = models.DecimalField(max_digits=6, decimal_places=2, default=0, db_column='VolatilityPercent')
    source = models.CharField(max_length=50, db_column='Source')
    currency_note = models.CharField(max_length=255, blank=True, default='', db_column='CurrencyNote')
    offers_json = models.TextField(blank=True, default='[]', db_column='OffersJSON')
    fetched_at = models.DateTimeField(auto_now=True, db_column='FetchedAt')

    class Meta:
        db_table = 'MarketPriceSnapshots'
        ordering = ['month']
        unique_together = [('product', 'month')]

    def __str__(self):
        return f"{self.product_id} {self.month} {self.source}"


class Customer(models.Model):
    """Legacy Customers table with 1,611 pre-existing customer records."""
    id                = models.AutoField(primary_key=True, db_column='CustomerID')
    first_name        = models.CharField(max_length=100, db_column='FirstName')
    last_name         = models.CharField(max_length=100, db_column='LastName')
    email             = models.CharField(max_length=255, db_column='Email')
    phone             = models.CharField(max_length=20, blank=True, default='', db_column='Phone')
    gender            = models.CharField(max_length=10, blank=True, default='', db_column='Gender')
    date_of_birth     = models.DateField(null=True, blank=True, db_column='DateOfBirth')
    registration_date = models.DateTimeField(null=True, blank=True, db_column='RegistrationDate')
    is_active         = models.BooleanField(default=True, db_column='isActive')
    password          = models.CharField(max_length=128, blank=True, null=True, db_column='Password')

    class Meta:
        db_table = 'Customers'
        managed = False
        ordering = ['id']

    # Required by DRF's IsAuthenticated permission when used as request.user
    @property
    def is_authenticated(self):
        return True

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class Review(models.Model):
    id         = models.AutoField(primary_key=True, db_column='ReviewID')
    product    = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews', db_column='ProductID')
    customer   = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='reviews', db_column='CustomerID')
    rating     = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True, db_column='Rating')
    comment    = models.TextField(null=True, blank=True, db_column='Comment')
    created_at = models.DateTimeField(auto_now_add=True, db_column='ReviewDate')

    class Meta:
        db_table = 'Reviews'
        managed  = False       # table already exists in SQL Server
        ordering = ['-id']
        unique_together = [('product', 'customer')]

    def __str__(self):
        return f"Review by customer {self.customer_id} on product {self.product_id}"
