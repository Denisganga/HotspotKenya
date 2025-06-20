from django.urls import path
from . import views

urlpatterns = [
    path('packages/', views.package_list, name='package_list'),
    path('packages/<int:pk>/', views.package_detail, name='package_detail'),
    path('subscribe/<int:package_id>/', views.subscribe, name='subscribe'),
    path('my-subscriptions/', views.my_subscriptions, name='my_subscriptions'),
]
