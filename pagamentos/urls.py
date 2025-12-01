from django.urls import path
from . import views

urlpatterns = [
    # Retorno e webhook públicos
    path('retorno/', views.mercadopago_retorno, name='mp-retorno'),
    path('webhook/', views.mercadopago_webhook, name='mp-webhook'),
    path('webhook', views.mercadopago_webhook),

    # Somente para testes em sandbox
    path('test/force-approve/<int:pagamento_id>/', views.force_approve_payment, name='mp-force-approve'),
]
