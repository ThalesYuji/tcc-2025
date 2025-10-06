# freelancer/urls.py

from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

# JWT personalizado
from rest_framework_simplejwt.views import TokenRefreshView
from usuarios.token_serializer import CustomTokenObtainPairView

# ViewSets e APIs
from usuarios.views import (
    UsuarioViewSet,
    UsuarioMeAPIView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
)
from propostas.views import PropostaViewSet
from contratos.views import ContratoViewSet
from pagamentos.views import PagamentoViewSet, stripe_webhook   # ✅ importa webhook puro
from avaliacoes.views import AvaliacaoViewSet
from mensagens.views import MensagemViewSet
from denuncias.views import DenunciaViewSet
from notificacoes.views import NotificacaoViewSet

# Suporte a arquivos de mídia
from django.conf import settings
from django.conf.urls.static import static

# ------------------------
# Roteador central DRF
# ------------------------
router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet, basename='usuarios')
router.register(r'propostas', PropostaViewSet)
router.register(r'contratos', ContratoViewSet, basename='contrato')
router.register(r'pagamentos', PagamentoViewSet)
router.register(r'avaliacoes', AvaliacaoViewSet)
router.register(r'mensagens', MensagemViewSet, basename='mensagem')
router.register(r'denuncias', DenunciaViewSet)
router.register(r'notificacoes', NotificacaoViewSet, basename='notificacao')

# ------------------------
# URLs principais
# ------------------------
urlpatterns = [
    path('admin/', admin.site.urls),

    # JWT endpoints
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Endpoint para dados do usuário logado
    path('api/usuarios/me/', UsuarioMeAPIView.as_view(), name='usuario-me'),

    # Endpoints de recuperação de senha
    path('api/password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('api/password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),

    # ------------------------
    # Endpoints principais da API (via DRF)
    # ------------------------
    path('api/', include(router.urls)),
    path('api/', include('trabalhos.urls')),
    path('api/', include('habilidades.urls')),

    # ------------------------
    # ⚡ Webhook Stripe → precisa estar FORA do DRF e SEM autenticação
    # Chamado direto pelo Stripe → nunca passa pelo JWT
    # ------------------------
    path('api/pagamentos/webhook/', stripe_webhook, name='stripe-webhook'),
]

# ------------------------
# Suporte a arquivos de mídia
# ------------------------
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
