from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, SupplierViewSet, ProductViewSet, ReviewViewSet, BulkImportProductsView

router = DefaultRouter()
router.register('categories', CategoryViewSet)
router.register('suppliers',  SupplierViewSet)
router.register('products',   ProductViewSet)
router.register('reviews',    ReviewViewSet, basename='review')

urlpatterns = [
    path('products/bulk-import/', BulkImportProductsView.as_view(), name='bulk-import'),
    path('', include(router.urls)),
]