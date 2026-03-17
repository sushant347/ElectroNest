from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PurchaseOrderViewSet, WarehouseDashboardView, StockMovementsView

router = DefaultRouter()
router.register('purchase-orders', PurchaseOrderViewSet, basename='purchase-orders')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', WarehouseDashboardView.as_view()),
    path('stock-movements/', StockMovementsView.as_view()),
]