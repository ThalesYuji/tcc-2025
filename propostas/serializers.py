from rest_framework import serializers
from .models import Proposta
from datetime import date

MAX_ENVIOS_POR_TRABALHO = 3  # 1 original + até 2 reenvios


class PropostaSerializer(serializers.ModelSerializer):
    # 🔹 Campos extras só para leitura
    trabalho_titulo = serializers.CharField(source="trabalho.titulo", read_only=True)
    freelancer_nome = serializers.CharField(source="freelancer.nome", read_only=True)

    class Meta:
        model = Proposta
        fields = '__all__'
        read_only_fields = [
            'data_envio', 'status',
            'revisao_de', 'numero_envio',  # calculados automaticamente
            'freelancer'  # sempre do usuário logado
        ]

    # ========================= VALIDAÇÕES =========================

    def validate_valor(self, value):
        if value <= 0:
            raise serializers.ValidationError("O valor deve ser maior que zero.")
        return value

    def validate_prazo_estimado(self, value):
        if value <= date.today():
            raise serializers.ValidationError("O prazo estimado deve ser uma data futura.")
        return value

    def validate(self, data):
        """
        Regras:
        - Apenas freelancer pode enviar.
        - Não pode enviar para o próprio trabalho.
        - Trabalho deve estar 'aberto'.
        - Máximo de 3 envios por (freelancer, trabalho).
        - Não pode haver proposta pendente/aceita do mesmo par.
        - Reenvio só se a última proposta tiver sido 'recusada'.
        - Em reenvio, exigir 'motivo_revisao'.
        """
        request = self.context.get('request')
        freelancer = getattr(request, 'user', None)
        trabalho = data.get('trabalho')

        if not freelancer or not trabalho:
            return data

        if getattr(freelancer, 'tipo', None) != 'freelancer':
            raise serializers.ValidationError("Somente usuários do tipo 'freelancer' podem enviar propostas.")

        if trabalho.contratante_id == freelancer.id:
            raise serializers.ValidationError("Você não pode enviar proposta para seu próprio trabalho.")

        if getattr(trabalho, 'status', None) != 'aberto':
            raise serializers.ValidationError("Só é possível enviar propostas enquanto o trabalho está 'aberto'.")

        # Total de envios já feitos para este trabalho por este freelancer
        total_envios = Proposta.objects.filter(trabalho=trabalho, freelancer=freelancer).count()
        if total_envios >= MAX_ENVIOS_POR_TRABALHO:
            raise serializers.ValidationError(f"Limite de {MAX_ENVIOS_POR_TRABALHO} envios atingido para este trabalho.")

        # Impede duplicidade ativa (pendente/aceita)
        if Proposta.objects.filter(
            trabalho=trabalho, freelancer=freelancer, status__in=['pendente', 'aceita']
        ).exists():
            raise serializers.ValidationError("Você já possui uma proposta pendente ou aceita para este trabalho.")

        # Se for reenvio (já existe ao menos 1 proposta anterior)
        if total_envios >= 1:
            ultima = Proposta.objects.filter(trabalho=trabalho, freelancer=freelancer).order_by('-data_envio').first()
            if ultima and ultima.status != 'recusada':
                raise serializers.ValidationError("Só é possível reenviar após a recusa da proposta anterior.")

            motivo_revisao = (data.get('motivo_revisao') or "").strip()
            if not motivo_revisao:
                raise serializers.ValidationError("Informe o 'motivo_revisao' explicando o que mudou na nova proposta.")

        return data

    # ========================= UPDATE =========================

    def update(self, instance, validated_data):
        request = self.context.get('request')
        _ = request.user if request else None

        if instance.status != 'pendente':
            raise serializers.ValidationError("Não é possível editar uma proposta que já foi aceita ou recusada.")

        if 'status' in validated_data:
            raise serializers.ValidationError("O status só pode ser alterado pelos endpoints específicos.")

        return super().update(instance, validated_data)
