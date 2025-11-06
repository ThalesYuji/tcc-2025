from django.db.models import Q
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from django.utils import timezone

from .models import Mensagem
from .serializers import MensagemSerializer
from .permissoes import PermissaoMensagem
from notificacoes.utils import enviar_notificacao


class MensagemViewSet(viewsets.ModelViewSet):
    """
    ViewSet responsável por gerenciar o sistema de mensagens entre
    contratantes e freelancers dentro de um contrato.
    """
    serializer_class = MensagemSerializer
    permission_classes = [permissions.IsAuthenticated, PermissaoMensagem]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        user = self.request.user
        base = Mensagem.objects.select_related("contrato", "remetente", "destinatario")

        # 🔹 Admin vê todas as mensagens
        if user.is_superuser:
            return base.order_by("data_envio")

        # 🔹 Contratante ou freelancer veem apenas mensagens dos contratos em que participam
        return (
            base.filter(
                Q(contrato__contratante=user) | Q(contrato__freelancer=user)
            )
            .order_by("data_envio")
            .distinct()
        )

    def _conversa_response(self, contrato_id, status_code=status.HTTP_200_OK):
        """Retorna a lista atualizada de mensagens da conversa"""
        qs = (
            Mensagem.objects.filter(contrato_id=contrato_id)
            .select_related("remetente", "destinatario")
            .order_by("data_envio")
        )
        serializer = MensagemSerializer(qs, many=True, context={"request": self.request})
        return Response({"mensagens": serializer.data}, status=status_code)

    # -------------------------
    # CREATE
    # -------------------------
    def perform_create(self, serializer):
        """Cria uma nova mensagem (texto e/ou anexo permitido)."""
        texto = self.request.data.get("texto", "").strip()
        anexo = self.request.FILES.get("anexo")

        # 🚫 Bloqueia apenas se estiver completamente vazio
        if not texto and not anexo:
            raise ValidationError({"erro": "A mensagem deve conter texto ou anexo."})

        mensagem = serializer.save(remetente=self.request.user)

        # 🔔 Envia notificação ao destinatário
        if mensagem.destinatario and mensagem.destinatario != self.request.user:
            texto_notificacao = (
                f"Você recebeu uma nova mensagem de {mensagem.remetente.nome}"
                + (f": {mensagem.texto}" if mensagem.texto else ".")
            )
            enviar_notificacao(
                usuario=mensagem.destinatario,
                mensagem=texto_notificacao[:255],
                link=f"/contratos/{mensagem.contrato.id}/chat",  # ✅ Corrigido para rota real do React
            )
            
        # Guarda o ID do contrato para o retorno pós-criação
        self._last_contrato = mensagem.contrato.id

    def create(self, request, *args, **kwargs):
        super().create(request, *args, **kwargs)
        return self._conversa_response(self._last_contrato, status.HTTP_201_CREATED)

    # -------------------------
    # UPDATE
    # -------------------------
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.remetente != request.user:
            return Response({"detail": "Você não pode editar esta mensagem."}, status=403)

        super().update(request, *args, **kwargs)
        return self._conversa_response(instance.contrato.id, status.HTTP_200_OK)

    # -------------------------
    # DELETE (exclusão lógica com limite de 7 minutos)
    # -------------------------
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        if instance.remetente != request.user:
            return Response({"detail": "Você não pode excluir esta mensagem."}, status=403)

        # 🔹 Limite de exclusão: 7 minutos
        if (timezone.now() - instance.data_envio).total_seconds() > 420:
            return Response(
                {"detail": "Prazo para excluir mensagem expirou."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if instance.excluida:
            return Response({"detail": "Mensagem já estava excluída."}, status=400)

        instance.excluida = True
        instance.texto = "Mensagem excluída"
        instance.anexo = None
        instance.save(update_fields=["excluida", "texto", "anexo"])

        return self._conversa_response(instance.contrato.id, status.HTTP_200_OK)

    # -------------------------
    # GET CONVERSA
    # -------------------------
    @action(detail=False, methods=["get"])
    def conversa(self, request):
        contrato_id = request.query_params.get("contrato")
        if not contrato_id:
            return Response(
                {"detail": "Informe ?contrato=<id>."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return self._conversa_response(contrato_id, status.HTTP_200_OK)
