import csv
import io
import random
import string

from rest_framework import viewsets, filters, status as drf_status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Avg, Count
from decimal import Decimal, InvalidOperation

from .models import Category, Supplier, Product, Review
from .serializers import CategorySerializer, SupplierSerializer, ProductSerializer, ReviewSerializer
from admin_panel.models import AuditMixin, AuditLog


class IsOwnerOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            getattr(request.user, 'role', None) in ('owner', 'admin')
        )


class CategoryViewSet(AuditMixin, viewsets.ModelViewSet):
    queryset         = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_audit_table_name(self):
        return 'Categories'


class SupplierViewSet(AuditMixin, viewsets.ModelViewSet):
    queryset           = Supplier.objects.all()
    serializer_class   = SupplierSerializer
    permission_classes = [IsAuthenticated]

    def get_audit_table_name(self):
        return 'Suppliers'


class ProductViewSet(AuditMixin, viewsets.ModelViewSet):
    queryset         = Product.objects.select_related('category', 'supplier')
    serializer_class = ProductSerializer
    filter_backends  = [filters.SearchFilter, filters.OrderingFilter]
    search_fields    = ['name', 'sku', 'brand']
    ordering_fields  = ['name', 'selling_price', 'stock', 'created_at']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsOwnerOrAdmin()]

    def get_audit_table_name(self):
        return 'Products'

    def _generate_sku(self):
        """Generate a unique SKU like PRD-AB3X9K2M."""
        while True:
            sku = 'PRD-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            if not Product.objects.filter(sku=sku).exists():
                return sku

    def perform_create(self, serializer):
        save_kwargs = {'sku': self._generate_sku()}
        # Use owner_name from payload if explicitly set; otherwise derive from the logged-in user
        if not serializer.validated_data.get('owner_name', '').strip():
            save_kwargs['owner_name'] = f"{self.request.user.first_name} {self.request.user.last_name}".strip()
        serializer.save(**save_kwargs)

    def get_queryset(self):
        qs       = super().get_queryset()
        category = self.request.query_params.get('category')
        brand    = self.request.query_params.get('brand')
        owner    = self.request.query_params.get('owner')
        if category:
            qs = qs.filter(category__id=category)
        if brand:
            qs = qs.filter(brand__icontains=brand)
        if owner:
            qs = qs.filter(owner_name__icontains=owner)
        # Owners see only their own products when the 'my_products' param is set
        if (self.request.query_params.get('my_products')
                and hasattr(self.request, 'user')
                and self.request.user.is_authenticated
                and hasattr(self.request.user, 'role')
                and self.request.user.role == 'owner'):
            store_name = f"{self.request.user.first_name} {self.request.user.last_name}"
            qs = qs.filter(owner_name__icontains=store_name.strip())
        qs = qs.annotate(
            average_rating=Avg('reviews__rating'),
            review_count=Count('reviews', distinct=True)
        )
        return qs


class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class   = ReviewSerializer
    http_method_names  = ['get', 'post', 'head', 'options']   # no PUT/PATCH/DELETE

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = Review.objects.select_related('product', 'customer').all()
        product_id = self.request.query_params.get('product')
        mine       = self.request.query_params.get('mine')
        if product_id:
            qs = qs.filter(product__id=product_id)
        if mine == 'true':
            qs = qs.filter(customer=self.request.user)
        return qs

    def perform_create(self, serializer):
        # Prevent duplicate reviews
        product_id = self.request.data.get('product')
        if Review.objects.filter(product__id=product_id, customer=self.request.user).exists():
            raise ValidationError('You have already reviewed this product.')
        serializer.save(customer=self.request.user)


class BrandsListView(APIView):
    """Return distinct non-empty brand names from the Products table."""
    permission_classes = [AllowAny]

    def get(self, request):
        brands = (
            Product.objects
            .exclude(brand='')
            .values_list('brand', flat=True)
            .distinct()
            .order_by('brand')
        )
        return Response(list(brands))


class BulkImportProductsView(APIView):
    """CSV bulk import for products. Owner uploads a CSV file with product data."""
    permission_classes = [IsOwnerOrAdmin]
    parser_classes = [MultiPartParser, FormParser]

    REQUIRED_COLUMNS = {'name', 'selling_price', 'cost_price'}

    def post(self, request):
        csv_file = request.FILES.get('file')
        if not csv_file:
            return Response({'detail': 'No CSV file provided.'}, status=drf_status.HTTP_400_BAD_REQUEST)

        if not csv_file.name.endswith('.csv'):
            return Response({'detail': 'File must be a .csv file.'}, status=drf_status.HTTP_400_BAD_REQUEST)

        try:
            decoded = csv_file.read().decode('utf-8-sig')
            reader = csv.DictReader(io.StringIO(decoded))
        except Exception:
            return Response({'detail': 'Could not read CSV file. Ensure it is UTF-8 encoded.'}, status=drf_status.HTTP_400_BAD_REQUEST)

        headers = set(reader.fieldnames or [])
        missing = self.REQUIRED_COLUMNS - headers
        if missing:
            return Response({'detail': f'Missing required columns: {", ".join(sorted(missing))}'}, status=drf_status.HTTP_400_BAD_REQUEST)

        owner_name = f"{request.user.first_name} {request.user.last_name}".strip()
        created = []
        errors = []

        for row_num, row in enumerate(reader, start=2):
            name = (row.get('name') or '').strip()
            if not name:
                errors.append(f'Row {row_num}: missing name')
                continue

            try:
                selling_price = Decimal(row.get('selling_price', '0').strip())
                cost_price = Decimal(row.get('cost_price', '0').strip())
            except (InvalidOperation, ValueError):
                errors.append(f'Row {row_num}: invalid price for "{name}"')
                continue

            # Resolve category
            category = None
            cat_name = (row.get('category') or '').strip()
            if cat_name:
                category, _ = Category.objects.get_or_create(name=cat_name)

            # Resolve supplier
            supplier = None
            sup_name = (row.get('supplier') or '').strip()
            if sup_name:
                supplier = Supplier.objects.filter(name__iexact=sup_name).first()

            stock = int(row.get('stock', '64').strip() or '64')
            reorder_level = int(row.get('reorder_level', '10').strip() or '10')

            product = Product.objects.create(
                name=name,
                sku=row.get('sku', '').strip() or f'BULK-{name[:10].upper().replace(" ", "")}-{row_num}',
                brand=row.get('brand', '').strip(),
                description=row.get('description', '').strip(),
                selling_price=selling_price,
                cost_price=cost_price,
                stock=stock,
                reorder_level=reorder_level,
                category=category,
                supplier=supplier,
                owner_name=owner_name,
                image_url=row.get('image_url', '').strip(),
            )
            created.append({'id': product.id, 'name': product.name})

        if created:
            AuditLog.log_action(
                action='INSERT',
                table_name='Products',
                record_id=0,
                new_values={'bulk_import': True, 'count': len(created), 'owner': owner_name},
            )

        return Response({
            'created_count': len(created),
            'error_count': len(errors),
            'created': created,
            'errors': errors[:20],
        }, status=drf_status.HTTP_201_CREATED if created else drf_status.HTTP_400_BAD_REQUEST)