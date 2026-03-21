from django.db import models
from django.utils import timezone


class AuditLog(models.Model):
    ACTIONS = [
        ('CREATE',      'Create'),
        ('UPDATE',      'Update'),
        ('DELETE',      'Delete'),
        ('LOGIN',       'Login'),
        ('LOGOUT',      'Logout'),
        ('VIEW',        'View'),
        ('BULK_UPDATE', 'Bulk Update'),
        ('EXPORT',      'Export'),
        ('IMPORT',      'Import'),
        ('INSERT',      'Insert'),
    ]

    action     = models.CharField(max_length=255)
    table_name = models.CharField(max_length=255, blank=True, default='')
    record_id  = models.IntegerField(null=True, blank=True)
    user_id    = models.IntegerField(null=True, blank=True)
    timestamp  = models.DateTimeField(auto_now_add=True)
    old_values = models.TextField(null=True, blank=True)
    new_values = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'AuditLog'
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.action} on {self.table_name} — {self.timestamp}"

    @staticmethod
    def log_action(action, table_name, record_id=None, user=None, request=None,
                   old_values=None, new_values=None, **kwargs):
        """Create an audit log entry."""
        import json
        try:
            user_id = None
            if user and hasattr(user, 'id'):
                user_id = user.id
            elif user and hasattr(user, 'pk'):
                user_id = user.pk

            def _serialize(v):
                if v is None:
                    return None
                if isinstance(v, str):
                    return v
                try:
                    return json.dumps(v, default=str)
                except Exception:
                    return str(v)

            return AuditLog.objects.create(
                action=action,
                table_name=table_name,
                record_id=record_id,
                user_id=user_id,
                old_values=_serialize(old_values),
                new_values=_serialize(new_values),
            )
        except Exception as e:
            print(f"Audit logging failed: {e}")
            return None


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class AuditMixin:
    """Mixin to add audit logging to ViewSets."""

    def get_audit_table_name(self):
        if hasattr(self, 'queryset') and self.queryset is not None:
            return self.queryset.model._meta.db_table
        if hasattr(self, 'model'):
            return self.model._meta.db_table
        return self.__class__.__name__.lower()

    def audit_log(self, action, instance=None, old_values=None, new_values=None, **kwargs):
        """Create audit log entry."""
        record_id = None
        if instance:
            record_id = getattr(instance, 'id', None) or getattr(instance, 'pk', None)

        return AuditLog.log_action(
            action=action,
            table_name=self.get_audit_table_name(),
            record_id=record_id,
            user=getattr(self.request, 'user', None),
            old_values=old_values,
            new_values=new_values,
        )

    def perform_create(self, serializer):
        instance = serializer.save()
        self.audit_log('CREATE', instance)
        return instance

    def perform_update(self, serializer):
        updated_instance = serializer.save()
        self.audit_log('UPDATE', updated_instance)
        return updated_instance

    def perform_destroy(self, instance):
        instance.delete()
        self.audit_log('DELETE', None)


class LoginLogMixin:
    """Mixin for login/logout audit logging."""

    def log_login_attempt(self, user, success=True, error_message=None):
        if success and user:
            AuditLog.log_action(action='LOGIN', table_name='auth_login', user=user)

    def log_logout(self, user):
        AuditLog.log_action(action='LOGOUT', table_name='auth_logout', user=user)


class UserQuery(models.Model):
    STATUS_NEW = 'NEW'
    STATUS_IN_PROGRESS = 'IN_PROGRESS'
    STATUS_RESOLVED = 'RESOLVED'
    STATUS_CLOSED = 'CLOSED'

    STATUS_CHOICES = [
        (STATUS_NEW, 'New'),
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_RESOLVED, 'Resolved'),
        (STATUS_CLOSED, 'Closed'),
    ]

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True, default='')
    email = models.EmailField(max_length=255)
    phone = models.CharField(max_length=30, blank=True, default='')
    subject = models.CharField(max_length=150)
    message = models.TextField()

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_NEW)
    is_read = models.BooleanField(default=False)

    source_page = models.CharField(max_length=255, blank=True, default='')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default='')
    submitted_by_user_id = models.IntegerField(null=True, blank=True)

    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by_user_id = models.IntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'UserQueries'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.subject} ({self.email})"
