from django.urls import path
from .views import (
    SalesOverviewView, RevenueTrendView, TopProductsView,
    CategoryPerformanceView, PaymentMethodsView, OrderStatusView,
    LowStockView, CustomerSegmentationView, DemandForecastView,
    ProductRecommendationsView, ProductGrowthView, ComprehensiveForecastView,
    ChurnPredictionView, DynamicPricingView,
)

urlpatterns = [
    path('sales-overview/',       SalesOverviewView.as_view()),
    path('revenue-trend/',        RevenueTrendView.as_view()),
    path('top-products/',         TopProductsView.as_view()),
    path('category-performance/', CategoryPerformanceView.as_view()),
    path('payment-methods/',      PaymentMethodsView.as_view()),
    path('order-status/',         OrderStatusView.as_view()),
    path('low-stock/',            LowStockView.as_view()),
    
    # Product Growth
    path('product-growth/<int:product_id>/', ProductGrowthView.as_view()),

    # Comprehensive Forecast (multi-model)
    path('comprehensive-forecast/<int:product_id>/', ComprehensiveForecastView.as_view()),

    # ML Features
    path('segmentation/',         CustomerSegmentationView.as_view()),
    path('forecast/<int:product_id>/', DemandForecastView.as_view()),
    path('recommendations/<int:product_id>/', ProductRecommendationsView.as_view()),

    # Churn Prediction
    path('churn-prediction/', ChurnPredictionView.as_view()),

    # Dynamic Pricing
    path('dynamic-pricing/<int:product_id>/', DynamicPricingView.as_view()),
]