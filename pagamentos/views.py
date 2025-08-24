# pagamentos/views.py
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from .models import Pagamento
from .serializers import PagamentoSerializer
from .permissoes import PermissaoPagamento
from notificacoes.utils import enviar_notificacao

class PagamentoViewSet(viewsets.ModelViewSet):
    queryset = Pagamento.objects.all()
    serializer_class = PagamentoSerializer
    permission_classes = [IsAuthenticated, PermissaoPagamento]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Pagamento.objects.all()

        return Pagamento.objects.filter(
            Q(cliente=user) |
            Q(contrato__cliente=user) |
            Q(contrato__freelancer=user)
        ).distinct()

    def perform_create(self, serializer):
        pagamento = serializer.save()
        contrato = pagamento.contrato

        # 🔹 Valida valor
        if pagamento.valor != contrato.valor:
            raise ValueError(
                f"O valor do pagamento ({pagamento.valor}) deve ser exatamente igual ao contrato ({contrato.valor})."
            )

        # 🔹 Notificações
        enviar_notificacao(
            usuario=contrato.cliente,
            mensagem=f"Seu pagamento para o contrato '{contrato.trabalho.titulo}' foi registrado.",
            link=f"/contratos/{contrato.id}/pagamento"
        )
        enviar_notificacao(
            usuario=contrato.freelancer,
            mensagem=f"Você recebeu um pagamento referente ao contrato '{contrato.trabalho.titulo}'.",
            link=f"/contratos/{contrato.id}/pagamento"
        )

        # 🔹 Se aprovado já na criação → conclui contrato
        if pagamento.status == "aprovado":
            self._concluir_contrato(contrato)

    def perform_update(self, serializer):
        pagamento = serializer.save()
        contrato = pagamento.contrato

        if pagamento.valor != contrato.valor:
            raise ValueError(
                f"O valor do pagamento ({pagamento.valor}) deve ser exatamente igual ao contrato ({contrato.valor})."
            )

        if pagamento.status == "aprovado" and contrato.status != "concluido":
            self._concluir_contrato(contrato)

    def _concluir_contrato(self, contrato):
        contrato.status = "concluido"
        contrato.trabalho.status = "concluido"
        contrato.trabalho.save()
        contrato.save()

        # 🔹 Notificações de conclusão
        enviar_notificacao(
            usuario=contrato.cliente,
            mensagem=f"O contrato do trabalho '{contrato.trabalho.titulo}' foi concluído automaticamente após o pagamento.",
            link=f"/contratos/{contrato.id}"
        )
        enviar_notificacao(
            usuario=contrato.freelancer,
            mensagem=f"O contrato do trabalho '{contrato.trabalho.titulo}' foi concluído automaticamente após o pagamento.",
            link=f"/contratos/{contrato.id}"
        )
