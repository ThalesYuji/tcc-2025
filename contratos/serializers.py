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
    contratante = UsuarioSerializer(read_only=True)
    freelancer = UsuarioSerializer(read_only=True)
    trabalho = TrabalhoSerializer(read_only=True)
    proposta = PropostaSerializer(read_only=True, allow_null=True)
    pagamento = PagamentoSerializer(read_only=True, allow_null=True)

    class Meta:
        model = Contrato
        fields = "__all__"

    # VALIDAÇÃO PRINCIPAL

    def validate(self, data):
        """
        Regras de negócio para validar a criação/atualização de contratos:
        - Contratante deve ser do tipo 'contratante'.
        - Freelancer deve ser do tipo 'freelancer'.
        - Freelancer deve ser o mesmo da proposta (se existir).
        - Data de fim deve ser futura.
        - Apenas um contrato por proposta.
        - Conclusão só pode acontecer automaticamente (via pagamento).
        """
        proposta = data.get("proposta") or getattr(self.instance, "proposta", None)
        contratante = data.get("contratante") or getattr(self.instance, "contratante", None)
        freelancer = data.get("freelancer") or getattr(self.instance, "freelancer", None)
        data_fim = data.get("data_fim") or getattr(self.instance, "data_fim", None)
        data_entrega = data.get("data_entrega") or getattr(self.instance, "data_entrega", None)
        status_novo = data.get("status") or getattr(self.instance, "status", None)
        trabalho = data.get("trabalho") or getattr(self.instance, "trabalho", None)

        if not contratante or not freelancer or not trabalho:
            raise serializers.ValidationError("Dados do contrato incompletos.")

        if contratante.tipo != "contratante":
            raise serializers.ValidationError("O campo 'contratante' deve conter um usuário do tipo contratante.")

        if freelancer.tipo != "freelancer":
            raise serializers.ValidationError("O campo 'freelancer' deve conter um usuário do tipo freelancer.")

        # Se houver proposta vinculada, valida consistência
        if proposta:
            if freelancer != proposta.freelancer:
                raise serializers.ValidationError("O freelancer deve ser o mesmo da proposta selecionada.")

            # Impede contratos duplicados para a mesma proposta
            if self.instance is None and self.Meta.model.objects.filter(proposta=proposta).exists():
                raise serializers.ValidationError({"proposta": "Já existe um contrato para esta proposta."})

        if data_fim and data_fim <= date.today():
            raise serializers.ValidationError("A data de fim deve ser uma data futura.")

        # Validação da data de entrega
        if data_entrega and data_entrega > date.today():
            raise serializers.ValidationError({"data_entrega": "A data de entrega não pode ser futura."})

        # Bloqueio de conclusão manual (só superuser pode forçar)
        request = self.context.get("request")
        if status_novo == "concluido" and request and not request.user.is_superuser:
            raise serializers.ValidationError(
                {"status": "O contrato só pode ser concluído automaticamente após pagamento aprovado."}
            )

        return data

    # CRIAÇÃO 

    def create(self, validated_data):
        """
        Ao criar um contrato:
        - Se tiver proposta → usa valor da proposta.
        - Se não tiver proposta (trabalho privado) → usa valor do trabalho.
        """
        proposta = validated_data.get("proposta")
        trabalho = validated_data.get("trabalho")

        if proposta:
            validated_data["valor"] = proposta.valor
        elif trabalho:
            validated_data["valor"] = trabalho.orcamento

        return super().create(validated_data)
