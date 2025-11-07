# usuarios/middleware.py
from django.http import JsonResponse
from django.conf import settings

class ModoLeituraMiddleware:
    """
    Bloqueia requisições de escrita (POST/PUT/PATCH/DELETE) para usuários
    que desativaram a própria conta (is_suspended_self=True), mantendo navegação e login.
    - Permite GET/HEAD/OPTIONS normalmente
    - Whitelist de endpoints essenciais (login, refresh, reset de senha, desativar/reativar)
    - Admin/staff não são bloqueados
    """

    # Prefixos liberados para operações essenciais mesmo em modo leitura
    SAFE_PATH_PREFIXES = (
        "/admin/login",                 # login admin
        "/api/token",                   # JWT obtain/refresh
        "/api/password-reset",          # reset de senha (solicitação)
        "/api/password-reset-confirm",  # reset de senha (confirmação)
        "/api/usuarios/me/desativar",   # pode desativar mesmo ativo
        "/api/usuarios/me/reativar",    # necessário para voltar do modo leitura
    )

    def __init__(self, get_response):
        self.get_response = get_response
        # Carrega configurações com defaults
        self.blocked_methods = tuple(getattr(settings, "SUSPENSION_BLOCKED_METHODS", ("POST", "PUT", "PATCH", "DELETE")))
        self.header_name = getattr(settings, "SUSPENSION_RESPONSE_HEADER", "X-Blocked-By-Suspension")
        self.message = getattr(settings, "SUSPENSION_MESSAGE", "Sua conta está desativada (modo leitura). Reative para realizar esta ação.")

    def __call__(self, request):
        # Libera preflight CORS
        if request.method == "OPTIONS":
            return self.get_response(request)

        user = getattr(request, "user", None)

        # Se não está autenticado, não aplicamos bloqueio (a permissão da view/DRF já cuida)
        if not (user and user.is_authenticated):
            return self.get_response(request)

        # Staff/superuser nunca bloqueia
        if getattr(user, "is_staff", False) or getattr(user, "is_superuser", False):
            return self.get_response(request)

        # Se a conta NÃO está em modo leitura, segue o fluxo
        if not getattr(user, "is_suspended_self", False):
            return self.get_response(request)

        # Em modo leitura: apenas leitura é permitida
        if request.method in self.blocked_methods:
            path = request.path or ""

            # Whitelist de endpoints vitais
            if any(path.startswith(prefix) for prefix in self.SAFE_PATH_PREFIXES):
                return self.get_response(request)

            # Bloqueia e responde 403 com header informativo
            resp = JsonResponse({"detail": self.message}, status=403)
            resp[self.header_name] = "true"
            return resp

        # Métodos seguros (GET/HEAD) seguem normalmente
        return self.get_response(request)
