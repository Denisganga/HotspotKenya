from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import uuid

class Package(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration_hours = models.IntegerField()
    data_limit_mb = models.IntegerField(blank=True, null=True)
    speed_limit_kbps = models.IntegerField(blank=True, null=True)
    image = models.ImageField(upload_to='packages/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name

import uuid

def generate_voucher_code():
    return uuid.uuid4().hex[:8]

class Subscription(models.Model):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subscriptions')
    package = models.ForeignKey(Package, on_delete=models.CASCADE)
    voucher_code = models.CharField(max_length=20, unique=True, default=generate_voucher_code)
    start_time = models.DateTimeField(default=timezone.now)
    end_time = models.DateTimeField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    data_used_mb = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.package.name}"
    
    def save(self, *args, **kwargs):
        if not self.end_time:
            self.end_time = self.start_time + timezone.timedelta(hours=self.package.duration_hours)
        super().save(*args, **kwargs)
