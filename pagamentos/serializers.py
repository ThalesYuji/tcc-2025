from rest_framework import serializers
from .models import Pagamento
from usuarios.models import Usuario
from usuarios.serializers import UsuarioSerializer
from contratos.models import Contrato


class PagamentoSerializer(serializers.ModelSerializer):
    cliente = serializers.PrimaryKeyRelatedField(
        queryset=Usuario.objects.all()  # 🔹 aceita ID do cliente e converte para objeto
    )
    contrato = serializers.PrimaryKeyRelatedField(
        queryset=Contrato.objects.all()  # 🔹 aceita ID do contrato e converte para objeto
    )

    # 🔹 Exibe cliente detalhado somente na resposta
    cliente_detalhe = UsuarioSerializer(source="cliente", read_only=True)

    class Meta:
        model = Pagamento
        fields = '__all__'

    def validate(self, data):
        contrato = data.get('contrato') or (self.instance and self.instance.contrato)
        valor = data.get('valor') or (self.instance and self.instance.valor)
        metodo = data.get('metodo') or (self.instance and self.instance.metodo)
        status = data.get('status') or (self.instance and self.instance.status)
        cliente = data.get('cliente') or (self.instance and self.instance.cliente)

        request = self.context.get('request')

        # 🔹 Valor precisa ser válido
        if valor is None or float(valor) <= 0:
            raise serializers.ValidationError({"valor": "O valor do pagamento deve ser maior que zero."})

        if contrato is None:
            raise serializers.ValidationError({"contrato": "O contrato é obrigatório."})

        # 🔹 O valor do pagamento deve ser exatamente igual ao valor do contrato
        if float(valor) != float(contrato.valor):
            raise serializers.ValidationError({
                "valor": f"O valor do pagamento deve ser exatamente R$ {contrato.valor} (valor do contrato)."
            })

        # 🔹 Impede pagamento duplicado
        if self.instance is None and hasattr(contrato, 'pagamento'):
            raise serializers.ValidationError("Já existe um pagamento registrado para este contrato.")

        # 🔹 Bloqueia pagamento em contrato concluído/cancelado
        if contrato.status in ['concluido', 'cancelado']:
            raise serializers.ValidationError("Não é possível registrar pagamento em contratos concluídos ou cancelados.")

        # 🔹 Métodos de pagamento válidos
        metodos_validos = ["pix", "boleto", "credito", "debito"]
        if metodo not in metodos_validos:
            raise serializers.ValidationError({
                "metodo": f"Método de pagamento inválido. Use um destes: {', '.join(metodos_validos)}."
            })

        # 🔹 Apenas o cliente do contrato pode pagar
        if request and not (request.user.is_superuser or request.user == contrato.cliente):
            raise serializers.ValidationError("Apenas o cliente do contrato pode registrar pagamentos.")

        # 🔹 Cliente informado precisa ser o mesmo do contrato
        if cliente and cliente != contrato.cliente:
            raise serializers.ValidationError("O cliente do pagamento deve ser o mesmo do contrato.")

        # 🚫 Impede alteração manual do valor depois de criado
        if self.instance and "valor" in self.initial_data:
            if valor != self.instance.valor:
                raise serializers.ValidationError({"valor": "O valor do pagamento não pode ser alterado."})

        # 🚫 Apenas admin pode alterar status em update
        if self.instance and "status" in self.initial_data:
            if request and not request.user.is_superuser:
                raise serializers.ValidationError("Apenas o administrador pode alterar o status do pagamento.")

        return data

    def create(self, validated_data):
        """
        🔹 Sempre que um cliente cria um pagamento,
        o status é automaticamente definido como 'aprovado'
        (simulação de pagamento instantâneo).
        """
        validated_data["status"] = "aprovado"
        return super().create(validated_data)
