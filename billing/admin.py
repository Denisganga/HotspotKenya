from django.contrib import admin
from .models import Package, Subscription

@admin.register(Package)
class PackageAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'duration_hours', 'data_limit_mb', 'speed_limit_kbps', 'is_active')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'description')
    date_hierarchy = 'created_at'

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'package', 'voucher_code', 'start_time', 'end_time', 'status')
    list_filter = ('status', 'start_time')
    search_fields = ('user__username', 'package__name', 'voucher_code')
    date_hierarchy = 'created_at'
