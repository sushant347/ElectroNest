from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (LoginView, RegisterView, ProfileView,
                    ChangePasswordView, LogoutView, CustomerAddressViewSet,
                    OwnersListView)

router = DefaultRouter()
router.register('addresses', CustomerAddressViewSet, basename='addresses')

urlpatterns = [
    path('login/',           LoginView.as_view()),
    path('register/',        RegisterView.as_view()),
    path('refresh/',         TokenRefreshView.as_view()),
    path('logout/',          LogoutView.as_view()),
    path('profile/',         ProfileView.as_view()),
    path('change-password/', ChangePasswordView.as_view()),
    path('owners/',          OwnersListView.as_view()),
    path('', include(router.urls)),
]