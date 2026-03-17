from rest_framework import serializers
from .models import AuditLog
from accounts.models import CustomUser
from products.models import Supplier


class AuditLogSerializer(serializers.ModelSerializer):
    changed_by = serializers.SerializerMethodField()

    class Meta:
        model  = AuditLog
        fields = ['id', 'action', 'table_name', 'record_id', 'user_id', 'changed_by',
                  'timestamp', 'old_values', 'new_values']

    def get_changed_by(self, obj):
        if obj.user_id:
            try:
                user = CustomUser.objects.get(id=obj.user_id)
                return f"{user.first_name} {user.last_name} ({user.email})"
            except CustomUser.DoesNotExist:
                return f"User #{obj.user_id}"
        return "System"


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CustomUser
        fields = ['id', 'email', 'first_name', 'last_name', 'role',
                  'phone', 'gender', 'is_active', 'date_joined', 'last_login']
        read_only_fields = ['id', 'date_joined', 'last_login']


class AdminUserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model  = CustomUser
        fields = ['email', 'first_name', 'last_name', 'role', 'phone', 'gender', 'password']

    def create(self, validated_data):
        validated_data['username'] = validated_data['email']
        return CustomUser.objects.create_user(**validated_data)


class AdminSupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Supplier
        fields = '__all__'
