# habilidades/models.py
from django.db import models


class Ramo(models.Model):
    """
    Vocabulário controlado de macro-áreas (ex.: Backend, Frontend, Mobile, UI/UX, Data/IA, DevOps, etc.)
    Será referenciado por Trabalho.ramo como um FK OPCIONAL.
    """
    nome = models.CharField(
        max_length=100,
        unique=True,
        help_text="Nome do ramo (único). Ex.: Backend, Frontend, Mobile, UI/UX, Data/IA, DevOps..."
    )

    class Meta:
        ordering = ["nome"]  # lista sempre em ordem alfabética
        verbose_name = "Ramo"
        verbose_name_plural = "Ramos"

    def __str__(self) -> str:
        return self.nome


class Habilidade(models.Model):
    """
    Lista de habilidades específicas (tagging detalhado).
    Continua independente do Ramo: um Trabalho pode ter várias habilidades
    e, opcionalmente, um único Ramo para triagem rápida.
    """
    nome = models.CharField(max_length=100, unique=True)  # Nome único
    categoria = models.CharField(max_length=100, blank=True, null=True)
    subcategoria = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        ordering = ['nome']  # Ordena sempre por nome
        verbose_name = "Habilidade"
        verbose_name_plural = "Habilidades"

    def __str__(self):
        return self.nome
