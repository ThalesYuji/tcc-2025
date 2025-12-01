from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.utils import timezone

from usuarios.models import Usuario
from denuncias.models import Denuncia
from notificacoes.utils import enviar_notificacao

from .models import Punicao
from .serializers import (
    AplicarAdvertenciaSerializer,
    AplicarSuspensaoSerializer,
    AplicarBanimentoSerializer,
    RemoverSuspensaoSerializer,
    PunicaoSerializer
)


# ============================================================
# 🔹 APLICAR ADVERTÊNCIA
# ============================================================
class AplicarAdvertenciaView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = AplicarAdvertenciaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        usuario_id = serializer.validated_data["usuario_id"]
        motivo = serializer.validated_data["motivo"]
        denuncia_id = serializer.validated_data.get("denuncia_id")

        try:
            usuario = Usuario.objects.get(id=usuario_id)
        except Usuario.DoesNotExist:
            return Response({"erro": "Usuário não encontrado."}, status=404)

        denuncia = (
            Denuncia.objects.filter(id=denuncia_id).first()
            if denuncia_id else None
        )

        Punicao.objects.create(
            usuario_punido=usuario,
            admin_responsavel=request.user,
            tipo="advertencia",
            motivo=motivo,
            denuncia_relacionada=denuncia,
        )

        enviar_notificacao(
            usuario=usuario,
            mensagem=f"Você recebeu uma advertência: {motivo}",
            link="/conta",
        )

        return Response({"mensagem": "Advertência aplicada com sucesso."})


# ============================================================
# 🔹 APLICAR SUSPENSÃO
# ============================================================
class AplicarSuspensaoView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = AplicarSuspensaoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        usuario_id = serializer.validated_data["usuario_id"]
        motivo = serializer.validated_data["motivo"]
        dias = serializer.validated_data["dias"]
        denuncia_id = serializer.validated_data.get("denuncia_id")

        try:
            usuario = Usuario.objects.get(id=usuario_id)
        except Usuario.DoesNotExist:
            return Response({"erro": "Usuário não encontrado."}, status=404)

        denuncia = (
            Denuncia.objects.filter(id=denuncia_id).first()
            if denuncia_id else None
        )

        validade = timezone.now() + timezone.timedelta(days=dias)

        # Atualiza status do usuário
        usuario.is_suspended_admin = True
        usuario.suspenso_ate = validade
        usuario.motivo_suspensao_admin = motivo
        usuario.save(update_fields=["is_suspended_admin", "suspenso_ate", "motivo_suspensao_admin"])

        # Registra punição
        Punicao.objects.create(
            usuario_punido=usuario,
            admin_responsavel=request.user,
            tipo="suspensao",
            motivo=motivo,
            denuncia_relacionada=denuncia,
            valido_ate=validade,
        )

        enviar_notificacao(
            usuario=usuario,
            mensagem=f"Sua conta foi suspensa por {dias} dias.",
            link="/conta",
        )

        return Response({"mensagem": "Suspensão aplicada com sucesso."})


# ============================================================
# 🔹 APLICAR BANIMENTO
# ============================================================
class AplicarBanimentoView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = AplicarBanimentoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        usuario_id = serializer.validated_data["usuario_id"]
        motivo = serializer.validated_data["motivo"]
        denuncia_id = serializer.validated_data.get("denuncia_id")

        try:
            usuario = Usuario.objects.get(id=usuario_id)
        except Usuario.DoesNotExist:
            return Response({"erro": "Usuário não encontrado."}, status=404)

        denuncia = (
            Denuncia.objects.filter(id=denuncia_id).first()
            if denuncia_id else None
        )

        # Aplica banimento ao usuário
        usuario.banido = True
        usuario.banido_em = timezone.now()
        usuario.motivo_banimento = motivo
        usuario.save(update_fields=["banido", "banido_em", "motivo_banimento"])

        # Registra a punição
        Punicao.objects.create(
            usuario_punido=usuario,
            admin_responsavel=request.user,
            tipo="banimento",
            motivo=motivo,
            denuncia_relacionada=denuncia,
            valido_ate=None,
        )

        enviar_notificacao(
            usuario=usuario,
            mensagem="Sua conta foi banida permanentemente.",
            link="/login",
        )

        return Response({"mensagem": "Banimento aplicado com sucesso."})


# ============================================================
# 🔹 REMOVER SUSPENSÃO MANUALMENTE
# ============================================================
class RemoverSuspensaoView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = RemoverSuspensaoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        usuario_id = serializer.validated_data["usuario_id"]

        try:
            usuario = Usuario.objects.get(id=usuario_id)
        except Usuario.DoesNotExist:
            return Response({"erro": "Usuário não encontrado."}, status=404)

        # Remove suspensão do usuário
        usuario.is_suspended_admin = False
        usuario.suspenso_ate = None
        usuario.motivo_suspensao_admin = None
        usuario.save()

        enviar_notificacao(
            usuario=usuario,
            mensagem="Sua suspensão foi removida por um administrador.",
            link="/conta",
        )

        return Response({"mensagem": "Suspensão removida com sucesso."})


# ============================================================
# 🔥 HISTÓRICO COMPLETO
# ============================================================
class HistoricoPunicoesView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        punicoes = Punicao.objects.order_by("-criado_em")
        serializer = PunicaoSerializer(punicoes, many=True)
        return Response(serializer.data)


# ============================================================
# 🔍 HISTÓRICO POR USUÁRIO
# ============================================================
class HistoricoPorUsuarioView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, usuario_id):
        punicoes = Punicao.objects.filter(usuario_punido_id=usuario_id).order_by("-criado_em")
        serializer = PunicaoSerializer(punicoes, many=True)
        return Response(serializer.data)


# ============================================================
# ❌ REMOVER REGISTRO DO HISTÓRICO
# ============================================================
class RemoverPunicaoView(APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, punicao_id):
        try:
            punicao = Punicao.objects.get(id=punicao_id)
        except Punicao.DoesNotExist:
            return Response({"erro": "Punição não encontrada."}, status=404)

        # Marca como removida (não apaga do banco)
        punicao.ativo = False
        punicao.removida_em = timezone.now()
        punicao.removida_por_admin = request.user
        punicao.save(update_fields=["ativo", "removida_em", "removida_por_admin"])

        return Response({"mensagem": "Punição removida do histórico."})
