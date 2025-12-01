from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

# JWT
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
from pagamentos.views import PagamentoViewSet
from avaliacoes.views import AvaliacaoViewSet
from mensagens.views import MensagemViewSet
from denuncias.views import DenunciaViewSet
from notificacoes.views import NotificacaoViewSet

# Roteador central DRF
router = DefaultRouter()
router.register(r"usuarios", UsuarioViewSet, basename="usuarios")
router.register(r"propostas", PropostaViewSet)
router.register(r"contratos", ContratoViewSet, basename="contrato")
router.register(r"pagamentos", PagamentoViewSet)
router.register(r"avaliacoes", AvaliacaoViewSet)
router.register(r"mensagens", MensagemViewSet, basename="mensagem")
router.register(r"denuncias", DenunciaViewSet)
router.register(r"notificacoes", NotificacaoViewSet, basename="notificacao")

# URLs principais
urlpatterns = [
    path("admin/", admin.site.urls),

    # Webhooks/integrações públicas
    path("mercadopago/", include("pagamentos.urls")),

    # JWT
    path("api/token/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Usuário logado
    path("api/usuarios/me/", UsuarioMeAPIView.as_view(), name="usuario-me"),

    # Recuperação de senha
    path("api/password-reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path(
        "api/password-reset-confirm/",
        PasswordResetConfirmView.as_view(),
        name="password-reset-confirm",
    ),

    # DRF routers + demais apps
    path("api/", include(router.urls)),
    path("api/punicoes/", include("punicoes.urls")),
    path("api/", include("trabalhos.urls")),
    path("api/", include("habilidades.urls")),
]

# Arquivos de mídia (dev)
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
