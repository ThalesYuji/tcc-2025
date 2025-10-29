from rest_framework.permissions import BasePermission, SAFE_METHODS


class PermissaoPagamento(BasePermission):
    """
    Controla o acesso aos pagamentos.
    - Apenas o contratante do contrato pode criar ou editar o pagamento.
    - Contratante, freelancer e admin podem visualizar.
    - Somente admin pode excluir.
    """

    def has_permission(self, request, view):
        """
        Permissão de nível de view (para actions como criar_preferencia_checkout_pro, consultar_status etc.)
        """
        user = request.user

        # 🔹 Admin sempre tem permissão total
        if user and user.is_superuser:
            return True

        # 🔹 Usuário deve estar autenticado
        if not user or not user.is_authenticated:
            return False

        # 🔹 Permite chamadas customizadas de criação e status
        if view.action in [
            'criar_preferencia_checkout_pro',
            'consultar_status',
            'confirmar_retorno',
            'mercadopago_webhook'
        ]:
            return True

        # 🔹 Permite listagem e visualização para usuários autenticados
        if view.action in ['list', 'retrieve']:
            return True

        # 🔹 Permite criação (para contratante) — controle refinado será feito em has_object_permission
        if view.action == 'create':
            return True

        # 🔹 Bloqueia qualquer outra ação não prevista
        return True

    def has_object_permission(self, request, view, obj):
        """
        Permissão de nível de objeto (para operações em pagamentos específicos).
        """
        user = request.user

        # 🔹 Admin sempre pode tudo
        if user.is_superuser:
            return True

        # 🔹 Métodos seguros (GET, HEAD, OPTIONS) — permitem leitura
        if request.method in SAFE_METHODS:
            return (
                user == obj.contratante or
                user == obj.contrato.contratante or
                user == obj.contrato.freelancer
            )

        # 🔹 Apenas o contratante pode editar
        if request.method in ['PUT', 'PATCH']:
            return (
                user == obj.contratante or
                user == obj.contrato.contratante
            )

        # 🔹 Apenas admin pode deletar pagamentos
        if request.method == 'DELETE':
            return False

        # 🔹 Bloqueia qualquer outra modificação
        return False
