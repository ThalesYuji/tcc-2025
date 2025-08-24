from django.db import models
from contratos.models import Contrato
from usuarios.models import Usuario

class Pagamento(models.Model):
    # 🔹 Métodos permitidos fixos
    METODOS = [
        ('pix', 'PIX'),
        ('boleto', 'Boleto'),
        ('credito', 'Cartão de Crédito'),
        ('debito', 'Cartão de Débito'),
    ]

    # 🔹 Status possíveis
    STATUS = [
        ('pendente', 'Pendente'),
        ('aprovado', 'Aprovado'),
        ('rejeitado', 'Rejeitado'),
        ('reembolsado', 'Reembolsado'),
    ]

    contrato = models.OneToOneField(
        Contrato,
        on_delete=models.CASCADE,
        related_name='pagamento',
        error_messages={
            'unique': 'Já existe um pagamento registrado para este contrato.'
        }
    )
    cliente = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='pagamentos_cliente'
    )
    valor = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="O valor deve ser exatamente igual ao definido no contrato."
    )
    data_pagamento = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS,
        default='pendente'
    )
    metodo = models.CharField(
        max_length=20,
        choices=METODOS,
        default='pix',
        help_text="Escolha entre PIX, Boleto, Crédito ou Débito."
    )
    codigo_transacao = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Código gerado pelo provedor de pagamento (se aplicável)."
    )
    observacoes = models.TextField(
        blank=True,
        null=True,
        help_text="Observações adicionais sobre o pagamento."
    )

    def __str__(self):
        return f"Pagamento de R$ {self.valor} via {self.get_metodo_display()} | Status: {self.status}"
