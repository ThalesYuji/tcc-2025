from rest_framework.permissions import BasePermission, SAFE_METHODS

class PermissaoTrabalho(BasePermission):
    """
    Permite acesso total apenas ao cliente que criou o trabalho.
    Admins têm acesso total. Outros só podem visualizar (GET) se forem donos.
    """
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        if request.method in SAFE_METHODS:
            return obj.cliente == request.user
        return obj.cliente == request.user
