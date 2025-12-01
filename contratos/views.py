from rest_framework import viewsets, status, serializers
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import models

from .models import Contrato
from .serializers import ContratoSerializer
from .permissoes import PermissaoContrato
from notificacoes.utils import enviar_notificacao


class ContratoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciamento de contratos.
    Admin vê todos.
    Usuários comuns veem apenas contratos onde são contratante ou freelancer.
    A criação é automática ao aceitar uma proposta.
    """
    serializer_class = ContratoSerializer
    permission_classes = [IsAuthenticated, PermissaoContrato]

    # =========================================================
    # LISTAGEM — Filtra contratos conforme o usuário
    # =========================================================
    def get_queryset(self):
        user = self.request.user
        qs_base = Contrato.objects.all().order_by("-id")

        if user.is_superuser:
            return qs_base

        return qs_base.filter(
            models.Q(contratante=user) | models.Q(freelancer=user)
        ).distinct()

    # =========================================================
    # BLOQUEIA CRIAÇÃO MANUAL
    # =========================================================
    def create(self, request, *args, **kwargs):
        return Response(
            {"detail": "A criação de contratos é automática ao aceitar uma proposta."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )

    # =========================================================
    # ATUALIZAÇÃO DE STATUS (cancelamento / reativação)
    # =========================================================
    def perform_update(self, serializer):
        contrato_antigo = self.get_object()
        novo_status = self.request.data.get("status")

        # 🚫 Bloqueio de conclusão manual
        if novo_status == "concluido":
            raise serializers.ValidationError(
                {"status": "O contrato só pode ser concluído automaticamente após pagamento aprovado."}
            )

        # Salva alterações
        contrato_novo = serializer.save()

        # Só executa lógica se o status realmente mudou
        if contrato_antigo.status != contrato_novo.status:

            trabalho = contrato_novo.trabalho
            contratante = contrato_novo.contratante
            freelancer = contrato_novo.freelancer

            # -----------------------------------------
            # CANCELAMENTO
            # -----------------------------------------
            if contrato_novo.status == "cancelado":

                # Se não houver outro contrato ativo, reabre o trabalho
                if not Contrato.objects.filter(trabalho=trabalho, status="ativo").exists():
                    trabalho.status = "aberto"
                else:
                    trabalho.status = "cancelado"
                trabalho.save()

                link = f"/contratos/{contrato_novo.id}"

                enviar_notificacao(
                    usuario=contratante,
                    mensagem=f"O contrato do trabalho '{trabalho.titulo}' foi cancelado.",
                    link=link
                )
                enviar_notificacao(
                    usuario=freelancer,
                    mensagem=f"O contrato do trabalho '{trabalho.titulo}' foi cancelado.",
                    link=link
                )

            # -----------------------------------------
            # REATIVAÇÃO
            # -----------------------------------------
            elif contrato_novo.status == "ativo":
                trabalho.status = "em_andamento"
                trabalho.save()

                link = f"/contratos/{contrato_novo.id}"

                enviar_notificacao(
                    usuario=contratante,
                    mensagem=f"O contrato do trabalho '{trabalho.titulo}' está ativo.",
                    link=link
                )
                enviar_notificacao(
                    usuario=freelancer,
                    mensagem=f"O contrato do trabalho '{trabalho.titulo}' está ativo.",
                    link=link
                )

    # =========================================================
    # DELETE — Somente admin
    # =========================================================
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.check_object_permissions(request, instance)
        return super().destroy(request, *args, **kwargs)
