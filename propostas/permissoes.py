from rest_framework.permissions import BasePermission, SAFE_METHODS

class PermissaoProposta(BasePermission):
    """
    Permissões para o app Propostas:
    - Admin tem acesso total.
    - Clientes (donos do trabalho) podem visualizar e alterar status das propostas recebidas.
    - Freelancers podem criar, visualizar e editar suas próprias propostas enquanto pendente.
    """

    def has_object_permission(self, request, view, obj):
        user = request.user

        # Superusuário tem acesso total
        if user.is_superuser:
            return True

        # Leitura (GET, HEAD, OPTIONS): cliente dono do trabalho ou freelancer criador da proposta
        if request.method in SAFE_METHODS:
            return obj.trabalho.cliente == user or obj.freelancer == user

        # Ações personalizadas (alterar_status)
        if view.action in ['alterar_status']:
            return obj.trabalho.cliente == user

        # Escrita geral (PATCH, PUT, DELETE): apenas freelancer dono da proposta
        return obj.freelancer == user
