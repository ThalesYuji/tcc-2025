from rest_framework.permissions import BasePermission, SAFE_METHODS
from datetime import timedelta
from django.utils import timezone
from contratos.models import Contrato


class PermissaoMensagem(BasePermission):
    """
    Regras de acesso para o sistema de mensagens:
    - Contratante e freelancer do contrato podem listar e ler mensagens.
    - Criar (POST): apenas se o usuário for contratante ou freelancer do contrato informado.
    - Editar/Deletar: apenas o remetente e dentro de 25 segundos após o envio.
    - Admin pode visualizar e deletar qualquer mensagem (nunca editar).
    """

    def has_permission(self, request, view):
        # 🔹 Superusuário sempre pode listar/ver/deletar
        if request.user and request.user.is_authenticated and request.user.is_superuser:
            return True

        # 🔹 Leitura geral (GET, HEAD, OPTIONS)
        if request.method in SAFE_METHODS:
            return request.user and request.user.is_authenticated

        # 🔹 Criação (POST): precisa ser participante do contrato
        if request.method == "POST":
            contrato_id = request.data.get("contrato")
            if not contrato_id or not request.user.is_authenticated:
                return False

            try:
                contrato = Contrato.objects.select_related("contratante", "freelancer").get(id=contrato_id)
            except Contrato.DoesNotExist:
                return False

            return request.user.id in (contrato.contratante_id, contrato.freelancer_id)

        # 🔹 PUT/PATCH/DELETE são checados em nível de objeto
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # 🔹 Admin: pode ver e deletar qualquer mensagem, nunca editar
        if request.user.is_superuser:
            if request.method in SAFE_METHODS or request.method == "DELETE":
                return True
            return False

        # 🔹 Leitura: se é participante do contrato
        if request.method in SAFE_METHODS:
            return request.user.id in (obj.contrato.contratante_id, obj.contrato.freelancer_id)

        # 🔹 Edição/Exclusão: apenas o remetente, dentro da janela de 25 segundos
        if request.method in ["PUT", "PATCH", "DELETE"]:
            tempo_limite = obj.data_envio + timedelta(seconds=25)
            agora = timezone.now()
            return (request.user.id == obj.remetente_id) and (agora <= tempo_limite)

        # 🔹 Criação foi tratada em has_permission
        return False
