from django.db import models
from contratos.models import Contrato
from usuarios.models import Usuario


class Pagamento(models.Model):
    # único método permitido
    METODOS = [
        ('checkout_pro', 'Checkout Pro'),
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
        error_messages={'unique': 'Já existe um pagamento registrado para este contrato.'}
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

    # travado em Checkout Pro
    metodo = models.CharField(
        max_length=20,
        choices=METODOS,
        default='checkout_pro',
        help_text="Pagamento via Mercado Pago (Checkout Pro)."
    )

    # Mercado Pago
    mercadopago_payment_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="ID do pagamento gerado pelo Mercado Pago."
    )

    # LEGACY (mantidos por compatibilidade; pode remover depois)
    payment_intent_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="[DEPRECATED] ID do PaymentIntent do Stripe."
    )

    # LEGACY: usado no passado para PIX/BOLETO; pode ser limpo depois
    codigo_transacao = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Código/URL legado (ex.: QR Code PIX, link de boleto)."
    )

    observacoes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-data_criacao']

    def __str__(self):
        # fallback caso existam registros antigos antes desta migração
        try:
            metodo = self.get_metodo_display()
        except Exception:
            metodo = self.metodo or 'checkout_pro'
        return f"Pagamento R$ {self.valor} via {metodo} | Status: {self.status}"
