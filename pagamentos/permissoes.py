from rest_framework.permissions import BasePermission, SAFE_METHODS

class PermissaoPagamento(BasePermission):
    """
    Permite que:
    - Apenas o cliente do contrato possa criar/editar o pagamento.
    - Cliente, freelancer e admin podem visualizar.
    - Apenas admin pode deletar.
    - Admin pode tudo.
    """
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True

        if request.method in SAFE_METHODS:
            return (
                request.user == obj.cliente or
                request.user == obj.contrato.cliente or
                request.user == obj.contrato.freelancer
            )

        # Apenas admin pode deletar pagamento
        if request.method == 'DELETE':
            return False

        # Só cliente do contrato pode criar/editar
        return request.user == obj.cliente or request.user == obj.contrato.cliente
