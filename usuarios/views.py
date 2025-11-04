from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils.encoding import force_str, force_bytes
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.contrib.auth.tokens import default_token_generator
from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.db.models import Q, Count

from .models import Usuario
from .serializers import (
    UsuarioSerializer,
    TrocaSenhaSerializer,
    UsuarioPublicoSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)
from .permissoes import PermissaoUsuario
from notificacoes.utils import enviar_notificacao

# Importações adicionais
from avaliacoes.models import Avaliacao
from avaliacoes.serializers import AvaliacaoSerializer
from propostas.models import Proposta
from contratos.models import Contrato


class UsuarioViewSet(viewsets.ModelViewSet):
    """
    CRUD de usuários + endpoints adicionais.
    Inclui:
    - /usuarios/ → listagem com regras por tipo
    - /usuarios/{id}/perfil_publico/
    - /usuarios/{id}/avaliacoes_publicas/
    - /usuarios/{id}/metricas_performance/
    - /usuarios/me/resumo/
    """
    serializer_class = UsuarioSerializer
    queryset = Usuario.objects.all().order_by("-id")  # ✅ ordenação global adicionada

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        elif self.action in ["perfil_publico", "avaliacoes_publicas", "metricas_performance"]:
            return [AllowAny()]
        elif self.action in ["retrieve", "list"]:
            return [IsAuthenticated()]
        elif self.action in [
            "update", "partial_update", "destroy", "alterar_senha", "excluir_conta", "resumo"
        ]:
            return [IsAuthenticated(), PermissaoUsuario()]
        return [IsAuthenticated()]

    def get_queryset(self):
        """
        Regras de visibilidade de usuários conforme tipo:
        - superuser: todos (com filtro opcional ?tipo=)
        - contratante: vê apenas freelancers
        - freelancer: vê apenas a si mesmo
        """
        user = self.request.user
        tipo = self.request.query_params.get("tipo")

        if user.is_superuser:
            queryset = Usuario.objects.all().order_by("-id")  # ✅ garante ordenação
            if tipo:
                queryset = queryset.filter(tipo=tipo)
            return queryset

        if hasattr(user, "tipo") and user.tipo == "contratante":
            return Usuario.objects.filter(tipo="freelancer").order_by("-id")  # ✅ ordenado

        if hasattr(user, "tipo") and user.tipo == "freelancer":
            return Usuario.objects.filter(id=user.id).order_by("-id")  # ✅ ordenado

        return Usuario.objects.none()

    # ------------------ PERFIL PÚBLICO ------------------
    @action(
        detail=True,
        methods=["get"],
        url_path="perfil_publico",
        url_name="perfil_publico",
        permission_classes=[AllowAny],
    )
    def perfil_publico(self, request, pk=None):
        """Retorna dados públicos de qualquer usuário (sem restrição)."""
        try:
            usuario = (
                Usuario.objects
                .filter(pk=pk)
                .annotate(
                    trabalhos_publicados_count=Count("trabalhos_publicados", distinct=True),
                    contratos_concluidos_count=Count(
                        "contratos_freelancer",
                        filter=Q(contratos_freelancer__status="concluido"),
                        distinct=True,
                    ),
                )
                .get()
            )
        except Usuario.DoesNotExist:
            return Response({"detail": "Usuário não encontrado."}, status=404)

        serializer = UsuarioPublicoSerializer(usuario, context={"request": request})
        return Response(serializer.data)

    # ------------------ AVALIAÇÕES PÚBLICAS ------------------
    @action(
        detail=True,
        methods=["get"],
        url_path="avaliacoes_publicas",
        url_name="avaliacoes_publicas",
        permission_classes=[AllowAny],
    )
    def avaliacoes_publicas(self, request, pk=None):
        """Retorna avaliações recebidas por um usuário."""
        try:
            usuario = Usuario.objects.get(pk=pk)
        except Usuario.DoesNotExist:
            return Response({"detail": "Usuário não encontrado."}, status=404)

        avaliacoes = Avaliacao.objects.filter(avaliado=usuario).select_related("avaliador").order_by("-id")
        serializer = AvaliacaoSerializer(avaliacoes, many=True, context={"request": request})
        return Response(serializer.data)

    # ------------------ MÉTRICAS DE PERFORMANCE ------------------
    @action(
        detail=True,
        methods=["get"],
        url_path="metricas_performance",
        url_name="metricas_performance",
        permission_classes=[AllowAny],
    )
    def metricas_performance(self, request, pk=None):
        """Retorna métricas de performance para freelancers."""
        try:
            usuario = Usuario.objects.get(pk=pk)
        except Usuario.DoesNotExist:
            return Response({"detail": "Usuário não encontrado."}, status=404)

        if usuario.tipo != "freelancer":
            return Response({
                "taxa_conclusao": None,
                "taxa_entrega_prazo": None,
                "taxa_recontratacao": None,
                "total_contratos": 0,
                "contratos_concluidos": 0,
                "contratos_cancelados": 0,
                "mensagem": "Métricas disponíveis apenas para freelancers"
            })

        contratos_total = Contrato.objects.filter(freelancer=usuario)
        contratos_concluidos = contratos_total.filter(status="concluido")
        contratos_cancelados = contratos_total.filter(status="cancelado")

        total = contratos_total.count()
        concluidos = contratos_concluidos.count()
        cancelados = contratos_cancelados.count()

        taxa_conclusao = round((concluidos / total) * 100, 1) if total > 0 else 0

        entregas_no_prazo = 0
        for contrato in contratos_concluidos.select_related("trabalho"):
            if contrato.data_entrega and contrato.trabalho.prazo:
                if contrato.data_entrega <= contrato.trabalho.prazo:
                    entregas_no_prazo += 1
        taxa_entrega_prazo = (
            round((entregas_no_prazo / concluidos) * 100, 1) if concluidos > 0 else 0
        )

        contratantes_counts = contratos_total.values("contratante").annotate(num_contratos=Count("id"))
        total_contratantes_unicos = contratantes_counts.count()
        contratantes_recontrataram = sum(1 for c in contratantes_counts if c["num_contratos"] >= 2)
        taxa_recontratacao = (
            round((contratantes_recontrataram / total_contratantes_unicos) * 100, 1)
            if total_contratantes_unicos > 0 else 0
        )

        return Response({
            "taxa_conclusao": taxa_conclusao,
            "taxa_entrega_prazo": taxa_entrega_prazo,
            "taxa_recontratacao": taxa_recontratacao,
            "total_contratos": total,
            "contratos_concluidos": concluidos,
            "contratos_cancelados": cancelados,
        })

    # ------------------ ALTERAR SENHA ------------------
    @action(detail=True, methods=["post"], url_path="alterar_senha")
    def alterar_senha(self, request, pk=None):
        """Permite que o usuário altere a própria senha."""
        user = self.get_object()
        serializer = TrocaSenhaSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data["nova_senha"])
        user.save()

        enviar_notificacao(
            usuario=user,
            mensagem="Sua senha foi alterada com sucesso.",
            link="/minha-conta",
        )
        return Response({"mensagem": "Senha alterada com sucesso!"}, status=200)

    # ------------------ EXCLUIR CONTA ------------------
    @action(detail=True, methods=["post"], url_path="excluir_conta")
    def excluir_conta(self, request, pk=None):
        """Permite que o usuário exclua a própria conta."""
        user = self.get_object()
        senha = request.data.get("senha")
        if not senha:
            return Response({"erro": "Senha obrigatória."}, status=400)
        if not user.check_password(senha):
            return Response({"erro": "Senha incorreta."}, status=400)

        enviar_notificacao(usuario=user, mensagem="Sua conta foi excluída com sucesso.", link="/")
        user.delete()
        return Response({"mensagem": "Conta excluída com sucesso!"}, status=200)

    # ------------------ RESUMO ------------------
    @action(detail=False, methods=["get"], url_path="me/resumo")
    def resumo(self, request):
        """Resumo de atividades do usuário logado (Dashboard)."""
        user = request.user
        resumo = {}

        if user.tipo == "freelancer":
            propostas = Proposta.objects.filter(freelancer=user)
            resumo["enviadas"] = propostas.count()
            resumo["aceitas"] = propostas.filter(status="aceita").count()
            resumo["recusadas"] = propostas.filter(status="recusada").count()

        elif user.tipo == "contratante":
            propostas = Proposta.objects.filter(trabalho__contratante=user)
            resumo["recebidas"] = propostas.count()
            resumo["pendentes"] = propostas.filter(status="pendente").count()
            resumo["aceitas"] = propostas.filter(status="aceita").count()

        avaliacoes = Avaliacao.objects.filter(avaliado=user)
        resumo["totalAvaliacoes"] = avaliacoes.count()
        resumo["mediaAvaliacao"] = (
            round(sum(a.nota for a in avaliacoes) / avaliacoes.count(), 2)
            if avaliacoes.exists() else None
        )
        return Response(resumo)


