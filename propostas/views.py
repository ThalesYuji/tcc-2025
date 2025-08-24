from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from .models import Proposta
from .serializers import PropostaSerializer, AlterarStatusSerializer
from .permissoes import PermissaoProposta
from notificacoes.utils import enviar_notificacao  # 🔹 Função central de notificações


class PropostaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciamento de propostas.
    - Freelancers só veem suas próprias propostas.
    - Clientes só veem propostas de seus trabalhos.
    - Admin pode ver todas.
    """
    queryset = Proposta.objects.all()
    serializer_class = PropostaSerializer
    permission_classes = [IsAuthenticated, PermissaoProposta]

    def get_queryset(self):
        user = self.request.user

        if user.is_superuser:
            return Proposta.objects.all()

        if user.tipo == 'freelancer':
            return Proposta.objects.filter(freelancer=user)

        if user.tipo == 'cliente':
            return Proposta.objects.filter(trabalho__cliente=user)

        return Proposta.objects.none()

    def perform_create(self, serializer):
        """
        Ao criar proposta, vincula ao freelancer logado e notifica o cliente dono do trabalho.
        """
        proposta = serializer.save(freelancer=self.request.user)

        enviar_notificacao(
            usuario=proposta.trabalho.cliente,
            mensagem=f"Você recebeu uma nova proposta para o trabalho '{proposta.trabalho.titulo}'.",
            link=f"/propostas?id={proposta.id}"
        )

    def perform_update(self, serializer):
        """
        Bloqueia atualização direta do status por esse endpoint.
        """
        if 'status' in self.request.data:
            return Response(
                {"erro": "O status deve ser alterado apenas via endpoint específico."},
                status=status.HTTP_400_BAD_REQUEST
            )
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        """
        Apenas propostas pendentes podem ser excluídas.
        """
        proposta = self.get_object()

        if proposta.status != 'pendente':
            return Response(
                {"erro": "Não é permitido excluir propostas que já foram aceitas ou recusadas."},
                status=status.HTTP_400_BAD_REQUEST
            )

        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['patch'], url_path='alterar-status')
    def alterar_status(self, request, pk=None):
        """
        Permite que o cliente (ou admin) altere o status da proposta:
        - Aceitar: cria contrato e recusa outras propostas pendentes do mesmo trabalho.
        - Recusar: atualiza status e, se necessário, reabre o trabalho.
        """
        proposta = self.get_object()

        if proposta.status != 'pendente':
            return Response(
                {"erro": "Status já definido. Não é possível alterar novamente."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if request.user != proposta.trabalho.cliente and not request.user.is_superuser:
            return Response(
                {"erro": "Apenas o cliente do trabalho ou admin pode alterar o status."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = AlterarStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        novo_status = serializer.validated_data['status']

        # ✅ Aceitar proposta
        if novo_status == 'aceita':
            from contratos.models import Contrato

            if Contrato.objects.filter(proposta=proposta).exists():
                return Response(
                    {"erro": "Já existe um contrato para esta proposta."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            proposta.status = 'aceita'
            proposta.save()

            # ❌ Recusar todas as outras propostas pendentes
            Proposta.objects.filter(
                trabalho=proposta.trabalho,
                status='pendente'
            ).exclude(id=proposta.id).update(status='recusada')

            # 📌 Atualiza status do trabalho
            trabalho = proposta.trabalho
            trabalho.status = 'em_andamento'
            trabalho.save()

            # 📄 Cria contrato com valor da proposta
            contrato = Contrato.objects.create(
                proposta=proposta,
                trabalho=trabalho,
                cliente=trabalho.cliente,
                freelancer=proposta.freelancer,
                valor=proposta.valor  # ✅ Corrigido: salva o valor da proposta
            )

            # 🔹 Notifica freelancer
            enviar_notificacao(
                usuario=proposta.freelancer,
                mensagem=f"Sua proposta para o trabalho '{trabalho.titulo}' foi aceita! Contrato criado.",
                link=f"/contratos?id={contrato.id}"
            )

            return Response(
                {
                    "mensagem": "Status alterado para 'aceita', contrato criado e trabalho marcado como 'em andamento'.",
                    "contrato_id": contrato.id
                },
                status=status.HTTP_200_OK
            )

        # ❌ Recusar proposta
        elif novo_status == 'recusada':
            proposta.status = 'recusada'
            proposta.save()

            trabalho = proposta.trabalho

            # 🔹 Se não houver nenhuma proposta aceita, reabre o trabalho
            if not Proposta.objects.filter(trabalho=trabalho, status='aceita').exists():
                trabalho.status = 'aberto'
                trabalho.save()

            # 🔹 Notifica freelancer
            enviar_notificacao(
                usuario=proposta.freelancer,
                mensagem=f"Sua proposta para o trabalho '{trabalho.titulo}' foi recusada.",
                link=f"/propostas?id={proposta.id}"
            )

            return Response(
                {"mensagem": f"Status alterado para '{proposta.status}' com sucesso."},
                status=status.HTTP_200_OK
            )
