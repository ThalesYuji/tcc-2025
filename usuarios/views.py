from rest_framework import viewsets, permissions, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action

from .models import Usuario
from .serializers import UsuarioSerializer, TrocaSenhaSerializer
from .permissoes import PermissaoUsuario
from notificacoes.utils import enviar_notificacao  # 🔹 Central de notificações


class UsuarioViewSet(viewsets.ModelViewSet):
    """
    CRUD de usuários.
    - `create`: público (cadastro)
    - `retrieve`: qualquer usuário autenticado
    - `list`: admin vê todos, usuário comum só vê a si mesmo
    - `update` / `partial_update`: restrito ao próprio usuário ou admin
    - `alterar_senha` e `excluir_conta`: endpoints extras
    """
    serializer_class = UsuarioSerializer
    queryset = Usuario.objects.all()

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        elif self.action in ['retrieve', 'list']:
            return [IsAuthenticated()]
        elif self.action in ['update', 'partial_update', 'destroy', 'alterar_senha', 'excluir_conta']:
            return [IsAuthenticated(), PermissaoUsuario()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user

        if user.is_superuser:
            queryset = Usuario.objects.all()
            tipo = self.request.query_params.get('tipo')
            if tipo:
                queryset = queryset.filter(tipo=tipo)
            return queryset

        # `retrieve`: permite visualizar qualquer usuário
        if hasattr(self, "action") and self.action == 'retrieve':
            return Usuario.objects.all()

        # `list`: usuário comum só vê a si mesmo
        return Usuario.objects.filter(email=user.email)

    @action(detail=True, methods=['post'], url_path='alterar_senha')
    def alterar_senha(self, request, pk=None):
        """
        Permite que o usuário altere a própria senha.
        """
        user = self.get_object()
        serializer = TrocaSenhaSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data['nova_senha'])
        user.save()

        # 🔹 Notifica o próprio usuário
        enviar_notificacao(
            usuario=user,
            mensagem="Sua senha foi alterada com sucesso.",
            link="/minha-conta"
        )

        return Response({"mensagem": "Senha alterada com sucesso!"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='excluir_conta')
    def excluir_conta(self, request, pk=None):
        """
        Permite que o usuário exclua a própria conta (solicitando senha).
        """
        user = self.get_object()
        senha = request.data.get('senha')
        if not senha:
            return Response({'erro': 'Senha obrigatória.'}, status=400)
        if not user.check_password(senha):
            return Response({'erro': 'Senha incorreta.'}, status=400)

        # 🔹 Notifica antes de excluir
        enviar_notificacao(
            usuario=user,
            mensagem="Sua conta foi excluída com sucesso.",
            link="/"
        )

        user.delete()
        return Response({'mensagem': 'Conta excluída com sucesso!'}, status=200)


class UsuarioMeAPIView(APIView):
    """
    Endpoint para obter dados do próprio usuário autenticado.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UsuarioSerializer(request.user)
        return Response(serializer.data)
