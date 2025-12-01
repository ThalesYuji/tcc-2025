from django.db import models
from django.conf import settings
import unicodedata
import os


# Função para normalizar o nome do arquivo
def upload_to_anexos(instance, filename):
    nome, ext = os.path.splitext(filename)
    nome_normalizado = unicodedata.normalize('NFKD', nome).encode('ASCII', 'ignore').decode('ASCII')
    nome_normalizado = "".join([c if c.isalnum() or c == '_' else '_' for c in nome_normalizado.replace(" ", "_")])
    return f"anexos/{nome_normalizado}{ext}"


class Trabalho(models.Model):
    STATUS_CHOICES = (
        ('aberto', 'Aberto'),
        ('aguardando_aceitacao', 'Aguardando aceitação do freelancer'),
        ('em_andamento', 'Em andamento'),
        ('concluido', 'Concluído'),
        ('cancelado', 'Cancelado'),
        ('recusado', 'Recusado'),
    )

    titulo = models.CharField(max_length=200)
    descricao = models.TextField()
    prazo = models.DateField()
    orcamento = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default='aberto')

    # vincula ao contratante
    contratante = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='trabalhos_publicados'
    )

    # Caso seja um trabalho privado (freelancer específico)
    freelancer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='trabalhos_direcionados'
    )

    is_privado = models.BooleanField(default=False)

    anexo = models.FileField(upload_to=upload_to_anexos, blank=True, null=True)

    # Ramo
    ramo = models.ForeignKey(
        'habilidades.Ramo',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='trabalhos',
        help_text="Macro-área do trabalho (ex.: Backend, Frontend, Mobile...). Opcional."
    )

    habilidades = models.ManyToManyField(
        'habilidades.Habilidade',
        blank=True,
        related_name='trabalhos'
    )

    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.titulo
