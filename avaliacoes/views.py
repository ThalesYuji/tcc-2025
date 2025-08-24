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
    queryset = Avaliacao.objects.all()
    serializer_class = AvaliacaoSerializer
    permission_classes = [IsAuthenticated, PermissaoAvaliacao]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Avaliacao.objects.all()
        return Avaliacao.objects.filter(
            models.Q(avaliador=user) | models.Q(avaliado=user)
        ).distinct()

    def perform_create(self, serializer):
        avaliacao = serializer.save(avaliador=self.request.user)

        # 🔹 Notificação ao avaliado
        enviar_notificacao(
            usuario=avaliacao.avaliado,
            mensagem=(
                f"Você recebeu uma nova avaliação de {avaliacao.avaliador.nome}: "
                f"'{avaliacao.comentario}'"
            ),
            link="/avaliacoes"
        )

    @action(detail=False, methods=['get'])
    def feitas(self, request):
        """Avaliações feitas pelo usuário logado"""
        avaliacoes = Avaliacao.objects.filter(avaliador=request.user)
        serializer = self.get_serializer(avaliacoes, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def recebidas(self, request):
        """Avaliações recebidas pelo usuário logado"""
        avaliacoes = Avaliacao.objects.filter(avaliado=request.user)
        serializer = self.get_serializer(avaliacoes, many=True)
        return Response(serializer.data)
