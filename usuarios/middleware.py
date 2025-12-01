from django.http import JsonResponse
from django.conf import settings
from django.utils import timezone

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed


class ModoLeituraMiddleware:
    """
    Middleware unificado para controle de:
    - Modo leitura voluntário (is_suspended_self)
    - Suspensão administrativa (is_suspended_admin)
    - Banimento permanente (banido)

    Importante:
    → Login (POST /api/token/) deve SEMPRE ser liberado.
    → Nenhuma verificação de suspensão pode acontecer antes do login.
    """

    SAFE_PATH_PREFIXES = (
        "/api/token",                     # LOGIN JWT
        "/api/password-reset",
        "/api/password-reset-confirm",
        "/api/usuarios/me/desativar",
        "/api/usuarios/me/reativar",
        "/admin/login",
    )

    def __init__(self, get_response):
        self.get_response = get_response
        self.blocked_methods = tuple(
            getattr(settings, "SUSPENSION_BLOCKED_METHODS", ("POST", "PUT", "PATCH", "DELETE"))
        )
        self.header_name = getattr(settings, "SUSPENSION_RESPONSE_HEADER", "X-Blocked-By-Suspension")
        self.message_voluntaria = "Sua conta está desativada (modo leitura). Reative para realizar esta ação."
        self.jwt_auth = JWTAuthentication()

    # ============================================================
    # 🔹 Tenta autenticar usuário via JWT
    # ============================================================
    def _ensure_user_from_jwt(self, request):
        if getattr(request, "user", None) and request.user.is_authenticated:
            return request.user

        try:
            auth_tuple = self.jwt_auth.authenticate(request)
            if auth_tuple:
                user, _ = auth_tuple
                request.user = user
                return user
        except AuthenticationFailed:
            return None
        except Exception:
            return None

        return None

    # ============================================================
    # 🔹 Middleware principal
    # ============================================================
    def __call__(self, request):

        path = (request.path or "").lower().rstrip("/")

        # ============================================================
        # 🔥 LOGIN / TOKEN → SEMPRE LIBERADO (ANTES DE TUDO)
        # ============================================================
        if path.startswith("/api/token"):
            return self.get_response(request)

        # Pré-CORS
        if request.method == "OPTIONS":
            return self.get_response(request)

        # Autentica usuário (JWT ou sessão)
        user = self._ensure_user_from_jwt(request)

        # Não autenticado → deixar seguir
        if not (user and user.is_authenticated):
            return self.get_response(request)

        # Superuser e staff → nunca bloqueiam
        if user.is_superuser or user.is_staff:
            return self.get_response(request)

        # ============================================================
        # 🔥 BANIMENTO PERMANENTE — BLOQUEIA TUDO
        # ============================================================
        if user.banido:
            resp = JsonResponse({
                "detail": "Sua conta foi banida permanentemente por violar as políticas da plataforma."
            }, status=403)
            resp[self.header_name] = "true"
            return resp

        # ============================================================
        # 🔥 SUSPENSÃO ADMINISTRATIVA
        # ============================================================
        if user.is_suspended_admin:
            expiracao = user.suspenso_ate

            # Se venceu → limpa automaticamente
            if expiracao and timezone.now() > expiracao:
                user.is_suspended_admin = False
                user.suspenso_ate = None
                user.motivo_suspensao_admin = None
                user.save(update_fields=["is_suspended_admin", "suspenso_ate", "motivo_suspensao_admin"])
            else:
                # Suspensão ativa → bloquear MÉTODOS DE ESCRITA apenas
                if request.method in self.blocked_methods:
                    resp = JsonResponse({
                        "detail": f"Sua conta está suspensa até {expiracao.strftime('%d/%m/%Y %H:%M')}."
                    }, status=403)
                    resp[self.header_name] = "true"
                    return resp

        # ============================================================
        # 🔥 MODO LEITURA VOLUNTÁRIO
        # ============================================================
        if user.is_suspended_self:
            if request.method in self.blocked_methods:

                # Paths permitidos mesmo suspenso
                for prefix in self.SAFE_PATH_PREFIXES:
                    if path.startswith(prefix.rstrip("/").lower()):
                        return self.get_response(request)

                # Bloqueia escrita
                resp = JsonResponse({"detail": self.message_voluntaria}, status=403)
                resp[self.header_name] = "true"
                return resp

        # GET/HEAD sempre liberados
        return self.get_response(request)
