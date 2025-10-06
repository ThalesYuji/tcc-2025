# pagamentos/urls.py
from django.urls import path
from .views import stripe_webhook

# URLs públicas do app pagamentos (SEM autenticação)
urlpatterns = [
    path('webhook/', stripe_webhook, name='stripe-webhook'),
]