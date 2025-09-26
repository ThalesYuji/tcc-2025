from rest_framework import viewsets, permissions
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser  # ✅ inclui JSONParser

from .models import Denuncia, DenunciaProva
from .serializers import DenunciaSerializer
from notificacoes.utils import enviar_notificacao


class DenunciaViewSet(viewsets.ModelViewSet):
    """
    Endpoints:
    /denuncias/                -> denúncias enviadas pelo usuário logado
    /denuncias/?tipo=enviadas  -> denúncias enviadas
    /denuncias/?tipo=recebidas -> denúncias recebidas
    Admin pode ver todas passando tipo=todas.
    """
    queryset = Denuncia.objects.all()
    serializer_class = DenunciaSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    # ✅ aceita multipart (anexos) e json (respostas admin)
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        user = self.request.user
        tipo = (self.request.query_params.get("tipo") or "").lower()

        base = (
            Denuncia.objects
            .select_related("denunciante", "denunciado")
            .prefetch_related("provas")
            .order_by("-data_criacao")
        )

        if user.is_superuser:
            if tipo == "recebidas":
                return base.filter(denunciado=user)
            if tipo == "enviadas":
                return base.filter(denunciante=user)
            return base

        if tipo == "recebidas":
            return base.filter(denunciado=user)
        return base.filter(denunciante=user)

    def perform_create(self, serializer):
        user = self.request.user
        denunciado = serializer.validated_data.get("denunciado")

        if denunciado == user:
            raise ValidationError("Você não pode se auto-denunciar.")

        instancia = serializer.save(denunciante=user)

        arquivos = self.request.FILES.getlist("provas")
        if not arquivos:
            raise ValidationError("É obrigatório anexar ao menos uma prova (print).")

        for arquivo in arquivos:
            if arquivo.size > 5 * 1024 * 1024:
                raise ValidationError("Cada arquivo deve ter no máximo 5MB.")
            if not arquivo.name.lower().endswith(('.jpg', '.jpeg', '.png')):
                raise ValidationError("Apenas imagens JPG ou PNG são permitidas.")
            DenunciaProva.objects.create(denuncia=instancia, arquivo=arquivo)

        enviar_notificacao(
            usuario=denunciado,
            mensagem="Você recebeu uma denúncia no seu perfil. Clique para visualizar."[:255],
            link=f"/minhas-denuncias?id={instancia.id}"
        )
