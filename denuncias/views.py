from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.exceptions import ValidationError, PermissionDenied

from .models import Denuncia, DenunciaProva
from .serializers import DenunciaSerializer
from notificacoes.utils import enviar_notificacao


class DenunciaViewSet(viewsets.ModelViewSet):
    """
    CRUD + sistema de moderação (admin):
    - /marcar-analisando/
    - /marcar-procedente/
    - /marcar-improcedente/
    """
    queryset = Denuncia.objects.all().select_related(
        "denunciante", "denunciado"
    ).prefetch_related("provas")
    serializer_class = DenunciaSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    parser_classes = [MultiPartParser, FormParser, JSONParser]

    # ---------------------------------------------------------
    # 🔍 FILTRO (admin vê tudo, usuários veem suas próprias)
    # ---------------------------------------------------------
    def get_queryset(self):
        user = self.request.user
        tipo = (self.request.query_params.get("tipo") or "").lower()

        base = self.queryset.order_by("-data_criacao")

        if user.is_superuser:
            if tipo == "recebidas":
                return base.filter(denunciado=user)
            if tipo == "enviadas":
                return base.filter(denunciante=user)
            return base

        if tipo == "recebidas":
            return base.filter(denunciado=user)

        return base.filter(denunciante=user)

    # ---------------------------------------------------------
    # 📨 CRIAÇÃO DA DENÚNCIA (usuário comum)
    # ---------------------------------------------------------
    def perform_create(self, serializer):
        user = self.request.user
        denunciado = serializer.validated_data.get("denunciado")

        # Impede auto-denúncia
        if denunciado == user:
            raise ValidationError("Você não pode se auto-denunciar.")

        # Cria a denúncia
        instancia = serializer.save(denunciante=user)

        # Provas obrigatórias
        arquivos = self.request.FILES.getlist("provas")
        if not arquivos:
            raise ValidationError("É obrigatório anexar ao menos uma prova (print).")

        # Salva as provas
        for arquivo in arquivos:
            if arquivo.size > 5 * 1024 * 1024:
                raise ValidationError("Cada arquivo deve ter no máximo 5MB.")

            if not arquivo.name.lower().endswith((".jpg", ".jpeg", ".png")):
                raise ValidationError("Apenas arquivos JPG/PNG são permitidos.")

            DenunciaProva.objects.create(denuncia=instancia, arquivo=arquivo)

        # Notifica denunciado
        enviar_notificacao(
            usuario=denunciado,
            mensagem="Você recebeu uma nova denúncia.",
            link=f"/minhas-denuncias?id={instancia.id}"
        )

    # ---------------------------------------------------------
    # ⭐ AÇÕES ADMINISTRATIVAS DE MODERAÇÃO
    # (Opção A — marcar procedente NÃO aplica punição)
    # ---------------------------------------------------------

    # 🔵 1. MARCAR COMO "ANALISANDO"
    @action(detail=True, methods=["patch"], url_path="marcar-analisando")
    def marcar_analisando(self, request, pk=None):
        denuncia = self.get_object()

        if not request.user.is_superuser:
            raise PermissionDenied("Apenas administradores podem fazer isso.")

        denuncia.status = "Analisando"
        denuncia.save(update_fields=["status"])

        return Response({"mensagem": "Denúncia marcada como ANALISANDO."})

    # 🟡 2. MARCAR COMO "PROCEDENTE"
    @action(detail=True, methods=["patch"], url_path="marcar-procedente")
    def marcar_procedente(self, request, pk=None):
        denuncia = self.get_object()

        if not request.user.is_superuser:
            raise PermissionDenied("Apenas administradores podem fazer isso.")

        resposta = request.data.get("resposta_admin", "").strip()

        denuncia.status = "Resolvida"
        denuncia.resposta_admin = resposta
        denuncia.save(update_fields=["status", "resposta_admin"])

        # Notifica denunciante
        enviar_notificacao(
            usuario=denuncia.denunciante,
            mensagem="Sua denúncia foi considerada procedente.",
            link=f"/minhas-denuncias?id={denuncia.id}"
        )

        # Notifica denunciado
        enviar_notificacao(
            usuario=denuncia.denunciado,
            mensagem="Uma denúncia contra você foi considerada procedente.",
            link=f"/minhas-denuncias?id={denuncia.id}"
        )

        return Response({
            "mensagem": "Denúncia marcada como PROCEDENTE. Punições agora podem ser aplicadas.",
            "permitir_punicao": True,
            "denuncia_id": denuncia.id
        })

    # 🔴 3. MARCAR COMO "IMPROCEDENTE"
    @action(detail=True, methods=["patch"], url_path="marcar-improcedente")
    def marcar_improcedente(self, request, pk=None):
        denuncia = self.get_object()

        if not request.user.is_superuser:
            raise PermissionDenied("Apenas administradores podem fazer isso.")

        resposta = request.data.get("resposta_admin", "").strip()

        denuncia.status = "Resolvida"
        denuncia.resposta_admin = resposta
        denuncia.save(update_fields=["status", "resposta_admin"])

        enviar_notificacao(
            usuario=denuncia.denunciante,
            mensagem="Sua denúncia foi avaliada e considerada improcedente.",
            link=f"/minhas-denuncias?id={denuncia.id}"
        )

        return Response({"mensagem": "Denúncia marcada como IMPROCEDENTE."})
