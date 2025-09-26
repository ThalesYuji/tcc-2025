from django.db import models
from usuarios.models import Usuario

class Denuncia(models.Model):
    denunciante = models.ForeignKey(
        Usuario,
        related_name='denuncias_feitas',
        on_delete=models.CASCADE
    )
    denunciado = models.ForeignKey(
        Usuario,
        related_name='denuncias_recebidas',
        on_delete=models.CASCADE
    )
    motivo = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=[
            ('Pendente', 'Pendente'),
            ('Analisando', 'Analisando'),
            ('Resolvida', 'Resolvida'),
        ],
        default='Pendente'
    )
    resposta_admin = models.TextField(blank=True, null=True)
    data_criacao = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Denúncia de {self.denunciante} contra {self.denunciado}"

class DenunciaProva(models.Model):
    denuncia = models.ForeignKey(
        Denuncia,
        related_name="provas",
        on_delete=models.CASCADE
    )
    arquivo = models.ImageField(upload_to="provas_denuncias/")
    data_upload = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Prova #{self.id} da denúncia {self.denuncia.id}"
