from rest_framework import serializers
from .models import Proposta
from datetime import date

class PropostaSerializer(serializers.ModelSerializer):
    # 🔹 Campos extras só para leitura
    trabalho_titulo = serializers.CharField(source="trabalho.titulo", read_only=True)
    freelancer_nome = serializers.CharField(source="freelancer.nome", read_only=True)

    class Meta:
        model = Proposta
        fields = '__all__'
        read_only_fields = ['data_envio', 'status']

    def validate_valor(self, value):
        if value <= 0:
            raise serializers.ValidationError("O valor deve ser maior que zero.")
        return value

    def validate_prazo_estimado(self, value):
        if value <= date.today():
            raise serializers.ValidationError("O prazo estimado deve ser uma data futura.")
        return value

    def validate(self, data):
        freelancer = data.get('freelancer')
        trabalho = data.get('trabalho')

        if not freelancer or not trabalho:
            return data  # Evita erro se chamado fora da criação

        if freelancer.tipo != 'freelancer':
            raise serializers.ValidationError("Somente usuários do tipo 'freelancer' podem enviar propostas.")

        if trabalho.cliente == freelancer:
            raise serializers.ValidationError("Você não pode enviar proposta para seu próprio trabalho.")

        if Proposta.objects.filter(trabalho=trabalho, freelancer=freelancer).exists():
            raise serializers.ValidationError("Você já enviou uma proposta para este trabalho.")

        return data

    def update(self, instance, validated_data):
        request = self.context.get('request')
        user = request.user if request else None

        if instance.status != 'pendente':
            raise serializers.ValidationError("Não é possível editar uma proposta que já foi aceita ou recusada.")

        if 'status' in validated_data:
            raise serializers.ValidationError("O status só pode ser alterado pelos endpoints específicos.")

        return super().update(instance, validated_data)


class AlterarStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['aceita', 'recusada'])

    def validate_status(self, value):
        if value not in ['aceita', 'recusada']:
            raise serializers.ValidationError("Status inválido.")
        return value
