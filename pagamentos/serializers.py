from rest_framework import serializers
from .models import Pagamento
from usuarios.models import Usuario
from usuarios.serializers import UsuarioSerializer
from contratos.models import Contrato


class PagamentoSerializer(serializers.ModelSerializer):
    cliente = serializers.PrimaryKeyRelatedField(queryset=Usuario.objects.all())
    contrato = serializers.PrimaryKeyRelatedField(queryset=Contrato.objects.all())

    cliente_detalhe = UsuarioSerializer(source="cliente", read_only=True)

    class Meta:
        model = Pagamento
        fields = '__all__'
        read_only_fields = ['status', 'payment_intent_id', 'codigo_transacao']

    def validate_metodo(self, value):
        """
        Converte 'credito' ou 'debito' em 'card'.
        Garante que o Stripe receba apenas métodos válidos.
        """
        if value in ["credito", "debito"]:
            return "card"
        if value not in ["pix", "boleto", "card"]:
            raise serializers.ValidationError("Método inválido. Use: pix, boleto ou card.")
        return value

    def validate(self, data):
        contrato = data.get('contrato') or (self.instance and self.instance.contrato)
        valor = data.get('valor') or (self.instance and self.instance.valor)
        metodo = data.get('metodo') or (self.instance and self.instance.metodo)
        cliente = data.get('cliente') or (self.instance and self.instance.cliente)

        request = self.context.get('request')

        # 🔹 Valor válido
        if valor is None or float(valor) <= 0:
            raise serializers.ValidationError({"valor": "O valor do pagamento deve ser maior que zero."})

        if contrato is None:
            raise serializers.ValidationError({"contrato": "O contrato é obrigatório."})

        # 🔹 Valor precisa ser igual ao contrato
        if float(valor) != float(contrato.valor):
            raise serializers.ValidationError({
                "valor": f"O valor do pagamento deve ser exatamente R$ {contrato.valor} (valor do contrato)."
            })

        # 🔹 Impede duplicidade
        if self.instance is None and hasattr(contrato, 'pagamento'):
            raise serializers.ValidationError("Já existe um pagamento registrado para este contrato.")

        # 🔹 Bloqueia pagamento em contrato concluído/cancelado
        if contrato.status in ['concluido', 'cancelado']:
            raise serializers.ValidationError("Não é possível registrar pagamento em contratos concluídos ou cancelados.")

        # 🔹 Apenas o cliente do contrato pode pagar
        if request and not (request.user.is_superuser or request.user == contrato.cliente):
            raise serializers.ValidationError("Apenas o cliente do contrato pode registrar pagamentos.")

        # 🔹 Cliente precisa bater com o contrato
        if cliente and cliente != contrato.cliente:
            raise serializers.ValidationError("O cliente do pagamento deve ser o mesmo do contrato.")

        return data

    def create(self, validated_data):
        validated_data["status"] = "pendente"
        return super().create(validated_data)
