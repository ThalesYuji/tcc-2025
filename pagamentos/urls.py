# pagamentos/urls.py
from django.urls import path
from django.conf import settings
from . import views

urlpatterns = [
    path('retorno/', views.mercadopago_retorno, name='mp-retorno'),
    path('webhook/', views.mercadopago_webhook, name='mp-webhook'),
]

# 🔧 Endpoint DEV para aprovar manualmente um pagamento (NÃO SUBIR EM PRODUÇÃO)
if settings.DEBUG:
    urlpatterns += [
        path('test/force-approve/<int:pagamento_id>/', views.force_approve_payment, name='mp-force-approve'),
    ]
