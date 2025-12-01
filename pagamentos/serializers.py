from rest_framework import serializers
from .models import Pagamento
from usuarios.models import Usuario
from usuarios.serializers import UsuarioSerializer
from contratos.models import Contrato


class PagamentoSerializer(serializers.ModelSerializer):
    # Campos principais
    contratante = serializers.PrimaryKeyRelatedField(queryset=Usuario.objects.all())
    contrato = serializers.PrimaryKeyRelatedField(queryset=Contrato.objects.all())
    contratante_detalhe = UsuarioSerializer(source="contratante", read_only=True)

    # Campos legados (somente leitura; mantidos por histórico/admin)
    qr_code = serializers.CharField(read_only=True, required=False)
    qr_code_base64 = serializers.CharField(read_only=True, required=False)
    boleto_url = serializers.CharField(read_only=True, required=False)
    ticket_url = serializers.CharField(read_only=True, required=False)

    class Meta:
        model = Pagamento
        fields = "__all__"
        read_only_fields = [
            "status",
            "mercadopago_payment_id",
            "codigo_transacao",
            "payment_intent_id",
            "metodo",
        ]

    # VALIDAÇÕES
    def validate(self, data):
        contrato = data.get("contrato") or (self.instance and self.instance.contrato)
        valor = data.get("valor") or (self.instance and self.instance.valor)
        contratante = data.get("contratante") or (self.instance and self.instance.contratante)
        request = self.context.get("request")

        # Validações básicas
        if valor is None or float(valor) <= 0:
            raise serializers.ValidationError({"valor": "O valor do pagamento deve ser maior que zero."})

        if contrato is None:
            raise serializers.ValidationError({"contrato": "O contrato é obrigatório."})

        if float(valor) != float(contrato.valor):
            raise serializers.ValidationError({
                "valor": f"O valor do pagamento deve ser exatamente R$ {contrato.valor} (valor do contrato)."
            })

        if self.instance is None and hasattr(contrato, "pagamento"):
            raise serializers.ValidationError("Já existe um pagamento registrado para este contrato.")

        if contrato.status in ["concluido", "cancelado"]:
            raise serializers.ValidationError("Não é possível registrar pagamento em contratos concluídos ou cancelados.")

        # Permissões e consistência
        if request and not (request.user.is_superuser or request.user == contrato.contratante):
            raise serializers.ValidationError("Apenas o contratante do contrato pode registrar pagamentos.")

        if contratante and contratante != contrato.contratante:
            raise serializers.ValidationError("O contratante do pagamento deve ser o mesmo do contrato.")

        return data

    # CRIAÇÃO
    def create(self, validated_data):
        """
        Força o padrão do fluxo de pagamento:
        - Status inicial: pendente
        - Método: checkout_pro (único suportado)
        """
        validated_data["status"] = "pendente"
        validated_data["metodo"] = "checkout_pro"
        return super().create(validated_data)
