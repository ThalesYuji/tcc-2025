from django.db import models
from usuarios.models import Usuario
from trabalhos.models import Trabalho


class Proposta(models.Model):
    STATUS_CHOICES = (
        ('pendente', 'Pendente'),
        ('aceita', 'Aceita'),
        ('recusada', 'Recusada'),
    )
    
    # Cada proposta está vinculada a um trabalho específico
    trabalho = models.ForeignKey(
        Trabalho,
        on_delete=models.CASCADE,
        related_name='propostas',
        db_index=True,
    )
    
    # Usuário freelancer que enviou a proposta
    freelancer = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='propostas_enviadas',
        db_index=True,
    )
    
    descricao = models.TextField()
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    prazo_estimado = models.DateField()
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pendente',
        db_index=True,
    )
    
    # Controle de reenvio/histórico
    revisao_de = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='revisoes',
        help_text="Referência para a proposta anterior quando esta é uma revisão."
    )
    
    motivo_revisao = models.TextField(
        blank=True,
        default="",
        help_text="Explique o que mudou nesta nova proposta (valor/escopo/prazo)."
    )
    
    # Motivo da recusa pelo contratante
    motivo_recusa = models.TextField(
        blank=True,
        default="",
        help_text="Motivo pelo qual o contratante recusou esta proposta."
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
        indexes = [
            models.Index(fields=['trabalho', 'freelancer']),
            models.Index(fields=['freelancer', 'status']),
            models.Index(fields=['trabalho', 'status']),
        ]
    
    def __str__(self):
        return f"Proposta de {self.freelancer.nome} para o trabalho '{self.trabalho.titulo}'"
    
    # Útil no front/serializers
    @property
    def is_reenvio(self) -> bool:
        return (self.numero_envio or 1) > 1