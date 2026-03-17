from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ('owner', 'Owner'),
        ('warehouse', 'Warehouse'),
        ('admin', 'Admin'),
    ]
    GENDER_CHOICES = [
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other'),
    ]

    role   = models.CharField(max_length=20, choices=ROLE_CHOICES, default='owner')
    phone  = models.CharField(max_length=20, blank=True, default='')
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True, default='')
    dob    = models.DateField(null=True, blank=True)

    def __str__(self):
        return self.email


class CustomerAddress(models.Model):
    ADDRESS_TYPE_CHOICES = [
        ('Billing', 'Billing'),
        ('Shipping', 'Shipping'),
    ]

    id           = models.AutoField(primary_key=True, db_column='AddressID')
    customer     = models.ForeignKey('products.Customer', on_delete=models.CASCADE, related_name='addresses', db_column='CustomerID')
    street       = models.CharField(max_length=255, blank=True, default='', db_column='Street')
    city         = models.CharField(max_length=255, db_column='City')
    province     = models.CharField(max_length=255, blank=True, default='', db_column='Province')
    postal_code  = models.CharField(max_length=20, blank=True, default='', db_column='PostalCode')
    country      = models.CharField(max_length=255, default='Nepal', db_column='Country')
    address_type = models.CharField(max_length=50, choices=ADDRESS_TYPE_CHOICES, db_column='AddressType')

    class Meta:
        db_table = 'Customer_Address'
        managed = False

    def __str__(self):
        return f"{self.customer.email} — {self.address_type}"