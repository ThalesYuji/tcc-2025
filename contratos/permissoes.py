from rest_framework.permissions import BasePermission, SAFE_METHODS

class PermissaoContrato(BasePermission):
    """
    Permite que:
    - O cliente e o freelancer envolvidos no contrato possam visualizar.
    - Apenas o cliente possa editar contratos.
    - Apenas admin pode deletar contratos.
    """

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True

        if request.method in SAFE_METHODS:
            return request.user == obj.cliente or request.user == obj.freelancer

        if request.method == "DELETE":
            return False  # Apenas admin pode deletar

        return request.user == obj.cliente
