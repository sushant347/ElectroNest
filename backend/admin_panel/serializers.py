from rest_framework import serializers
from .models import AuditLog, UserQuery
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


class UserQuerySubmitSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserQuery
        fields = [
            'first_name', 'last_name', 'email', 'phone',
            'subject', 'message', 'source_page',
        ]


class AdminUserQuerySerializer(serializers.ModelSerializer):
    submitted_by = serializers.SerializerMethodField()
    resolved_by = serializers.SerializerMethodField()

    class Meta:
        model = UserQuery
        fields = [
            'id', 'first_name', 'last_name', 'email', 'phone',
            'subject', 'message', 'status', 'is_read',
            'source_page', 'ip_address', 'user_agent',
            'submitted_by_user_id', 'submitted_by',
            'resolved_at', 'resolved_by_user_id', 'resolved_by',
            'created_at', 'updated_at',
        ]

    def _format_user(self, user_id):
        if not user_id:
            return 'Anonymous'
        try:
            user = CustomUser.objects.get(id=user_id)
            name = f"{user.first_name} {user.last_name}".strip()
            if name:
                return f"{name} ({user.email})"
            return user.email
        except CustomUser.DoesNotExist:
            return f"User #{user_id}"

    def get_submitted_by(self, obj):
        return self._format_user(obj.submitted_by_user_id)

    def get_resolved_by(self, obj):
        if not obj.resolved_by_user_id:
            return ''
        return self._format_user(obj.resolved_by_user_id)
