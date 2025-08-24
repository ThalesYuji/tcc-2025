from django.db import models

class Habilidade(models.Model):
    nome = models.CharField(max_length=100, unique=True)  # Nome único
    categoria = models.CharField(max_length=100, blank=True, null=True)
    subcategoria = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        ordering = ['nome']  # Ordena sempre por nome

    def __str__(self):
        return self.nome
