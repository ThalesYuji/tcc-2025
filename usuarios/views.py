# usuarios/views.py
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action

from .models import Usuario
from .serializers import (
    UsuarioSerializer,
    TrocaSenhaSerializer,
    UsuarioPublicoSerializer
)
from .permissoes import PermissaoUsuario
from notificacoes.utils import enviar_notificacao

# Importações para avaliações e propostas
from avaliacoes.models import Avaliacao
from avaliacoes.serializers import AvaliacaoSerializer
from propostas.models import Proposta  # 🔹 para contar propostas


class UsuarioViewSet(viewsets.ModelViewSet):
    """
    CRUD de usuários.
    - `create`: público (cadastro)
    - `retrieve`: qualquer usuário autenticado (restrito por regras)
    - `list`: 
        • superuser → vê todos (pode filtrar por ?tipo=)  
        • cliente → vê apenas freelancers  
        • freelancer → vê apenas a si mesmo
    - `update` / `partial_update`: restrito ao próprio usuário ou admin
    - `alterar_senha` e `excluir_conta`: endpoints extras
    - `perfil_publico`: retorna dados de qualquer usuário (sem restrição)
    - `avaliacoes_publicas`: retorna avaliações recebidas por um usuário (sem restrição)
    - `resumo`: retorna resumo para o Dashboard do usuário logado
    """
    serializer_class = UsuarioSerializer
    queryset = Usuario.objects.all()

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        elif self.action in ["perfil_publico", "avaliacoes_publicas"]:
            return [AllowAny()]  # 🔹 acessível mesmo sem login
        elif self.action in ["retrieve", "list"]:
            return [IsAuthenticated()]
        elif self.action in [
            "update", "partial_update", "destroy", "alterar_senha", "excluir_conta", "resumo"
        ]:
            return [IsAuthenticated(), PermissaoUsuario()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        tipo = self.request.query_params.get("tipo")

        # 🔹 Superusuário: vê todos e pode filtrar
        if user.is_superuser:
            queryset = Usuario.objects.all()
            if tipo:
                queryset = queryset.filter(tipo=tipo)
            return queryset

        # 🔹 Cliente: só vê freelancers
        if hasattr(user, "tipo") and user.tipo == "cliente":
            return Usuario.objects.filter(tipo="freelancer")

        # 🔹 Freelancer: só vê a si mesmo
        if hasattr(user, "tipo") and user.tipo == "freelancer":
            return Usuario.objects.filter(id=user.id)

        return Usuario.objects.none()

    @action(
        detail=True,
        methods=["get"],
        url_path="perfil_publico",
        url_name="perfil_publico",
        permission_classes=[AllowAny],
    )
    def perfil_publico(self, request, pk=None):
        """Retorna dados públicos de qualquer usuário (ignora restrições do queryset)."""
        try:
            usuario = Usuario.objects.get(pk=pk)  # 🔹 busca direta
        except Usuario.DoesNotExist:
            return Response({"detail": "Usuário não encontrado."}, status=404)

        serializer = UsuarioPublicoSerializer(usuario, context={"request": request})
        return Response(serializer.data)

    @action(
        detail=True,
        methods=["get"],
        url_path="avaliacoes_publicas",
        url_name="avaliacoes_publicas",
        permission_classes=[AllowAny],
    )
    def avaliacoes_publicas(self, request, pk=None):
        """Retorna avaliações públicas recebidas por um usuário."""
        try:
            usuario = Usuario.objects.get(pk=pk)
        except Usuario.DoesNotExist:
            return Response({"detail": "Usuário não encontrado."}, status=404)

        avaliacoes = Avaliacao.objects.filter(avaliado=usuario).select_related("avaliador")
        serializer = AvaliacaoSerializer(avaliacoes, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="alterar_senha")
    def alterar_senha(self, request, pk=None):
        """Permite que o usuário altere a própria senha."""
        user = self.get_object()
        serializer = TrocaSenhaSerializer(
            data=request.data, context={"request": request}
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data["nova_senha"])
        user.save()

        enviar_notificacao(
            usuario=user,
            mensagem="Sua senha foi alterada com sucesso.",
            link="/minha-conta",
        )

        return Response({"mensagem": "Senha alterada com sucesso!"}, status=200)

    @action(detail=True, methods=["post"], url_path="excluir_conta")
    def excluir_conta(self, request, pk=None):
        """Permite que o usuário exclua a própria conta (solicitando senha)."""
        user = self.get_object()
        senha = request.data.get("senha")
        if not senha:
            return Response({"erro": "Senha obrigatória."}, status=400)
        if not user.check_password(senha):
            return Response({"erro": "Senha incorreta."}, status=400)

        enviar_notificacao(
            usuario=user,
            mensagem="Sua conta foi excluída com sucesso.",
            link="/",
        )

        user.delete()
        return Response({"mensagem": "Conta excluída com sucesso!"}, status=200)

    @action(detail=False, methods=["get"], url_path="me/resumo")
    def resumo(self, request):
        """Resumo de atividades do usuário logado (para o Dashboard)."""
        user = request.user
        resumo = {}

        # 🔹 Freelancer
        if user.tipo == "freelancer":
            propostas = Proposta.objects.filter(freelancer=user)
            resumo["enviadas"] = propostas.count()
            resumo["aceitas"] = propostas.filter(status="aceita").count()
            resumo["recusadas"] = propostas.filter(status="recusada").count()

        # 🔹 Cliente
        elif user.tipo == "cliente":
            propostas = Proposta.objects.filter(trabalho__cliente=user)
            resumo["recebidas"] = propostas.count()
            resumo["pendentes"] = propostas.filter(status="pendente").count()
            resumo["aceitas"] = propostas.filter(status="aceita").count()

        # 🔹 Avaliações recebidas
        avaliacoes = Avaliacao.objects.filter(avaliado=user)
        resumo["totalAvaliacoes"] = avaliacoes.count()
        resumo["mediaAvaliacao"] = (
            round(sum(a.nota for a in avaliacoes) / avaliacoes.count(), 2)
            if avaliacoes.exists() else None
        )

        return Response(resumo)


class UsuarioMeAPIView(APIView):
    """Endpoint para obter e atualizar dados do próprio usuário autenticado."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UsuarioSerializer(request.user, context={"request": request})
        return Response(serializer.data)

    def patch(self, request):
        serializer = UsuarioSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
