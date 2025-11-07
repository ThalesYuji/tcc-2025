# usuarios/middleware.py
from django.http import JsonResponse
from django.conf import settings

# 👇 importa o autenticador do SimpleJWT para validar o token no middleware
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed

class ModoLeituraMiddleware:
    """
    Bloqueia POST/PUT/PATCH/DELETE para usuários em modo leitura (is_suspended_self=True),
    mantendo navegação e login. Compatível com JWT (autentica no middleware).
    """

    SAFE_PATH_PREFIXES = (
        "/admin/login",
        "/api/token",                     # obtain/refresh
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
        self.message = getattr(
            settings,
            "SUSPENSION_MESSAGE",
            "Sua conta está desativada (modo leitura). Reative para realizar esta ação."
        )
        self.jwt_auth = JWTAuthentication()

    def _ensure_user_from_jwt(self, request):
        """
        Se request.user não estiver autenticado via sessão,
        tenta autenticar via JWT (Authorization: Bearer ...).
        """
        user = getattr(request, "user", None)
        if user and getattr(user, "is_authenticated", False):
            return user

        try:
            auth_tuple = self.jwt_auth.authenticate(request)
            if auth_tuple:
                user, _ = auth_tuple
                request.user = user  # injeta o user autenticado para o restante do ciclo
                return user
        except AuthenticationFailed:
            # token inválido/expirado → deixa seguir; a view vai retornar 401
            return None
        except Exception:
            # qualquer problema inesperado: não quebra a requisição
            return None
        return None

    def __call__(self, request):
        # Preflight CORS
        if request.method == "OPTIONS":
            return self.get_response(request)

        # Garante request.user válido mesmo com JWT
        user = self._ensure_user_from_jwt(request)

        # Não autenticado → quem decide é a view/permissão (ex.: IsAuthenticated)
        if not (user and getattr(user, "is_authenticated", False)):
            return self.get_response(request)

        # Staff/superuser nunca bloqueia
        if getattr(user, "is_staff", False) or getattr(user, "is_superuser", False):
            return self.get_response(request)

        # Se não está em modo leitura, segue
        if not getattr(user, "is_suspended_self", False):
            return self.get_response(request)

        # Em modo leitura, bloqueia métodos de escrita (com whitelist)
        if request.method in self.blocked_methods:
            path = (request.path or "").rstrip("/").lower()
            for prefix in self.SAFE_PATH_PREFIXES:
                if path.startswith(prefix.rstrip("/").lower()):
                    return self.get_response(request)

            resp = JsonResponse({"detail": self.message}, status=403)
            resp[self.header_name] = "true"  # axios lerá como 'x-blocked-by-suspension'
            return resp

        # GET/HEAD seguem
        return self.get_response(request)
