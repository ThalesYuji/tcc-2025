# propostas/views.py

from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError

from .models import Proposta
from .serializers import PropostaSerializer, AlterarStatusSerializer
from .permissoes import PermissaoProposta
from notificacoes.utils import enviar_notificacao


class PropostaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciamento de propostas.

    Regras de visibilidade:
    - Admin: vê tudo.
    - Freelancer: vê as próprias propostas.
    - Contratante: vê propostas dos seus trabalhos.

    Extras:
    - Filtro opcional por trabalho via query param: ?trabalho=ID
    """
    queryset = (
        Proposta.objects
        .select_related("trabalho", "freelancer")
        .order_by("-data_envio")
    )
    serializer_class = PropostaSerializer
    permission_classes = [IsAuthenticated, PermissaoProposta]

    # ======================= LISTAGEM / FILTROS =======================

    def get_queryset(self):
        """
        Filtra o queryset conforme o tipo de usuário logado e, opcionalmente,
        pelo trabalho via query param (?trabalho=ID).
        """
        user = self.request.user
        qs = (
            Proposta.objects
            .select_related("trabalho", "freelancer")
            .order_by("-data_envio")
        )

        if not user.is_superuser:
            tipo = getattr(user, "tipo", None)
            if tipo == "freelancer":
                qs = qs.filter(freelancer=user)
            elif tipo == "contratante":
                qs = qs.filter(trabalho__contratante=user)
            else:
                return Proposta.objects.none()

        # 🔎 Filtro opcional por trabalho (?trabalho=ID)
        trabalho_id = self.request.query_params.get("trabalho")
        if trabalho_id:
            try:
                trabalho_id_int = int(trabalho_id)
                qs = qs.filter(trabalho_id=trabalho_id_int)
            except (TypeError, ValueError):
                # ignora filtro inválido sem quebrar
                pass

        return qs

    # ======================= CRIAÇÃO =======================

    def perform_create(self, serializer):
        """
        Ao criar proposta:
        - Apenas FREELANCER pode criar.
        - Bloqueia proposta do contratante no próprio trabalho.
        - Em trabalho privado, só o freelancer convidado pode propor.
        - Trabalho precisa estar 'aberto'.
        - Define 'numero_envio' e 'revisao_de' com base em propostas anteriores do mesmo freelancer para o mesmo trabalho.
        - Notifica o contratante.
        """
        user = self.request.user

        # 🔐 Permissão de criação
        if not user.is_superuser and getattr(user, "tipo", None) != "freelancer":
            raise ValidationError("Apenas freelancers podem enviar propostas.")

        trabalho = serializer.validated_data.get("trabalho")

        # 🚫 Contratante não pode propor no próprio trabalho
        if trabalho.contratante_id == user.id and not user.is_superuser:
            raise ValidationError("Você não pode enviar proposta para o seu próprio trabalho.")

        # 📌 Em trabalho privado, só o freelancer convidado pode enviar proposta
        if trabalho.is_privado and not user.is_superuser:
            if trabalho.freelancer_id != user.id:
                raise ValidationError("Este trabalho é privado e não está direcionado a você.")

        # ⛔ Verifica status do trabalho
        if trabalho.status not in ("aberto",):
            raise ValidationError(f"Não é possível enviar proposta — status atual do trabalho: {trabalho.status}.")

        # 📈 Número de envio e encadeamento de revisão
        anteriores = (
            Proposta.objects
            .filter(trabalho=trabalho, freelancer=user)
            .order_by("-data_envio")
        )
        numero_envio = anteriores.count() + 1
        revisao_de = anteriores.first() if anteriores.exists() else None

        # 💾 Salva
        proposta = serializer.save(
            freelancer=user,
            numero_envio=numero_envio,
            revisao_de=revisao_de,
        )

        # 🔔 Notificação ao contratante com mensagem diferenciada em reenvio
        if numero_envio > 1:
            msg = f"Você recebeu uma nova proposta (revisada #{numero_envio}) para o trabalho '{trabalho.titulo}'."
        else:
            msg = f"Você recebeu uma nova proposta para o trabalho '{trabalho.titulo}'."

        enviar_notificacao(
            usuario=trabalho.contratante,
            mensagem=msg,
            link=f"/propostas?id={proposta.id}",
        )

    # ======================= ATUALIZAÇÃO =======================

    def perform_update(self, serializer):
        """
        Bloqueia atualização direta do status por esse endpoint (use 'alterar-status').
        """
        if "status" in self.request.data:
            raise ValidationError("O status deve ser alterado apenas via endpoint específico.")
        serializer.save()

    # ======================= EXCLUSÃO =======================

    def destroy(self, request, *args, **kwargs):
        """
        Apenas propostas pendentes podem ser excluídas.
        """
        proposta = self.get_object()

        if proposta.status != "pendente":
            return Response(
                {"erro": "Não é permitido excluir propostas que já foram aceitas ou recusadas."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().destroy(request, *args, **kwargs)

    # ======================= AÇÃO: ALTERAR STATUS =======================

    @action(detail=True, methods=["patch"], url_path="alterar-status")
    def alterar_status(self, request, pk=None):
        """
        Permite que o contratante (ou admin) altere o status da proposta:
        - Aceitar: cria contrato, marca trabalho 'em_andamento' e recusa outras pendentes do mesmo trabalho.
        - Recusar: marca 'recusada', salva motivo_recusa e reabre o trabalho se não houver proposta aceita.
        """
        proposta = self.get_object()

        # 🔒 Só mexe em pendentes
        if proposta.status != "pendente":
            return Response(
                {"erro": "Status já definido. Não é possível alterar novamente."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 🔐 Permissão (contratante dono do trabalho ou admin)
        if request.user != proposta.trabalho.contratante and not request.user.is_superuser:
            return Response(
                {"erro": "Apenas o contratante do trabalho ou admin pode alterar o status."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # 📥 Validação da entrada
        serializer = AlterarStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        novo_status = serializer.validated_data["status"]

        # ✅ Aceitar proposta (com transação para evitar corrida)
        if novo_status == "aceita":
            from contratos.models import Contrato

            with transaction.atomic():
                # Recarrega lockando a linha
                proposta_ref = (
                    Proposta.objects.select_for_update()
                    .select_related("trabalho", "freelancer")
                    .get(pk=proposta.pk)
                )

                # Alguém já mexeu no meio do caminho?
                if proposta_ref.status != "pendente":
                    return Response(
                        {"erro": "Esta proposta não está mais pendente."},
                        status=status.HTTP_409_CONFLICT,
                    )

                # Evita contrato duplicado
                if Contrato.objects.filter(proposta=proposta_ref).exists():
                    return Response(
                        {"erro": "Já existe um contrato para esta proposta."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Atualiza status desta proposta
                proposta_ref.status = "aceita"
                proposta_ref.save(update_fields=["status"])

                # Recusa todas as outras pendentes do mesmo trabalho
                Proposta.objects.filter(
                    trabalho=proposta_ref.trabalho,
                    status="pendente",
                ).exclude(id=proposta_ref.id).update(status="recusada")

                # Atualiza status do trabalho
                trabalho = proposta_ref.trabalho
                trabalho.status = "em_andamento"
                trabalho.save(update_fields=["status"])

                # Cria contrato com valor da proposta
                contrato = Contrato.objects.create(
                    proposta=proposta_ref,
                    trabalho=trabalho,
                    contratante=trabalho.contratante,
                    freelancer=proposta_ref.freelancer,
                    valor=proposta_ref.valor,
                    status="ativo",
                )

            # 🔔 Notifica freelancer
            enviar_notificacao(
                usuario=proposta.freelancer,
                mensagem=f"Sua proposta para o trabalho '{trabalho.titulo}' foi aceita! Contrato criado.",
                link=f"/contratos?id={contrato.id}",
            )

            return Response(
                {
                    "mensagem": "Status alterado para 'aceita', contrato criado e trabalho marcado como 'em andamento'.",
                    "contrato_id": contrato.id,
                },
                status=status.HTTP_200_OK,
            )

        # ❌ Recusar proposta
        elif novo_status == "recusada":
            motivo_recusa = (serializer.validated_data.get('motivo_recusa') or '').strip()

            proposta.status = "recusada"
            proposta.motivo_recusa = motivo_recusa
            proposta.save(update_fields=["status", "motivo_recusa"])

            trabalho = proposta.trabalho

            # 🔁 Reabre o trabalho se não houver nenhuma aceita
            if not Proposta.objects.filter(trabalho=trabalho, status="aceita").exists():
                trabalho.status = "aberto"
                trabalho.save(update_fields=["status"])

            # 🔔 Notifica freelancer com (preview do) motivo
            mensagem_notif = f"Sua proposta para o trabalho '{trabalho.titulo}' foi recusada."
            if motivo_recusa:
                mensagem_notif += f" Motivo: {motivo_recusa[:100]}..."

            enviar_notificacao(
                usuario=proposta.freelancer,
                mensagem=mensagem_notif,
                link=f"/propostas?id={proposta.id}",
            )

            return Response(
                {
                    "mensagem": "Status alterado para 'recusada' com sucesso.",
                    "motivo_recusa": motivo_recusa
                },
                status=status.HTTP_200_OK,
            )
