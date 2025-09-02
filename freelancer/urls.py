from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

# JWT personalizado
from rest_framework_simplejwt.views import TokenRefreshView
from usuarios.token_serializer import CustomTokenObtainPairView

# ViewSets e APIs
from usuarios.views import UsuarioViewSet, UsuarioMeAPIView
from propostas.views import PropostaViewSet
from contratos.views import ContratoViewSet
from pagamentos.views import PagamentoViewSet
from avaliacoes.views import AvaliacaoViewSet
from mensagens.views import MensagemViewSet
from denuncias.views import DenunciaViewSet
from notificacoes.views import NotificacaoViewSet  # ✅ Import correto

# Suporte a arquivos de mídia
from django.conf import settings
from django.conf.urls.static import static

# Roteador central
router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet, basename='usuario')
router.register(r'propostas', PropostaViewSet)
router.register(r'contratos', ContratoViewSet, basename='contrato')  # ✅ corrigido
router.register(r'pagamentos', PagamentoViewSet)
router.register(r'avaliacoes', AvaliacaoViewSet)
router.register(r'mensagens', MensagemViewSet, basename='mensagem')
router.register(r'denuncias', DenunciaViewSet)
router.register(r'notificacoes', NotificacaoViewSet, basename='notificacao')  # ✅ Agora centralizado

urlpatterns = [
    path('admin/', admin.site.urls),

    # JWT endpoints
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Endpoint para dados do usuário logado
    path('api/usuarios/me/', UsuarioMeAPIView.as_view(), name='usuario-me'),

    # API endpoints
    path('api/', include(router.urls)),
    path('api/', include('trabalhos.urls')),      # Somente se 'trabalhos' usa APIView
    path('api/', include('habilidades.urls')),    # Somente se 'habilidades' usa APIView
]

# Suporte a arquivos de mídia (fotos, uploads)
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
