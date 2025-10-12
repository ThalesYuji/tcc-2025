from django.db import models
from contratos.models import Contrato
from usuarios.models import Usuario


class Pagamento(models.Model):
    # 🔹 Métodos de pagamento
    METODOS = [
        ('pix', 'PIX'),
        ('boleto', 'Boleto'),
        ('card', 'Cartão de Crédito/Débito'),
    ]
    
    STATUS = [
        ('pendente', 'Pendente'),
        ('em_processamento', 'Em Processamento'),
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
    
    data_criacao = models.DateTimeField(auto_now_add=True)
    
    status = models.CharField(max_length=20, choices=STATUS, default='pendente')
    
    metodo = models.CharField(
        max_length=20,
        choices=METODOS,
        default='pix',
        help_text="Escolha entre PIX, Boleto ou Cartão."
    )
    
    # 🔹 Mercado Pago Payment ID (substitui o Stripe)
    mercadopago_payment_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="ID do pagamento gerado pelo Mercado Pago."
    )
    
    # 🔹 Stripe Payment Intent ID (DEPRECATED - manter por compatibilidade temporária)
    payment_intent_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="[DEPRECATED] ID do PaymentIntent do Stripe (manter temporariamente)."
    )
    
    # 🔹 Extra (PIX QR Code, Boleto URL, etc)
    codigo_transacao = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Código adicional ou referência de transação (ex.: PIX QR Code, Boleto URL)."
    )
    
    observacoes = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return f"Pagamento R$ {self.valor} via {self.get_metodo_display()} | Status: {self.status}"