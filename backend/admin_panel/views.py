from rest_framework import viewsets, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Sum, Count, F, Q
from django.db.models.functions import TruncDay
from django.utils import timezone
from datetime import timedelta

from .models import AuditLog, AuditMixin, LoginLogMixin
from .serializers import (AuditLogSerializer, AdminUserSerializer,
                          AdminUserCreateSerializer, AdminSupplierSerializer)
from .permissions import IsAdminRole
from accounts.models import CustomUser
from products.models import Supplier, Customer
from orders.models import Order
from rest_framework import serializers as drf_serializers


class UserManagementViewSet(AuditMixin, viewsets.ModelViewSet):
    permission_classes = [IsAdminRole]
    filter_backends    = [filters.SearchFilter, filters.OrderingFilter]
    search_fields      = ['email', 'first_name', 'last_name', 'role']
    ordering_fields    = ['date_joined', 'email', 'role']

    def get_queryset(self):
        qs   = CustomUser.objects.all()
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        return qs.order_by('-date_joined')

    def get_serializer_class(self):
        if self.action == 'create':
            return AdminUserCreateSerializer
        return AdminUserSerializer

    def get_audit_table_name(self):
        return 'accounts_customuser'

    @action(detail=True, methods=['patch'], url_path='toggle-active')
    def toggle_active(self, request, pk=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        self.audit_log('UPDATE', user)
        return Response(AdminUserSerializer(user).data)


class SupplierManagementViewSet(AuditMixin, viewsets.ModelViewSet):
    queryset           = Supplier.objects.all().order_by('-created_at')
    serializer_class   = AdminSupplierSerializer
    permission_classes = [IsAdminRole]
    filter_backends    = [filters.SearchFilter, filters.OrderingFilter]
    search_fields      = ['name', 'contact_email', 'contact_person_name']
    ordering_fields    = ['name', 'created_at']
    ordering           = ['-created_at']

    def get_audit_table_name(self):
        return 'Suppliers'


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class   = AuditLogSerializer
    permission_classes = [IsAdminRole]
    filter_backends    = [filters.SearchFilter, filters.OrderingFilter]
    search_fields      = ['action', 'table_name']
    ordering_fields    = ['timestamp']

    def get_queryset(self):
        qs         = AuditLog.objects.all()
        action     = self.request.query_params.get('action')
        table_name = self.request.query_params.get('table_name')
        date_from  = self.request.query_params.get('date_from')
        date_to    = self.request.query_params.get('date_to')
        user_id    = self.request.query_params.get('user_id')

        if action:
            qs = qs.filter(action__icontains=action)
        if table_name:
            qs = qs.filter(table_name__icontains=table_name)
        if date_from:
            qs = qs.filter(timestamp__date__gte=date_from)
        if date_to:
            qs = qs.filter(timestamp__date__lte=date_to)
        if user_id:
            qs = qs.filter(user_id=user_id)

        return qs.order_by('-timestamp')

    @action(detail=False, methods=['get'], url_path='stats')
    def get_stats(self, request):
        """Get audit log statistics."""
        queryset = self.get_queryset()

        # Activity by action
        action_stats = list(
            queryset.values('action')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # Activity by table
        table_stats = list(
            queryset.values('table_name')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )

        # Activity by user_id (look up names separately)
        raw_user_stats = list(
            queryset.filter(user_id__isnull=False)
            .values('user_id')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )
        user_ids = [u['user_id'] for u in raw_user_stats]
        users_map = {
            u.id: u for u in CustomUser.objects.filter(id__in=user_ids)
        }
        user_stats = []
        for u in raw_user_stats:
            usr = users_map.get(u['user_id'])
            user_stats.append({
                'user_id':    u['user_id'],
                'count':      u['count'],
                'first_name': usr.first_name if usr else '',
                'last_name':  usr.last_name  if usr else '',
                'email':      usr.email      if usr else '',
            })

        # Activity over time (last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        daily_activity = list(
            queryset.filter(timestamp__gte=thirty_days_ago)
            .annotate(date=TruncDay('timestamp'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')
        )

        return Response({
            'action_distribution': action_stats,
            'table_distribution':  table_stats,
            'user_activity':       user_stats,
            'daily_activity': [{
                'date':  item['date'].strftime('%Y-%m-%d') if item['date'] else '',
                'count': item['count'],
            } for item in daily_activity],
            'total_entries': queryset.count(),
        })


class AdminDashboardView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        from products.models import Customer, Product, Category
        from orders.models import OrderDetail

        total_users      = CustomUser.objects.count()
        total_orders     = Order.objects.count()
        total_revenue    = Order.objects.exclude(
            order_status__name='Cancelled'
        ).aggregate(t=Sum('total_amount'))['t'] or 0
        active_suppliers = Supplier.objects.filter(is_active=True).count()

        # ── Customer data from legacy Customers table ──
        total_customers    = Customer.objects.count()
        active_customers   = Customer.objects.filter(is_active=True).count()
        gender_dist        = list(
            Customer.objects.values('gender')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        customer_reg_trend = list(
            Customer.objects
            .filter(registration_date__isnull=False)
            .annotate(date=TruncDay('registration_date'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('-date')[:30]
        )

        # ── Product & Category stats ──
        total_products = Product.objects.count()
        total_categories = Category.objects.count()
        category_product_counts = list(
            Product.objects.values('category__name')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # ── Top products by revenue ──
        top_products = list(
            OrderDetail.objects
            .exclude(order__order_status__name='Cancelled')
            .values('product__name', 'product__brand', 'product__category__name')
            .annotate(
                total_revenue=Sum(F('quantity') * F('unit_price')),
                total_sold=Sum('quantity')
            )
            .order_by('-total_revenue')[:5]
        )

        # ── Category revenue ──
        category_revenue = list(
            OrderDetail.objects
            .exclude(order__order_status__name='Cancelled')
            .values('product__category__name')
            .annotate(total_revenue=Sum(F('quantity') * F('unit_price')))
            .order_by('-total_revenue')
        )

        role_dist = (
            CustomUser.objects.values('role')
            .annotate(count=Count('id'))
        )

        now       = timezone.now()
        from_date = now - timedelta(days=365)
        reg_trend = (
            CustomUser.objects
            .filter(date_joined__gte=from_date)
            .annotate(date=TruncDay('date_joined'))
            .values('date', 'role')
            .annotate(count=Count('id'))
            .order_by('date')
        )

        try:
            recent_logs = AuditLog.objects.order_by('-timestamp')[:10]
        except Exception:
            recent_logs = []

        return Response({
            'total_users':       total_users,
            'total_orders':      total_orders,
            'total_revenue':     float(total_revenue),
            'active_suppliers':  active_suppliers,
            'total_products':    total_products,
            'total_categories':  total_categories,
            # Customer data
            'total_customers':      total_customers,
            'active_customers':     active_customers,
            'customer_gender_dist': gender_dist,
            'customer_reg_trend': [{
                'date':  item['date'].strftime('%Y-%m-%d') if item.get('date') else '',
                'count': item['count'],
            } for item in customer_reg_trend],
            # Product / Category data
            'category_product_counts': [{
                'category': item['category__name'] or 'Uncategorized',
                'count':    item['count'],
            } for item in category_product_counts],
            'top_products': [{
                'name':       item['product__name'],
                'brand':      item['product__brand'] or '',
                'category':   item['product__category__name'] or '',
                'revenue':    float(item['total_revenue'] or 0),
                'units_sold': item['total_sold'] or 0,
            } for item in top_products],
            'category_revenue': [{
                'category': item['product__category__name'] or 'Uncategorized',
                'revenue':  float(item['total_revenue'] or 0),
            } for item in category_revenue],
            'role_distribution': list(role_dist),
            'registration_trend': [{
                'date':  item['date'].strftime('%Y-%m-%d'),
                'role':  item['role'],
                'count': item['count'],
            } for item in reg_trend],
            'recent_activity': AuditLogSerializer(recent_logs, many=True).data,
        })


class CustomerSerializer(drf_serializers.ModelSerializer):
    full_name = drf_serializers.SerializerMethodField()

    class Meta:
        model  = Customer
        fields = ['id', 'first_name', 'last_name', 'full_name', 'email', 'phone',
                  'gender', 'date_of_birth', 'registration_date', 'is_active']

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"


class CustomerListView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        qs = Customer.objects.all().order_by('-registration_date')
        search = request.query_params.get('search', '')
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)  |
                Q(email__icontains=search)      |
                Q(phone__icontains=search)
            )
        gender = request.query_params.get('gender')
        if gender:
            qs = qs.filter(gender__iexact=gender)
        active = request.query_params.get('is_active')
        if active is not None:
            qs = qs.filter(is_active=(active.lower() == 'true'))
        return Response(CustomerSerializer(qs[:500], many=True).data)


class CustomerDetailView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request, pk):
        try:
            customer = Customer.objects.get(pk=pk)
        except Customer.DoesNotExist:
            return Response({'detail': 'Customer not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(CustomerSerializer(customer).data)

    def delete(self, request, pk):
        try:
            customer = Customer.objects.get(pk=pk)
        except Customer.DoesNotExist:
            return Response({'detail': 'Customer not found.'}, status=status.HTTP_404_NOT_FOUND)

        old_data = {
            'id':         customer.id,
            'name':       f"{customer.first_name} {customer.last_name}",
            'email':      customer.email,
            'phone':      customer.phone,
            'gender':     customer.gender,
            'is_active':  customer.is_active,
        }

        customer.delete()

        AuditLog.log_action(
            action='DELETE',
            table_name='Customers',
            record_id=pk,
            user=request.user,
            old_values=old_data,
            new_values=None,
        )

        return Response(status=status.HTTP_204_NO_CONTENT)

    def patch(self, request, pk):
        try:
            customer = Customer.objects.get(pk=pk)
        except Customer.DoesNotExist:
            return Response({'detail': 'Customer not found.'}, status=status.HTTP_404_NOT_FOUND)

        old_data = {
            'is_active': customer.is_active,
            'name':      f"{customer.first_name} {customer.last_name}",
            'email':     customer.email,
        }

        if 'is_active' in request.data:
            customer.is_active = request.data['is_active']
            customer.save()

        AuditLog.log_action(
            action='UPDATE',
            table_name='Customers',
            record_id=pk,
            user=request.user,
            old_values=old_data,
            new_values={'is_active': customer.is_active},
        )

        return Response(CustomerSerializer(customer).data)
