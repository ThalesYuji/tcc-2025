# punicoes/views_historico.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.utils import timezone

from .models import Punicao
from .serializers import PunicaoSerializer
from usuarios.models import Usuario


# ============================================================
# 🔹 1) LISTAR HISTÓRICO COMPLETO DE PUNIÇÕES
# ============================================================
class HistoricoPunicoesView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        punicoes = Punicao.objects.select_related(
            "usuario_punido",
            "admin_responsavel",
            "removida_por_admin",
            "denuncia_relacionada"
        ).order_by("-criado_em")

        return Response(PunicaoSerializer(punicoes, many=True).data)


# ============================================================
# 🔹 2) LISTAR HISTÓRICO POR USUÁRIO
# ============================================================
class HistoricoPorUsuarioView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, usuario_id):
        punicoes = Punicao.objects.filter(
            usuario_punido_id=usuario_id
        ).select_related(
            "usuario_punido",
            "admin_responsavel",
            "removida_por_admin",
            "denuncia_relacionada"
        ).order_by("-criado_em")

        return Response(PunicaoSerializer(punicoes, many=True).data)


# ============================================================
# 🔹 3) REMOVER PUNIÇÃO (REVERSÃO)
# ============================================================
class RemoverPunicaoView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, punicao_id):
        try:
            punicao = Punicao.objects.get(id=punicao_id)
        except Punicao.DoesNotExist:
            return Response({"erro": "Punição não encontrada."}, status=404)

        if not punicao.ativo:
            return Response({"erro": "Esta punição já está inativa."}, status=400)

        # Marca punição como removida
        punicao.ativo = False
        punicao.removida_em = timezone.now()
        punicao.removida_por_admin = request.user
        punicao.save()

        usuario = punicao.usuario_punido

        # ============================================================
        # 🔄 Reverter efeitos no usuário, se aplicável
        # ============================================================

        # Suspensão → desativar suspensão
        if punicao.tipo == "suspensao":
            usuario.is_suspended_admin = False
            usuario.suspenso_ate = None
            usuario.motivo_suspensao_admin = None
            usuario.save(update_fields=["is_suspended_admin", "suspenso_ate", "motivo_suspensao_admin"])

        # Banimento → reverter banimento
        if punicao.tipo == "banimento":
            usuario.banido = False
            usuario.banido_em = None
            usuario.motivo_banimento = None
            usuario.save(update_fields=["banido", "banido_em", "motivo_banimento"])

        # Advertência → não altera nada no usuário

        return Response({"mensagem": "Punição removida com sucesso."})