# ------------------ USUÁRIO LOGADO ------------------
class UsuarioMeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UsuarioSerializer(request.user, context={"request": request})
        return Response(serializer.data)

    def patch(self, request):
        serializer = UsuarioSerializer(
            request.user, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


# ------------------ RECUPERAÇÃO DE SENHA ------------------
class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip().lower()

        try:
            user = Usuario.objects.get(email__iexact=email)
        except Usuario.DoesNotExist:
            user = None

        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
            reset_link = f"{frontend_url}/reset-password/{uid}/{token}"

            context = {
                "user": user,
                "reset_link": reset_link,
                "site_name": getattr(settings, "SITE_NAME", "ProFreelaBR"),
            }

            subject = f"[{context['site_name']}] Redefinição de senha"
            text_body = render_to_string("emails/password_reset.txt", context)
            html_body = render_to_string("emails/password_reset.html", context)

            msg = EmailMultiAlternatives(subject, text_body, settings.DEFAULT_FROM_EMAIL, [user.email])
            msg.attach_alternative(html_body, "text/html")
            msg.send(fail_silently=False)

        return Response(
            {"detail": "Se este e-mail estiver cadastrado, você receberá instruções para redefinir sua senha."},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        uid = serializer.validated_data["uid"]
        token = serializer.validated_data["token"]
        new_password = serializer.validated_data["new_password"]

        try:
            uid_int = force_str(urlsafe_base64_decode(uid))
            user = Usuario.objects.get(pk=uid_int)
        except Exception:
            return Response({"detail": "Link inválido ou expirado."}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({"detail": "Token inválido ou expirado."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({"detail": "Senha redefinida com sucesso."}, status=status.HTTP_200_OK)
