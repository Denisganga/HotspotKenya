from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils import timezone
from .models import Package, Subscription
from payments.models import Payment

def package_list(request):
    packages = Package.objects.filter(is_active=True)
    return render(request, 'billing/package_list.html', {'packages': packages})

def package_detail(request, pk):
    package = get_object_or_404(Package, pk=pk, is_active=True)
    return render(request, 'billing/package_detail.html', {'package': package})

@login_required
def subscribe(request, package_id):
    package = get_object_or_404(Package, pk=package_id, is_active=True)
    
    # Create a payment first
    payment = Payment.objects.create(
        user=request.user,
        package=package,
        amount=package.price,
        phone_number=request.user.profile.phone_number or ''
    )
    
    # Redirect to payment page
    return redirect('payment_process', payment_id=payment.id)

@login_required
def my_subscriptions(request):
    active_subscriptions = Subscription.objects.filter(
        user=request.user,
        status='active',
        end_time__gt=timezone.now()
    )
    expired_subscriptions = Subscription.objects.filter(
        user=request.user,
        status='expired'
    )
    
    context = {
        'active_subscriptions': active_subscriptions,
        'expired_subscriptions': expired_subscriptions
    }
    return render(request, 'billing/my_subscriptions.html', context)
