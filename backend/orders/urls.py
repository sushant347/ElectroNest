from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (OrderViewSet, CartViewSet, WishlistViewSet,
                    CompareListViewSet,
                    PaymentMethodViewSet, PaymentViewSet,
                    NotificationViewSet, SendLowStockAlertView,
                    OrderStatusViewSet, CouponViewSet)

router = DefaultRouter()
router.register('orders',          OrderViewSet,         basename='orders')
router.register('order-statuses',  OrderStatusViewSet,   basename='order-statuses')
router.register('cart',            CartViewSet,          basename='cart')
router.register('wishlist',        WishlistViewSet,      basename='wishlist')
router.register('compare',         CompareListViewSet,   basename='compare')
router.register('payment-methods', PaymentMethodViewSet, basename='payment-methods')
router.register('payments',        PaymentViewSet,       basename='payments')
router.register('notifications',   NotificationViewSet,  basename='notifications')
router.register('coupons',         CouponViewSet,        basename='coupons')

urlpatterns = [
    # Explicit paths BEFORE router to avoid router capturing e.g. "send-low-stock" as a pk
    path('notifications/send-low-stock/', SendLowStockAlertView.as_view(), name='send-low-stock'),
    path('', include(router.urls)),
]