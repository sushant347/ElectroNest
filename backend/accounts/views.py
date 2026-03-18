from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets, serializers
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone
import jwt
from datetime import datetime, timedelta
from django.conf import settings

from .models import CustomUser, CustomerAddress
from .serializers import UserSerializer, LoginSerializer, RegisterSerializer, CustomerAddressSerializer, CustomerUserSerializer
from products.models import Customer


def generate_customer_tokens(customer):
    """Generate JWT tokens for a customer (from Customers table)."""
    access_payload = {
        'token_type': 'access',
        'user_type': 'customer',
        'customer_id': customer.id,
        'email': customer.email,
        'exp': datetime.utcnow() + timedelta(minutes=60),
        'iat': datetime.utcnow(),
    }
    refresh_payload = {
        'token_type': 'refresh',
        'user_type': 'customer',
        'customer_id': customer.id,
        'exp': datetime.utcnow() + timedelta(days=7),
        'iat': datetime.utcnow(),
    }
    secret = settings.SECRET_KEY
    access_token = jwt.encode(access_payload, secret, algorithm='HS256')
    refresh_token = jwt.encode(refresh_payload, secret, algorithm='HS256')
    return access_token, refresh_token


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        ser = LoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        
        email = ser.validated_data['email']
        password = ser.validated_data['password']

        # First check CustomUser for owners/admins
        user_obj = CustomUser.objects.filter(email=email).first()
        
        if user_obj:
            # Owner/Admin/Warehouse - authenticate normally via Django
            user = authenticate(username=user_obj.username, password=password)
            if not user:
                return Response({'message': 'Invalid email or password'}, status=status.HTTP_401_UNAUTHORIZED)

            # Update last_login to current time
            user.last_login = timezone.now()
            user.save(update_fields=['last_login'])

            refresh = RefreshToken.for_user(user)
            return Response({
                'access':  str(refresh.access_token),
                'refresh': str(refresh),
                'user':    UserSerializer(user).data,
            })
        
        # Check Customers table for customer login
        customer = Customer.objects.filter(email=email).first()
        if not customer:
            return Response({'message': 'Invalid email or password'}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Verify password against Customers table
        if not customer.password or not check_password(password, customer.password):
            return Response({'message': 'Invalid email or password'}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Update isActive to 1 if it was 0
        if not customer.is_active:
            customer.is_active = True
            customer.save()

        # Generate JWT tokens for customer (without creating CustomUser)
        access_token, refresh_token = generate_customer_tokens(customer)
        
        return Response({
            'access':  access_token,
            'refresh': refresh_token,
            'user':    CustomerUserSerializer(customer).data,
        })


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        ser = RegisterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        customer = ser.save()  # Returns Customer object (not CustomUser)

        # Generate JWT tokens for the new customer
        access_token, refresh_token = generate_customer_tokens(customer)
        
        return Response({
            'access':  access_token,
            'refresh': refresh_token,
            'user':    CustomerUserSerializer(customer).data,
        }, status=status.HTTP_201_CREATED)


class ProfileView(APIView):
    permission_classes = [AllowAny]  # We handle auth manually

    def get(self, request):
        # Check for customer token first
        customer = get_customer_from_token(request)
        if customer:
            return Response(CustomerUserSerializer(customer).data)
        
        # Fall back to Django user
        if request.user.is_authenticated:
            return Response(UserSerializer(request.user).data)
        
        return Response({'detail': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    def patch(self, request):
        # Check for customer token
        customer = get_customer_from_token(request)
        if customer:
            # Update customer in Customers table
            data = request.data
            if 'first_name' in data or 'firstName' in data:
                customer.first_name = data.get('first_name') or data.get('firstName', customer.first_name)
            if 'last_name' in data or 'lastName' in data:
                customer.last_name = data.get('last_name') or data.get('lastName', customer.last_name)
            if 'phone' in data:
                customer.phone = data.get('phone', customer.phone)
            if 'gender' in data:
                customer.gender = data.get('gender', customer.gender)
            if 'dob' in data or 'date_of_birth' in data:
                customer.date_of_birth = data.get('dob') or data.get('date_of_birth', customer.date_of_birth)
            customer.save()
            return Response(CustomerUserSerializer(customer).data)
        
        # Fall back to Django user
        if request.user.is_authenticated:
            ser = UserSerializer(request.user, data=request.data, partial=True)
            ser.is_valid(raise_exception=True)
            ser.save()
            return Response(ser.data)
        
        return Response({'detail': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)


class ChangePasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # Check for customer token
        customer = get_customer_from_token(request)
        if customer:
            old_password = request.data.get('old_password', '')
            if not customer.password or not check_password(old_password, customer.password):
                return Response({'detail': 'Wrong current password'}, status=status.HTTP_400_BAD_REQUEST)
            new_password = request.data.get('new_password')
            if not new_password or len(new_password) < 8:
                return Response({'detail': 'New password must be at least 8 characters'}, status=status.HTTP_400_BAD_REQUEST)
            customer.password = make_password(new_password)
            customer.save()
            return Response({'detail': 'Password updated'})
        
        # Fall back to Django user
        if request.user.is_authenticated:
            if not request.user.check_password(request.data.get('old_password', '')):
                return Response({'detail': 'Wrong current password'}, status=status.HTTP_400_BAD_REQUEST)
            new_password = request.data.get('new_password')
            if not new_password or len(new_password) < 8:
                return Response({'detail': 'New password must be at least 8 characters'}, status=status.HTTP_400_BAD_REQUEST)
            request.user.set_password(new_password)
            request.user.save()
            return Response({'detail': 'Password updated'})
        
        return Response({'detail': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            refresh = request.data.get('refresh')
            if refresh:
                # Try to decode as customer token first
                try:
                    payload = jwt.decode(refresh, settings.SECRET_KEY, algorithms=['HS256'])
                    if payload.get('user_type') == 'customer':
                        # Customer tokens are stateless, just return success
                        return Response(status=status.HTTP_204_NO_CONTENT)
                except jwt.ExpiredSignatureError:
                    pass
                except jwt.InvalidTokenError:
                    pass
                
                # Otherwise try SimpleJWT blacklist
                token = RefreshToken(refresh)
                try:
                    token.blacklist()
                except AttributeError:
                    pass  # blacklisting not configured
        except Exception:
            pass
        return Response(status=status.HTTP_204_NO_CONTENT)


def get_customer_from_token(request):
    """Extract customer from JWT token if it's a customer token.
    First checks request.user to avoid a second DB query when CustomerJWTAuthentication
    has already authenticated the customer for this request.
    """
    # DRF has already authenticated this request — reuse the result, no extra DB hit
    if isinstance(request.user, Customer):
        return request.user

    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None

    token = auth_header[7:]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        if payload.get('user_type') == 'customer':
            customer_id = payload.get('customer_id')
            return Customer.objects.filter(id=customer_id).first()
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
    return None


class OwnersListView(APIView):
    """Return all active owner accounts — accessible to any authenticated staff user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        owners = (
            CustomUser.objects
            .filter(role='owner', is_active=True)
            .values('id', 'first_name', 'last_name', 'email')
            .order_by('first_name', 'last_name')
        )
        data = [
            {
                'id':    o['id'],
                'name':  f"{o['first_name']} {o['last_name']}".strip(),
                'email': o['email'],
            }
            for o in owners
        ]
        return Response(data)


class CustomerAddressViewSet(viewsets.ModelViewSet):
    serializer_class   = CustomerAddressSerializer
    permission_classes = [AllowAny]  # We handle auth manually

    def _get_customer(self):
        return get_customer_from_token(self.request)

    def get_queryset(self):
        customer = self._get_customer()
        if not customer:
            return CustomerAddress.objects.none()
        return CustomerAddress.objects.filter(customer_id=customer.id)

    def create(self, request, *args, **kwargs):
        customer = self._get_customer()
        if not customer:
            return Response({'detail': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            first_error = next(iter(serializer.errors.values()))[0]
            return Response({'detail': str(first_error)}, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data

        address_type = data.get('address_type', 'Shipping')
        max_count = 2 if address_type == 'Billing' else 4
        count = CustomerAddress.objects.filter(customer_id=customer.id, address_type=address_type).count()
        if count >= max_count:
            return Response(
                {'detail': f'Maximum {max_count} {address_type.lower()} addresses allowed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        address = CustomerAddress.objects.create(
            customer_id  = customer.id,
            street       = data.get('street', ''),
            city         = data.get('city', ''),
            province     = data.get('province', ''),
            postal_code  = data.get('postal_code', ''),
            country      = data.get('country', 'Nepal'),
            address_type = address_type,
        )
        return Response(CustomerAddressSerializer(address).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        customer = self._get_customer()
        if not customer:
            return Response({'detail': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

        pk = kwargs.get('pk')
        try:
            address = CustomerAddress.objects.get(id=pk, customer_id=customer.id)
        except CustomerAddress.DoesNotExist:
            return Response({'detail': 'Address not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Nullify any orders referencing this address before deleting
        from orders.models import Order as OrderModel
        OrderModel.objects.filter(address_id=pk).update(address=None)
        address.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def update(self, request, *args, **kwargs):
        customer = self._get_customer()
        if not customer:
            return Response({'detail': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

        pk = kwargs.get('pk')
        try:
            address = CustomerAddress.objects.get(id=pk, customer_id=customer.id)
        except CustomerAddress.DoesNotExist:
            return Response({'detail': 'Address not found.'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        address.street       = data.get('street', address.street)
        address.city         = data.get('city', address.city)
        address.province     = data.get('province', address.province)
        address.postal_code  = data.get('postal_code', address.postal_code)
        address.country      = data.get('country', address.country)
        address.address_type = data.get('address_type', address.address_type)
        address.save()
        return Response(CustomerAddressSerializer(address).data)