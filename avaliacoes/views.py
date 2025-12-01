from rest_framework import viewsets
from django.db import models
from .models import Avaliacao
from .serializers import AvaliacaoSerializer
from .permissoes import PermissaoAvaliacao
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from notificacoes.utils import enviar_notificacao


class AvaliacaoViewSet(viewsets.ModelViewSet):
    """
    CRUD completo de avaliações.
    Inclui:
    - Listagem de avaliações do usuário logado (feitas e recebidas)
    - Criação com notificação automática
    """
    queryset = Avaliacao.objects.all().select_related(
        "avaliador", "avaliado", "contrato"
    ).order_by("-data_avaliacao", "-id")
    
    serializer_class = AvaliacaoSerializer
    permission_classes = [IsAuthenticated, PermissaoAvaliacao]

    def get_queryset(self):
        """
        Retorna avaliações conforme permissões:
        - Superusuário → todas
        - Usuário comum → avaliações feitas ou recebidas
        """
        user = self.request.user
        
        if user.is_superuser:
            return self.queryset
        
        return (
            Avaliacao.objects
            .filter(models.Q(avaliador=user) | models.Q(avaliado=user))
            .select_related("avaliador", "avaliado", "contrato")
            .distinct()
            .order_by("-data_avaliacao", "-id")
        )

    def perform_create(self, serializer):
        """
        Cria uma nova avaliação e envia notificação automática ao avaliado.
        """
        avaliacao = serializer.save(avaliador=self.request.user)
        
        # Notificação ao avaliado
        enviar_notificacao(
            usuario=avaliacao.avaliado,
            mensagem=(
                f"Você recebeu uma nova avaliação de {avaliacao.avaliador.nome}: "
                f"'{avaliacao.comentario[:50]}...'"
            ),
            link="/avaliacoes"
        )

    @action(detail=False, methods=["get"])
    def feitas(self, request):
        """Retorna avaliações feitas pelo usuário logado"""
        avaliacoes = (
            Avaliacao.objects
            .filter(avaliador=request.user)
            .select_related("avaliador", "avaliado", "contrato")
            .order_by("-data_avaliacao", "-id")
        )
        serializer = self.get_serializer(avaliacoes, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def recebidas(self, request):
        """Retorna avaliações recebidas pelo usuário logado"""
        avaliacoes = (
            Avaliacao.objects
            .filter(avaliado=request.user)
            .select_related("avaliador", "avaliado", "contrato")
            .order_by("-data_avaliacao", "-id")
        )
        serializer = self.get_serializer(avaliacoes, many=True)
        return Response(serializer.data)