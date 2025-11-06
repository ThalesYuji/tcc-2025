# propostas/serializers.py
from rest_framework import serializers
from datetime import date
from .models import Proposta

MAX_ENVIOS_POR_TRABALHO = 3

class PropostaSerializer(serializers.ModelSerializer):
    # Extras só leitura (FKs resolvidas)
    trabalho_titulo = serializers.CharField(source="trabalho.titulo", read_only=True)
    freelancer_nome = serializers.CharField(source="freelancer.nome", read_only=True)

    class Meta:
        model = Proposta
        fields = "__all__"
        read_only_fields = [
            "data_envio",
            "status",
            "freelancer",
            "numero_envio",
            "revisao_de",
            "motivo_recusa",  # 🆕 Só o contratante preenche via endpoint específico
        ]

    # ========================= VALIDAÇÕES DE CAMPOS =========================
    def validate_valor(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("O valor deve ser maior que zero.")
        return value

    def validate_prazo_estimado(self, value):
        if not value or value <= date.today():
            raise serializers.ValidationError("O prazo estimado deve ser uma data futura.")
        return value

    # ========================= VALIDAÇÃO GERAL (CREATE) =========================
    def validate(self, data):
        """
        Regras:
        - Apenas freelancer envia.
        - Não pode propor no próprio trabalho.
        - Trabalho precisa estar 'aberto'.
        - Trabalho privado: só o freelancer-alvo pode propor.
        - Máx. 3 envios por (freelancer, trabalho).
        - Se já houver proposta 'pendente' ou 'aceita' do mesmo freelancer p/ o mesmo trabalho: bloquear.
        - Se último envio foi 'recusada': exigir motivo_revisao para reenvio.
        """
        request = self.context.get("request")
        freelancer = getattr(request, "user", None)
        trabalho = data.get("trabalho")

        # Em update/partial_update, delegamos ao update()
        if self.instance:
            return data

        if not freelancer or not trabalho:
            return data

        if getattr(freelancer, "tipo", None) != "freelancer":
            raise serializers.ValidationError("Somente usuários do tipo 'freelancer' podem enviar propostas.")

        if trabalho.contratante_id == freelancer.id:
            raise serializers.ValidationError("Você não pode enviar proposta para seu próprio trabalho.")

        # 🔒 Trabalho precisa estar aberto
        if getattr(trabalho, "status", "") != "aberto":
            raise serializers.ValidationError("Este trabalho não está aberto para novas propostas.")

        # 🔒 Trabalho privado: somente o freelancer direcionado pode propor
        if getattr(trabalho, "is_privado", False):
            if trabalho.freelancer_id != getattr(freelancer, "id", None):
                raise serializers.ValidationError("Este trabalho é privado e não está direcionado a você.")

        # Histórico do mesmo freelancer para o mesmo trabalho
        anteriores = Proposta.objects.filter(
            trabalho=trabalho, freelancer=freelancer
        ).order_by("-data_envio")
        total_envios = anteriores.count()

        # 🔒 Limite de 3 no total
        if total_envios >= MAX_ENVIOS_POR_TRABALHO:
            raise serializers.ValidationError("Limite de 3 envios atingido para este trabalho.")

        # 🔒 Não permite novo envio se já existir pendente/aceita do mesmo autor
        if anteriores.filter(status__in=["pendente", "aceita"]).exists():
            raise serializers.ValidationError("Você já possui uma proposta pendente/aceita para este trabalho.")

        # 🔒 Se existe anterior recusada, exigir motivo da revisão
        if total_envios >= 1:
            ultima = anteriores.first()
            if ultima and ultima.status == "recusada":
                motivo_revisao = (data.get("motivo_revisao") or "").strip()
                if not motivo_revisao:
                    raise serializers.ValidationError("Informe o motivo da revisão da sua nova proposta.")

        return data

    # ========================= UPDATE (EDIÇÃO DE PENDENTE) =========================
    def update(self, instance, validated_data):
        # 🔒 Não permitir editar se não está pendente
        if instance.status != "pendente":
            raise serializers.ValidationError("Não é possível editar uma proposta que já foi aceita ou recusada.")

        # 🔒 Status só muda pelos endpoints específicos
        if "status" in validated_data:
            raise serializers.ValidationError("O status só pode ser alterado pelos endpoints específicos.")

        # 🔒 Não permitir trocar o trabalho após criada
        if "trabalho" in validated_data and validated_data.get("trabalho") != instance.trabalho:
            raise serializers.ValidationError("Não é permitido alterar o trabalho da proposta.")

        return super().update(instance, validated_data)


class AlterarStatusSerializer(serializers.Serializer):
    """Serializer para endpoint de alteração de status com motivo de recusa."""
    status = serializers.ChoiceField(choices=["aceita", "recusada"])
    motivo_recusa = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=1000,
        help_text="Motivo da recusa (obrigatório ao recusar)"
    )

    def validate_status(self, value):
        if value not in ["aceita", "recusada"]:
            raise serializers.ValidationError("Status inválido.")
        return value
    
    def validate(self, data):
        """Valida que motivo_recusa é obrigatório quando status é 'recusada'"""
        status = data.get('status')
        motivo = (data.get('motivo_recusa') or '').strip()
        
        if status == 'recusada' and not motivo:
            raise serializers.ValidationError({
                'motivo_recusa': 'O motivo da recusa é obrigatório para recusar uma proposta.'
            })
        
        return data