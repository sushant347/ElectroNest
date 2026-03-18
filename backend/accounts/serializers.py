from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from django.db import transaction
from .models import CustomUser, CustomerAddress
from products.models import Customer


class CustomerAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CustomerAddress
        fields = ['id', 'street', 'city', 'province', 'postal_code', 'country', 'address_type']


class UserSerializer(serializers.ModelSerializer):
    addresses = CustomerAddressSerializer(many=True, read_only=True)

    class Meta:
        model  = CustomUser
        fields = ['id', 'email', 'first_name', 'last_name', 'role',
                  'phone', 'gender', 'dob', 'date_joined', 'addresses']
        read_only_fields = ['id', 'date_joined']


class CustomerUserSerializer(serializers.Serializer):
    """Serializer for customer data from Customers table (not CustomUser)."""
    id = serializers.IntegerField()
    email = serializers.EmailField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    role = serializers.CharField(default='customer')
    phone = serializers.CharField(allow_blank=True)
    gender = serializers.CharField(allow_blank=True)
    dob = serializers.DateField(allow_null=True, source='date_of_birth')
    date_joined = serializers.DateTimeField(source='registration_date')


class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class RegisterSerializer(serializers.Serializer):
    """
    Only customers can register. Registration creates entries ONLY in 
    Customers and Customer_Address tables (NOT in accounts_customuser).
    """
    firstName       = serializers.CharField()
    lastName        = serializers.CharField()
    email           = serializers.EmailField()
    password        = serializers.CharField(write_only=True)
    confirmPassword = serializers.CharField(write_only=True)
    phone           = serializers.CharField(required=False, default='')
    countryCode     = serializers.CharField(required=False, default='+977')
    dob             = serializers.DateField(required=False, allow_null=True)
    gender          = serializers.CharField(required=False, default='')

    # Address fields (optional, creates a Shipping address)
    street      = serializers.CharField(required=False, default='')
    city        = serializers.CharField(required=False, default='')
    province    = serializers.CharField(required=False, default='')
    postal_code = serializers.CharField(required=False, default='')
    country     = serializers.CharField(required=False, default='Nepal')

    def validate(self, data):
        if data['password'] != data['confirmPassword']:
            raise serializers.ValidationError({'confirmPassword': 'Passwords do not match'})
        # Check Customers table only (customers are NOT stored in accounts_customuser)
        if Customer.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError({'email': 'Email already registered'})
        # Also check if email is used by an owner/admin in CustomUser
        if CustomUser.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError({'email': 'Email already registered'})
        return data

    @transaction.atomic
    def create(self, validated_data):
        from datetime import datetime

        # Format phone with country code
        phone = validated_data.get('phone', '')
        country_code = validated_data.get('countryCode', '+977')
        if phone and not phone.startswith('+'):
            phone = f"{country_code}{phone}"

        # 1. Create Customer record in Customers table ONLY (no CustomUser)
        customer = Customer.objects.create(
            first_name        = validated_data['firstName'],
            last_name         = validated_data['lastName'],
            email             = validated_data['email'],
            phone             = phone,
            gender            = validated_data.get('gender', ''),
            date_of_birth     = validated_data.get('dob', None),
            registration_date = datetime.now(),
            is_active         = True,
            password          = make_password(validated_data['password']),
        )

        # 2. Create address using Django ORM (no raw SQL — avoids SQL Server vs PostgreSQL syntax issues)
        city = validated_data.get('city', '')
        if city:
            CustomerAddress.objects.create(
                customer     = customer,
                street       = validated_data.get('street', ''),
                city         = city,
                province     = validated_data.get('province', ''),
                postal_code  = validated_data.get('postal_code', ''),
                country      = validated_data.get('country', 'Nepal'),
                address_type = 'Shipping',
            )

        # Return the Customer object (not CustomUser)
        return customer