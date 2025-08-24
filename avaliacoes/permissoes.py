from rest_framework.permissions import BasePermission, SAFE_METHODS

class PermissaoAvaliacao(BasePermission):
    """
    Permite que:
    - Admin pode tudo
    - Avaliador pode criar, ver e editar sua avaliação
    - Avaliado pode visualizar avaliações recebidas
    - Apenas admin pode deletar
    """
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True

        if request.method in SAFE_METHODS:
            # O avaliador ou o avaliado podem visualizar
            return (
                request.user == obj.avaliador or
                request.user == obj.avaliado
            )

        if request.method == "DELETE":
            return False

        # Só avaliador pode criar/editar
        return request.user == obj.avaliador
