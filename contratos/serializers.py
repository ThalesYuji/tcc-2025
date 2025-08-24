from rest_framework import serializers
from datetime import date

from .models import Contrato
from usuarios.serializers import UsuarioSerializer
from trabalhos.serializers import TrabalhoSerializer
from propostas.serializers import PropostaSerializer
from pagamentos.serializers import PagamentoSerializer


class ContratoSerializer(serializers.ModelSerializer):
    """
    Serializador do modelo Contrato.
    Inclui validações de consistência e bloqueio de conclusão manual.
    """

    cliente = UsuarioSerializer(read_only=True)
    freelancer = UsuarioSerializer(read_only=True)
    trabalho = TrabalhoSerializer(read_only=True)
    proposta = PropostaSerializer(read_only=True)
    pagamento = PagamentoSerializer(read_only=True, allow_null=True)

    class Meta:
        model = Contrato
        fields = "__all__"

    def validate(self, data):
        """
        Regras de negócio para validar a criação/atualização de contratos:
        - Cliente deve ser do tipo 'cliente'.
        - Freelancer deve ser do tipo 'freelancer'.
        - Freelancer deve ser o mesmo da proposta vinculada.
        - Data de fim deve ser futura.
        - Apenas um contrato por proposta.
        - Conclusão só pode acontecer automaticamente (via pagamento).
        """

        # Dados necessários
        proposta = data.get("proposta") or getattr(self.instance, "proposta", None)
        cliente = data.get("cliente") or getattr(self.instance, "cliente", None)
        freelancer = data.get("freelancer") or getattr(self.instance, "freelancer", None)
        data_fim = data.get("data_fim") or getattr(self.instance, "data_fim", None)
        status_novo = data.get("status") or getattr(self.instance, "status", None)

        # 🔹 Verificações obrigatórias
        if not cliente or not freelancer or not proposta:
            raise serializers.ValidationError("Dados do contrato incompletos.")

        if cliente.tipo != "cliente":
            raise serializers.ValidationError("O campo 'cliente' deve conter um usuário do tipo cliente.")

        if freelancer.tipo != "freelancer":
            raise serializers.ValidationError("O campo 'freelancer' deve conter um usuário do tipo freelancer.")

        if freelancer != proposta.freelancer:
            raise serializers.ValidationError("O freelancer deve ser o mesmo da proposta selecionada.")

        if data_fim and data_fim <= date.today():
            raise serializers.ValidationError("A data de fim deve ser uma data futura.")

        # 🔹 Impede contratos duplicados para a mesma proposta
        if self.instance is None and self.Meta.model.objects.filter(proposta=proposta).exists():
            raise serializers.ValidationError({"proposta": "Já existe um contrato para esta proposta."})

        # 🔹 Bloqueio de conclusão manual (só superuser pode forçar)
        request = self.context.get("request")
        if status_novo == "concluido" and request and not request.user.is_superuser:
            raise serializers.ValidationError(
                {"status": "O contrato só pode ser concluído automaticamente após pagamento aprovado."}
            )

        return data

    def create(self, validated_data):
        """
        Ao criar um contrato, o valor é automaticamente herdado da proposta aceita.
        """
        proposta = validated_data.get("proposta")
        if proposta:
            validated_data["valor"] = proposta.valor
        return super().create(validated_data)
