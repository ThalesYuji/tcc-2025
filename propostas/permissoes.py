from rest_framework.permissions import BasePermission, SAFE_METHODS


class PermissaoProposta(BasePermission):
    """
    Controla o acesso às propostas.
    - Admins têm acesso total.
    - Contratantes (donos do trabalho) podem visualizar e alterar status das propostas recebidas.
    - Freelancers podem criar, visualizar e editar suas próprias propostas enquanto pendentes.
    """

    def has_object_permission(self, request, view, obj):
        user = request.user

        # Admin tem acesso total
        if user.is_superuser:
            return True

        # Leitura (GET, HEAD, OPTIONS):
        # O contratante dono do trabalho ou o freelancer autor da proposta podem ver.
        if request.method in SAFE_METHODS:
            return obj.trabalho.contratante == user or obj.freelancer == user

        # Ações específicas (ex: alterar_status)
        if hasattr(view, "action") and view.action == "alterar_status":
            return obj.trabalho.contratante == user

        # Escrita geral (PATCH, PUT, DELETE): apenas freelancer autor da proposta
        return obj.freelancer == user
