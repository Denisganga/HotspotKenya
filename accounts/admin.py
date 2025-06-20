from django.contrib import admin
from .models import UserProfile

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'phone_number', 'date_joined', 'is_active')
    list_filter = ('is_active', 'date_joined')
    search_fields = ('user__username', 'user__email', 'phone_number')
    date_hierarchy = 'date_joined'
