from django.db import models
from usuarios.models import Usuario
from trabalhos.models import Trabalho
from propostas.models import Proposta


class Contrato(models.Model):
    """
    Modelo que representa um contrato entre um contratante e um freelancer.
    Pode estar vinculado a uma proposta (trabalho público) ou ser criado
    a partir de um trabalho privado.
    """
    # 🔹 Proposta é opcional (para contratos de trabalhos privados)
    proposta = models.ForeignKey(
        Proposta,
        on_delete=models.CASCADE,
        related_name='contrato',
        null=True,
        blank=True
    )

    trabalho = models.ForeignKey(
        Trabalho,
        on_delete=models.CASCADE,
        related_name='contratos'
    )

    contratante = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='contratos_contratante'
    )

    freelancer = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='contratos_freelancer'
    )

    valor = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Valor acordado entre contratante e freelancer."
    )

    data_inicio = models.DateField(auto_now_add=True)
    data_fim = models.DateField(blank=True, null=True)

    # 🆕 Data real de entrega do trabalho
    data_entrega = models.DateField(blank=True, null=True)

    status = models.CharField(
        max_length=20,
        choices=[
            ('ativo', 'Ativo'),
            ('concluido', 'Concluído'),
            ('cancelado', 'Cancelado')
        ],
        default='ativo'
    )

    class Meta:
        ordering = ['-data_inicio']
        verbose_name = 'Contrato'
        verbose_name_plural = 'Contratos'

    def __str__(self):
        return f"Contrato: {self.contratante.nome} ⇄ {self.freelancer.nome} | {self.trabalho.titulo}"
