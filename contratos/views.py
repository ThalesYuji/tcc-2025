from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import models
from rest_framework import serializers

from .models import Contrato
from .serializers import ContratoSerializer
from .permissoes import PermissaoContrato
from notificacoes.utils import enviar_notificacao  # 🔹 Import para notificações


class ContratoViewSet(viewsets.ModelViewSet):
    queryset = Contrato.objects.all()
    serializer_class = ContratoSerializer
    permission_classes = [IsAuthenticated, PermissaoContrato]

    def get_queryset(self):
        """
        Admin vê todos os contratos.
        Usuário normal só vê contratos onde é cliente ou freelancer.
        """
        user = self.request.user
        if user.is_superuser:
            return Contrato.objects.all()
        return Contrato.objects.filter(
            models.Q(cliente=user) | models.Q(freelancer=user)
        ).distinct()

    def create(self, request, *args, **kwargs):
        """
        🚫 Bloqueia criação manual de contratos.
        Os contratos são criados automaticamente ao aceitar uma proposta.
        """
        return Response(
            {"detail": "A criação de contratos é automática ao aceitar uma proposta."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )

    def perform_update(self, serializer):
        """
        Impede que o contrato seja concluído manualmente.
        Apenas cancelamento ou mudanças administrativas são permitidas.
        A conclusão acontece automaticamente via Pagamento.
        """
        contrato_antigo = self.get_object()
        novo_status = self.request.data.get("status")

        # 🚫 Bloqueia tentativa de marcar como concluído manualmente
        if novo_status == "concluido":
            raise serializers.ValidationError(
                {"status": "O contrato só pode ser concluído automaticamente após pagamento aprovado."}
            )

        contrato_novo = serializer.save()

        # Se o status mudou, atualiza trabalho e notifica as partes
        if contrato_antigo.status != contrato_novo.status:
            trabalho = contrato_novo.trabalho
            cliente = contrato_novo.cliente
            freelancer = contrato_novo.freelancer

            if contrato_novo.status == "cancelado":
                # 🔹 Se não houver contrato ativo para este trabalho, reabrir
                if not Contrato.objects.filter(trabalho=trabalho, status="ativo").exists():
                    trabalho.status = "aberto"
                else:
                    trabalho.status = "cancelado"
                trabalho.save()

                # 🔹 Notifica as partes
                enviar_notificacao(
                    usuario=cliente,
                    mensagem=f"O contrato do trabalho '{trabalho.titulo}' foi cancelado.",
                    link=f"/contratos?id={contrato_novo.id}"
                )
                enviar_notificacao(
                    usuario=freelancer,
                    mensagem=f"O contrato do trabalho '{trabalho.titulo}' foi cancelado.",
                    link=f"/contratos?id={contrato_novo.id}"
                )

            elif contrato_novo.status == "ativo":
                trabalho.status = "em_andamento"
                trabalho.save()

                enviar_notificacao(
                    usuario=cliente,
                    mensagem=f"O contrato do trabalho '{trabalho.titulo}' está ativo.",
                    link=f"/contratos?id={contrato_novo.id}"
                )
                enviar_notificacao(
                    usuario=freelancer,
                    mensagem=f"O contrato do trabalho '{trabalho.titulo}' está ativo.",
                    link=f"/contratos?id={contrato_novo.id}"
                )

    def destroy(self, request, *args, **kwargs):
        """
        Apenas administradores podem deletar contratos.
        """
        instance = self.get_object()
        self.check_object_permissions(request, instance)
        return super().destroy(request, *args, **kwargs)
