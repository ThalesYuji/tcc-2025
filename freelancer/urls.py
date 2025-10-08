# freelancer/urls.py
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

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
from pagamentos.views import PagamentoViewSet
from avaliacoes.views import AvaliacaoViewSet
from mensagens.views import MensagemViewSet
from denuncias.views import DenunciaViewSet
from notificacoes.views import NotificacaoViewSet

# Suporte a arquivos de mídia
from django.conf import settings
from django.conf.urls.static import static

# ------------------------
# Endpoint temporário para criar superuser
# ------------------------
@csrf_exempt
def create_superuser_temp(request):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    try:
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser(
                username='admin',
                email='admin@profreelabr.com',
                password='Admin@123456',
                nome='Administrador',
                tipo='cliente'
            )
            return JsonResponse({
                "status": "✅ Superuser criado com sucesso!",
                "username": "admin",
                "password": "Admin@123456"
            })
        return JsonResponse({"status": "⚠️ Superuser 'admin' já existe"})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

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
    # 🧪 TEMPORÁRIO: Criar superuser (REMOVER depois de usar!)
    path('create-admin/', create_superuser_temp, name='create-admin-temp'),
    
    path('admin/', admin.site.urls),
    
    # ⚡ CRÍTICO: Webhooks públicos DEVEM vir ANTES de 'api/'
    path('stripe/', include('pagamentos.urls')),
    
    # JWT endpoints
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Endpoint para dados do usuário logado
    path('api/usuarios/me/', UsuarioMeAPIView.as_view(), name='usuario-me'),
    
    # Endpoints de recuperação de senha
    path('api/password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('api/password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    
    # Endpoints principais da API (via DRF)
    path('api/', include(router.urls)),
    path('api/', include('trabalhos.urls')),
    path('api/', include('habilidades.urls')),
]

# Suporte a arquivos de mídia
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)