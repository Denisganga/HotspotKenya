from django.contrib import admin
from .models import Payment, MpesaPayment

class MpesaPaymentInline(admin.StackedInline):
    model = MpesaPayment
    extra = 0

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('user', 'package', 'amount', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('user__username', 'transaction_id', 'phone_number')
    date_hierarchy = 'created_at'
    inlines = [MpesaPaymentInline]

@admin.register(MpesaPayment)
class MpesaPaymentAdmin(admin.ModelAdmin):
    list_display = ('payment', 'mpesa_receipt_number', 'phone_number', 'result_code', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('payment__user__username', 'mpesa_receipt_number', 'phone_number')
    date_hierarchy = 'created_at'
