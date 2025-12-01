import threading
import time
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.tokens import default_token_generator
from django.db.models import Q, Count

# Django REST Framework
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action

# Modelos e Serializers locais
from .models import Usuario
from .serializers import (
    UsuarioSerializer,
    TrocaSenhaSerializer,
    UsuarioPublicoSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)

# Permissões e utilidades do app
from .permissoes import PermissaoUsuario
from notificacoes.utils import enviar_notificacao

# Integrações externas
from emails.utils import enviar_email_sendgrid  # ✅ Envio de e-mails via API SendGrid

# Outros apps relacionados
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
    - /usuarios/me/alterar_senha/ (POST)
    - /usuarios/me/excluir_conta/ (POST)
    - /usuarios/me/desativar/ (POST)   ← novo
    - /usuarios/me/reativar/  (POST)   ← novo
    - /usuarios/me/resumo/ (GET)
    """
    serializer_class = UsuarioSerializer
    queryset = Usuario.objects.all().order_by("-id") 

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        elif self.action in ["perfil_publico", "avaliacoes_publicas", "metricas_performance"]:
            return [AllowAny()]
        elif self.action in ["retrieve", "list"]:
            return [IsAuthenticated()]
        elif self.action in [
            "update", "partial_update", "destroy",
            "alterar_senha_me", "excluir_conta_me", "resumo",
            "desativar_me", "reativar_me",  
        ]:
            
            if self.action in ["update", "partial_update", "destroy"]:
                return [IsAuthenticated(), PermissaoUsuario()]
            return [IsAuthenticated()]
        return [IsAuthenticated()]

    def get_queryset(self):
        """
        Regras de visibilidade de usuários conforme tipo:
        - superuser: todos (com filtro opcional ?tipo=)
        - contratante: vê apenas freelancers **ativos** (não desativados)
        - freelancer: vê apenas a si mesmo
        """
        user = self.request.user
        tipo = self.request.query_params.get("tipo")

        if user.is_superuser:
            queryset = Usuario.objects.all().order_by("-id")
            if tipo:
                queryset = queryset.filter(tipo=tipo)
            return queryset

        if getattr(user, "tipo", None) == "contratante":
            # Oculta perfis em modo leitura (desativados) das listagens públicas
            return Usuario.objects.filter(tipo="freelancer", is_suspended_self=False).order_by("-id")

        if getattr(user, "tipo", None) == "freelancer":
            return Usuario.objects.filter(id=user.id).order_by("-id")

        return Usuario.objects.none()

    # PERFIL PÚBLICO
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

    # AVALIAÇÕES PÚBLICAS
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

        avaliacoes = (
            Avaliacao.objects
            .filter(avaliado=usuario)
            .select_related("avaliador")
            .order_by("-id")
        )
        serializer = AvaliacaoSerializer(avaliacoes, many=True, context={"request": request})
        return Response(serializer.data)

    # MÉTRICAS DE PERFORMANCE
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

    # DADOS PÚBLICOS
    @action(
        detail=True,
        methods=["get"],
        url_path="dados_publicos",
        permission_classes=[AllowAny],
    )
    def dados_publicos(self, request, pk=None):
        """
        Endpoint PÚBLICO usado pela tela de denúncia.
        Permite buscar nome, tipo e email do usuário a ser denunciado.
        NÃO é bloqueado pelo get_queryset().
        """
        try:
            usuario = Usuario.objects.get(pk=pk)
        except Usuario.DoesNotExist:
            return Response({"detail": "Usuário não encontrado."}, status=404)

        return Response({
            "id": usuario.id,
            "nome": usuario.nome,
            "tipo": usuario.tipo,
            "email": usuario.email,
        })

    # ALTERAR SENHA
    @action(detail=False, methods=["post"], url_path="me/alterar_senha", permission_classes=[IsAuthenticated])
    def alterar_senha_me(self, request):
        """Troca a senha do usuário logado (não depende de {id})."""
        serializer = TrocaSenhaSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        user.set_password(serializer.validated_data["nova_senha"])
        user.save()

        enviar_notificacao(
            usuario=user,
            mensagem="Sua senha foi alterada com sucesso.",
            link="/minha-conta",
        )
        return Response({"mensagem": "Senha alterada com sucesso!"}, status=200)

    # EXCLUIR CONTA
    @action(detail=False, methods=["post"], url_path="me/excluir_conta", permission_classes=[IsAuthenticated])
    def excluir_conta_me(self, request):
        """Exclui a conta do usuário logado, sem depender do get_queryset()."""
        user = request.user
        senha = request.data.get("senha")
        if not senha:
            return Response({"erro": "Senha obrigatória."}, status=400)
        if not user.check_password(senha):
            return Response({"erro": "Senha incorreta."}, status=400)

        enviar_notificacao(usuario=user, mensagem="Sua conta foi excluída com sucesso.", link="/")
        user.delete()
        return Response({"mensagem": "Conta excluída com sucesso!"}, status=200)

    # DESATIVAR CONTA
    @action(detail=False, methods=["post"], url_path="me/desativar", permission_classes=[IsAuthenticated])
    def desativar_me(self, request):
        """
        Desativa a conta do usuário logado (modo leitura).
        - Mantém login funcionando
        - Bloqueia ações de escrita (via middleware e validações)
        """
        motivo = request.data.get("motivo") or None
        user: Usuario = request.user
        if user.is_suspended_self:
            return Response({"mensagem": "Sua conta já está desativada."}, status=200)

        user.desativar(motivo=motivo)
        enviar_notificacao(
            usuario=user,
            mensagem="Sua conta foi desativada. Você pode navegar normalmente, porém não poderá realizar ações até reativar.",
            link="/minha-conta",
        )
        return Response({"mensagem": "Conta desativada. Você está em modo leitura."}, status=200)

    # REATIVAR CONTA
    @action(detail=False, methods=["post"], url_path="me/reativar", permission_classes=[IsAuthenticated])
    def reativar_me(self, request):
        """Reativa a conta do usuário logado (sai do modo leitura)."""
        user: Usuario = request.user
        if not user.is_suspended_self:
            return Response({"mensagem": "Sua conta já está ativa."}, status=200)

        user.reativar()
        enviar_notificacao(
            usuario=user,
            mensagem="Sua conta foi reativada com sucesso.",
            link="/minha-conta",
        )
        return Response({"mensagem": "Conta reativada com sucesso."}, status=200)

    # RESUMO
    @action(detail=False, methods=["get"], url_path="me/resumo")
    def resumo(self, request):
        """
        Retorna o resumo de atividades do usuário logado.
        Inclui propostas, avaliações e denúncias (enviadas e recebidas).
        Usado no Dashboard e no Perfil Público.
        """
        user = request.user
        resumo = {}

        from denuncias.models import Denuncia

        # PROPOSTAS
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

        # AVALIAÇÕES
        avaliacoes_recebidas = Avaliacao.objects.filter(avaliado=user)
        avaliacoes_enviadas = Avaliacao.objects.filter(avaliador=user)

        resumo["avaliacoesRecebidas"] = avaliacoes_recebidas.count()
        resumo["avaliacoesEnviadas"] = avaliacoes_enviadas.count()

        resumo["mediaAvaliacao"] = (
            round(sum(a.nota for a in avaliacoes_recebidas) / avaliacoes_recebidas.count(), 2)
            if avaliacoes_recebidas.exists()
            else None
        )

        # DENÚNCIAS
        resumo["denunciasEnviadas"] = Denuncia.objects.filter(denunciante=user).count()
        resumo["denunciasRecebidas"] = Denuncia.objects.filter(denunciado=user).count()

        return Response(resumo)


# USUÁRIO LOGADO
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


# RECUPERAÇÃO DE SENHA
def enviar_email_async(destinatario, assunto, corpo_texto, corpo_html):
    """Executa o envio de e-mail de redefinição em uma thread separada."""
    try:
        print("🚀 [THREAD] Iniciando envio de e-mail de redefinição...")
        inicio = time.time()
        enviar_email_sendgrid(destinatario, assunto, corpo_texto, corpo_html)
        duracao = round(time.time() - inicio, 2)
        print(f"✅ [OK] E-mail enviado com sucesso em {duracao}s para {destinatario}")
    except Exception as e:
        print(f"❌ [ERRO] Falha ao enviar e-mail: {type(e).__name__} -> {e}")


class PasswordResetRequestView(APIView):
    """Endpoint público: /api/password-reset/"""
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

            print("📧 Iniciando envio de e-mail para:", user.email)
            print("🔗 Link de redefinição:", reset_link)

            threading.Thread(
                target=enviar_email_async,
                args=(user.email, subject, text_body, html_body),
                daemon=True
            ).start()
        else:
            print(f"⚠️ E-mail {email} não encontrado — nenhuma ação tomada.")

        return Response(
            {"detail": "Se este e-mail estiver cadastrado, você receberá instruções para redefinir sua senha."},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    """Endpoint público: /api/password-reset-confirm/"""
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
            print("❌ [ERRO] UID inválido ou não encontrado.")
            return Response({"detail": "Link inválido ou expirado."}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            print("❌ [ERRO] Token inválido ou expirado.")
            return Response({"detail": "Token inválido ou expirado."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        print(f"🔑 Senha redefinida com sucesso para o usuário {user.email}")

        return Response({"detail": "Senha redefinida com sucesso."}, status=status.HTTP_200_OK)
