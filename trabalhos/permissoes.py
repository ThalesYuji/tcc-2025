from rest_framework.permissions import BasePermission, SAFE_METHODS


class PermissaoTrabalho(BasePermission):
    """
    Controla o acesso aos trabalhos publicados.
    - O contratante que criou o trabalho tem acesso total.
    - Admins têm acesso total.
    - Outros usuários (freelancers) só podem visualizar trabalhos públicos.
    """

    def has_object_permission(self, request, view, obj):
        user = request.user

        # Admin sempre tem acesso
        if user.is_superuser:
            return True

        # Permissão de leitura (GET, HEAD, OPTIONS)
        if request.method in SAFE_METHODS:
            # Freelancers podem visualizar trabalhos públicos
            if hasattr(obj, "is_privado") and not obj.is_privado:
                return True
            # Contratante pode visualizar seus próprios trabalhos (mesmo privados)
            return obj.contratante == user

        # Edição e exclusão só para o contratante
        return obj.contratante == user
