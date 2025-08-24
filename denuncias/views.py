from rest_framework import viewsets, permissions
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import ValidationError

from .models import Denuncia
from .serializers import DenunciaSerializer
from notificacoes.utils import enviar_notificacao

class DenunciaViewSet(viewsets.ModelViewSet):
    """
    Endpoints:
    /denuncias/               -> denúncias enviadas pelo usuário logado
    /denuncias/?tipo=enviadas -> denúncias enviadas
    /denuncias/?tipo=recebidas -> denúncias recebidas
    Admin pode ver todas passando tipo=todas.
    """
    queryset = Denuncia.objects.all()
    serializer_class = DenunciaSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        tipo = (self.request.query_params.get("tipo") or "").lower()

        base = (
            Denuncia.objects
            .select_related("denunciante", "denunciado")
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

        mensagem = "Você recebeu uma denúncia no seu perfil. Clique para visualizar."
        enviar_notificacao(
            usuario=denunciado,
            mensagem=mensagem[:255],
            link=f"/minhas-denuncias?id={instancia.id}"
        )

    def update(self, request, *args, **kwargs):
        instancia = self.get_object()
        resposta_anterior = instancia.resposta_admin

        response = super().update(request, *args, **kwargs)
        instancia.refresh_from_db()

        if instancia.resposta_admin and instancia.resposta_admin != resposta_anterior:
            if instancia.denunciante:
                enviar_notificacao(
                    usuario=instancia.denunciante,
                    mensagem=f"Sua denúncia sobre '{instancia.denunciado.nome}' foi respondida: {instancia.resposta_admin}"[:255],
                    link=f"/minhas-denuncias?id={instancia.id}"
                )
            if instancia.denunciado:
                enviar_notificacao(
                    usuario=instancia.denunciado,
                    mensagem=f"Você recebeu uma resposta de denúncia feita contra seu perfil: {instancia.resposta_admin}"[:255],
                    link=f"/minhas-denuncias?id={instancia.id}"
                )

        return response
