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

    Bloqueia métodos de escrita para suspensos.
    Bloqueia TODO acesso para banidos.
    Compatível com JWT.
    """

    SAFE_PATH_PREFIXES = (
        "/admin/login",
        "/api/token",                     # JWT authenticate/refresh
        "/api/password-reset",
        "/api/password-reset-confirm",
        "/api/usuarios/me/desativar",
        "/api/usuarios/me/reativar",
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
    # 🔹 Autenticação JWT no middleware
    # ============================================================
    def _ensure_user_from_jwt(self, request):
        user = getattr(request, "user", None)
        if user and getattr(user, "is_authenticated", False):
            return user

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
        # Preflight CORS
        if request.method == "OPTIONS":
            return self.get_response(request)

        # Garante user autenticado (JWT ou sessão)
        user = self._ensure_user_from_jwt(request)

        # Não autenticado → view decide
        if not (user and getattr(user, "is_authenticated", False)):
            return self.get_response(request)

        # Staff/superuser sempre passa
        if user.is_staff or user.is_superuser:
            return self.get_response(request)

        # ============================================================
        # 🔥 1) BANIMENTO PERMANENTE — BLOQUEIA TUDO
        # ============================================================
        if getattr(user, "banido", False):
            resp = JsonResponse({
                "detail": "Sua conta foi banida permanentemente por violar as políticas da plataforma."
            }, status=403)
            resp[self.header_name] = "banido"
            return resp

        # ============================================================
        # 🔥 2) SUSPENSÃO ADMINISTRATIVA
        # ============================================================
        if getattr(user, "is_suspended_admin", False):
            expiracao = getattr(user, "suspenso_ate", None)

            # Se já passou a validade → desbloqueia automaticamente
            if expiracao and timezone.now() > expiracao:
                user.is_suspended_admin = False
                user.suspenso_ate = None
                user.motivo_suspensao_admin = None
                user.save(update_fields=["is_suspended_admin", "suspenso_ate", "motivo_suspensao_admin"])
            else:
                # Suspensão ativa → bloqueia métodos de escrita
                if request.method in self.blocked_methods:
                    resp = JsonResponse({
                        "detail": f"Sua conta está suspensa até {expiracao.strftime('%d/%m/%Y %H:%M')}."
                    }, status=403)
                    resp[self.header_name] = "suspensao_admin"
                    return resp

        # ============================================================
        # 🔥 3) MODO LEITURA VOLUNTÁRIO
        # ============================================================
        if getattr(user, "is_suspended_self", False):
            if request.method in self.blocked_methods:
                path = (request.path or "").rstrip("/").lower()
                # paths permitidos mesmo suspenso voluntariamente
                for prefix in self.SAFE_PATH_PREFIXES:
                    if path.startswith(prefix.rstrip("/").lower()):
                        return self.get_response(request)

                resp = JsonResponse({"detail": self.message_voluntaria}, status=403)
                resp[self.header_name] = "modo_leitura"
                return resp

        # GET/HEAD liberados
        return self.get_response(request)
