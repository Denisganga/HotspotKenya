from django.urls import path
from . import views

urlpatterns = [
    path('process/<int:payment_id>/', views.payment_process, name='payment_process'),
    path('status/<int:payment_id>/', views.payment_status, name='payment_status'),
    path('mpesa-callback/', views.mpesa_callback, name='mpesa_callback'),
]
