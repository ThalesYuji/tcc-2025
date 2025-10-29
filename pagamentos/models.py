from django.db import models
from contratos.models import Contrato
from usuarios.models import Usuario


class Pagamento(models.Model):
    """
    Representa o pagamento de um contrato entre um contratante e um freelancer.
    Integrado com o Mercado Pago (Checkout Pro).
    """
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

    # 🔹 Cada contrato tem um único pagamento
    contrato = models.OneToOneField(
        Contrato,
        on_delete=models.CASCADE,
        related_name='pagamento',
        error_messages={'unique': 'Já existe um pagamento registrado para este contrato.'}
    )

    # 🔹 Novo campo: contratante (substitui cliente)
    contratante = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='pagamentos_contratante',
        help_text="Usuário que contratou e efetuará o pagamento."
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
        default='checkout_pro',
        help_text="Pagamento via Mercado Pago (Checkout Pro)."
    )

    # 🔹 Mercado Pago
    mercadopago_payment_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="ID do pagamento gerado pelo Mercado Pago."
    )

    # 🔹 Legados (mantidos para histórico/admin)
    payment_intent_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="[DEPRECATED] ID do PaymentIntent do Stripe."
    )

    codigo_transacao = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Código/URL legado (ex.: QR Code PIX, link de boleto)."
    )

    observacoes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-data_criacao']
        verbose_name = "Pagamento"
        verbose_name_plural = "Pagamentos"

    def __str__(self):
        """Exibe o pagamento de forma legível no admin."""
        try:
            metodo = self.get_metodo_display()
        except Exception:
            metodo = self.metodo or 'checkout_pro'

        contratante_nome = getattr(self.contratante, "nome", "Desconhecido") if self.contratante else "—"
        return f"Pagamento R$ {self.valor} ({metodo}) | {contratante_nome} | Status: {self.status}"
