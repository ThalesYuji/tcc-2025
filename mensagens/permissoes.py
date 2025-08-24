from rest_framework.permissions import BasePermission, SAFE_METHODS
from datetime import timedelta
from django.utils import timezone
from contratos.models import Contrato

class PermissaoMensagem(BasePermission):
    """
    Regras:
    - Cliente/freelancer do contrato podem listar e ler mensagens.
    - Criar (POST): somente se o usuário for cliente/freelancer do contrato informado.
    - Editar/Deletar: somente o autor (remetente) e apenas até 25s após envio.
    - Admin pode VER e DELETAR qualquer mensagem; admin NÃO edita.
    """

    def has_permission(self, request, view):
        # Superusuário sempre pode listar/ver e deletar (edição continua bloqueada em has_object_permission)
        if request.user and request.user.is_authenticated and request.user.is_superuser:
            return True

        # Em operações de listagem/criação sem objeto ainda:
        if request.method in SAFE_METHODS:
            return request.user and request.user.is_authenticated

        if request.method == "POST":
            # Valida vínculo com o contrato no payload de criação
            contrato_id = request.data.get("contrato")
            if not contrato_id or not request.user.is_authenticated:
                return False
            try:
                contrato = Contrato.objects.select_related("cliente", "freelancer").get(id=contrato_id)
            except Contrato.DoesNotExist:
                return False
            return request.user.id in (contrato.cliente_id, contrato.freelancer_id)

        # PUT/PATCH/DELETE serão validados em has_object_permission
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Admin: pode ver e DELETAR tudo, nunca editar
        if request.user.is_superuser:
            if request.method in SAFE_METHODS or request.method == "DELETE":
                return True
            return False

        # Leitura: se é participante do contrato
        if request.method in SAFE_METHODS:
            return request.user.id in (obj.contrato.cliente_id, obj.contrato.freelancer_id)

        # Edição/Exclusão: apenas autor e dentro da janela de 25s
        if request.method in ["PUT", "PATCH", "DELETE"]:
            tempo_limite = obj.data_envio + timedelta(seconds=25)
            agora = timezone.now()
            return (request.user.id == obj.remetente_id) and (agora <= tempo_limite)

        # Criação foi tratada em has_permission
        return False
