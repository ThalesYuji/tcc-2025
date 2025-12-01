from rest_framework.permissions import BasePermission, SAFE_METHODS


class PermissaoContrato(BasePermission):
    """
    Permissões para o app Contratos:
    - O contratante e o freelancer envolvidos podem visualizar o contrato.
    - Apenas o contratante pode editar o contrato.
    - Apenas administradores podem deletar contratos.
    """

    def has_object_permission(self, request, view, obj):
        # Admin tem acesso total
        if request.user.is_superuser:
            return True

        # Leitura (GET, HEAD, OPTIONS): contratante e freelancer podem visualizar
        if request.method in SAFE_METHODS:
            return request.user == obj.contratante or request.user == obj.freelancer

        # Exclusão: apenas admin
        if request.method == "DELETE":
            return False

        # Edição: apenas contratante
        return request.user == obj.contratante
