from django.db import models
from usuarios.models import Usuario
from contratos.models import Contrato

class Avaliacao(models.Model):
    contrato = models.ForeignKey(
        Contrato,
        on_delete=models.CASCADE,
        related_name='avaliacoes'
    )
    avaliador = models.ForeignKey(
        Usuario, on_delete=models.CASCADE, related_name='avaliacoes_feitas'
    )
    avaliado = models.ForeignKey(
        Usuario, on_delete=models.CASCADE, related_name='avaliacoes_recebidas'
    )
    nota = models.IntegerField()
    comentario = models.TextField(blank=True, null=True, max_length=500)
    data_avaliacao = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('contrato', 'avaliador')

    def __str__(self):
        return f"Avaliação de {self.avaliador.nome} para {self.avaliado.nome} | Nota: {self.nota}"
