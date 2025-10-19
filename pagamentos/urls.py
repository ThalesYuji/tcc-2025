# pagamentos/urls.py
from django.urls import path
from .views import mercadopago_webhook, mercadopago_retorno

urlpatterns = [
    path('webhook/', mercadopago_webhook, name='mercadopago-webhook'),
    path('retorno/', mercadopago_retorno, name='mercadopago-retorno'),
]
