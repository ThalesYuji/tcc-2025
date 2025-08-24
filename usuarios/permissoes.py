from rest_framework.permissions import BasePermission

class PermissaoUsuario(BasePermission):
    """
    Permite que o próprio usuário visualize, edite ou exclua seus dados.
    Superusuários têm acesso total.
    """

    def has_object_permission(self, request, view, obj):
        # Superusuário tem acesso total
        if request.user.is_superuser:
            return True

        # Permite ações apenas ao próprio usuário
        return obj.email == request.user.email
