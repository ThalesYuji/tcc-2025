# pagamentos/urls.py
from django.urls import path
from .views import mercadopago_webhook

# URLs públicas do app pagamentos (SEM autenticação)
urlpatterns = [
    path('webhook/', mercadopago_webhook, name='mercadopago-webhook'),
]