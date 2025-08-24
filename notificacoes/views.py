from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.decorators import action
from .models import Notificacao
from .serializers import NotificacaoSerializer

class NotificacaoViewSet(viewsets.ModelViewSet):
    serializer_class = NotificacaoSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notificacao.objects.filter(usuario=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        """Permite marcar como lida"""
        instance = self.get_object()
        instance.lida = request.data.get("lida", True)
        instance.save()
        return Response(self.get_serializer(instance).data)

    @action(detail=False, methods=["post"])
    def marcar_todas_lidas(self, request):
        """Marca todas as notificações do usuário como lidas"""
        total = Notificacao.objects.filter(usuario=request.user, lida=False).update(lida=True)
        return Response({"mensagem": f"{total} notificações marcadas como lidas."}, status=status.HTTP_200_OK)
