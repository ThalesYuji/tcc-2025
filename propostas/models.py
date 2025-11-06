from django.db import models
from usuarios.models import Usuario
from trabalhos.models import Trabalho


class Proposta(models.Model):
    STATUS_CHOICES = (
        ('pendente', 'Pendente'),
        ('aceita', 'Aceita'),
        ('recusada', 'Recusada'),
    )

    # 🔹 Cada proposta está vinculada a um trabalho específico
    trabalho = models.ForeignKey(
        Trabalho,
        on_delete=models.CASCADE,
        related_name='propostas'
    )

    # 🔹 Usuário freelancer que enviou a proposta
    freelancer = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='propostas_enviadas'
    )

    descricao = models.TextField()
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    prazo_estimado = models.DateField()

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pendente'
    )

    # 🔹 Controle de reenvio/histórico
    revisao_de = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='revisoes'
    )
    motivo_revisao = models.CharField(
        max_length=255,
        blank=True,
        help_text="Explique o que mudou nesta nova proposta (valor/escopo/prazo)."
    )
    numero_envio = models.PositiveSmallIntegerField(
        default=1,
        help_text="1 = proposta original; 2/3 = reenvios."
    )

    data_envio = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-data_envio']
        verbose_name = 'Proposta'
        verbose_name_plural = 'Propostas'

    def __str__(self):
        return f"Proposta de {self.freelancer.nome} para o trabalho '{self.trabalho.titulo}'"
