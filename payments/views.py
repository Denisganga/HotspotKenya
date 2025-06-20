from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import requests
import json
import base64
import datetime

from .models import Payment, MpesaPayment
from billing.models import Subscription

@login_required
def payment_process(request, payment_id):
    payment = get_object_or_404(Payment, id=payment_id, user=request.user)
    
    if request.method == 'POST':
        phone_number = request.POST.get('phone_number')
        if phone_number:
            payment.phone_number = phone_number
            payment.save()
            
            # Initiate M-Pesa payment
            response = initiate_mpesa_payment(payment)
            
            if response.get('ResponseCode') == '0':
                # Save M-Pesa details
                MpesaPayment.objects.create(
                    payment=payment,
                    checkout_request_id=response.get('CheckoutRequestID'),
                    merchant_request_id=response.get('MerchantRequestID'),
                    phone_number=phone_number
                )
                messages.success(request, 'Payment initiated. Please check your phone to complete the transaction.')
                return redirect('payment_status', payment_id=payment.id)
            else:
                messages.error(request, f"Payment initiation failed: {response.get('ResponseDescription')}")
    
    return render(request, 'payments/payment_process.html', {'payment': payment})

@login_required
def payment_status(request, payment_id):
    payment = get_object_or_404(Payment, id=payment_id, user=request.user)
    return render(request, 'payments/payment_status.html', {'payment': payment})

@csrf_exempt
def mpesa_callback(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            result = data.get('Body', {}).get('stkCallback', {})
            checkout_request_id = result.get('CheckoutRequestID')
            
            mpesa_payment = MpesaPayment.objects.get(checkout_request_id=checkout_request_id)
            payment = mpesa_payment.payment
            
            if result.get('ResultCode') == 0:
                # Payment successful
                item = result.get('CallbackMetadata', {}).get('Item', [])
                receipt_number = next((i.get('Value') for i in item if i.get('Name') == 'MpesaReceiptNumber'), None)
                
                mpesa_payment.mpesa_receipt_number = receipt_number
                mpesa_payment.result_code = str(result.get('ResultCode'))
                mpesa_payment.result_description = result.get('ResultDesc')
                mpesa_payment.save()
                
                payment.status = 'completed'
                payment.transaction_id = receipt_number
                payment.save()
                
                # Create subscription
                end_time = timezone.now() + timezone.timedelta(hours=payment.package.duration_hours)
                subscription = Subscription.objects.create(
                    user=payment.user,
                    package=payment.package,
                    start_time=timezone.now(),
                    end_time=end_time,
                    status='active'
                )
                
                payment.subscription = subscription
                payment.save()
            else:
                # Payment failed
                mpesa_payment.result_code = str(result.get('ResultCode'))
                mpesa_payment.result_description = result.get('ResultDesc')
                mpesa_payment.save()
                
                payment.status = 'failed'
                payment.save()
            
            return JsonResponse({'status': 'success'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)})
    
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'})

def initiate_mpesa_payment(payment):
    """
    Simulate M-Pesa STK Push API call
    In a real implementation, you would use the actual Safaricom M-Pesa API
    """
    # This is a simulation - in a real app, you would make an actual API call
    # to the M-Pesa API with proper authentication
    
    # Simulate a successful response
    response = {
        'MerchantRequestID': f'merc-{datetime.datetime.now().timestamp()}',
        'CheckoutRequestID': f'ws-{datetime.datetime.now().timestamp()}',
        'ResponseCode': '0',
        'ResponseDescription': 'Success. Request accepted for processing',
        'CustomerMessage': 'Success. Request accepted for processing'
    }
    
    return response
