from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (UserManagementViewSet, SupplierManagementViewSet,
                    AuditLogViewSet, AdminDashboardView, CustomerListView,
                    CustomerDetailView, UserQueryViewSet, UserQuerySubmitView)

router = DefaultRouter()
router.register('users',     UserManagementViewSet,    basename='admin-users')
router.register('suppliers', SupplierManagementViewSet, basename='admin-suppliers')
router.register('logs',      AuditLogViewSet,          basename='admin-logs')
router.register('user-queries', UserQueryViewSet,      basename='admin-user-queries')

urlpatterns = [
    path('user-queries/submit/', UserQuerySubmitView.as_view()),
    path('', include(router.urls)),
    path('dashboard/', AdminDashboardView.as_view()),
    path('customers/', CustomerListView.as_view()),
    path('customers/<int:pk>/', CustomerDetailView.as_view()),
]