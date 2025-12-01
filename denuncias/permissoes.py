from rest_framework.permissions import BasePermission, SAFE_METHODS

class PermissaoDenuncia(BasePermission):
    """
    Permite que:
    - O admin pode tudo
    - O autor pode ver e editar sua própria denúncia
    - Só admin pode deletar denúncias
    """
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True

        if request.method in SAFE_METHODS:
            return obj.autor == request.user

        if request.method == "DELETE":
            return False

        # Só o autor pode editar a própria denúncia
        return obj.autor == request.user
