from django.db import models
from usuarios.models import Usuario
from trabalhos.models import Trabalho
from propostas.models import Proposta

class Contrato(models.Model):
    # 🔹 Agora a proposta é opcional (para contratos de trabalhos privados)
    proposta = models.ForeignKey(
        Proposta,
        on_delete=models.CASCADE,
        related_name='contrato',
        null=True,
        blank=True
    )
    trabalho = models.ForeignKey(Trabalho, on_delete=models.CASCADE, related_name='contratos')
    cliente = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='contratos_cliente')
    freelancer = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='contratos_freelancer')
    valor = models.DecimalField(max_digits=10, decimal_places=2)  # 🔹 valor aceito da proposta ou do trabalho
    data_inicio = models.DateField(auto_now_add=True)
    data_fim = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=[
        ('ativo', 'Ativo'),
        ('concluido', 'Concluído'),
        ('cancelado', 'Cancelado')
    ], default='ativo')

    def __str__(self):
        return f"Contrato: {self.cliente.nome} ⇄ {self.freelancer.nome} | {self.trabalho.titulo}"
