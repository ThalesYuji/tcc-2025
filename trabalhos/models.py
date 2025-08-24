from django.db import models
from django.conf import settings
import unicodedata
import os

# Função para normalizar o nome do arquivo removendo acentos, espaços e caracteres especiais
def upload_to_anexos(instance, filename):
    nome, ext = os.path.splitext(filename)
    # Remove acentos e caracteres especiais
    nome_normalizado = unicodedata.normalize('NFKD', nome).encode('ASCII', 'ignore').decode('ASCII')
    # Substitui espaços por underline e mantém apenas caracteres seguros
    nome_normalizado = "".join([c if c.isalnum() or c == '_' else '_' for c in nome_normalizado.replace(" ", "_")])
    # Garante unicidade básica (caso de arquivos duplicados)
    return f"anexos/{nome_normalizado}{ext}"

class Trabalho(models.Model):
    STATUS_CHOICES = (
        ('aberto', 'Aberto'),
        ('em_andamento', 'Em andamento'),
        ('concluido', 'Concluído'),
        ('cancelado', 'Cancelado'),
    )

    titulo = models.CharField(max_length=200)
    descricao = models.TextField()
    prazo = models.DateField()
    orcamento = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='aberto'
    )
    cliente = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='trabalhos_publicados'
    )
    anexo = models.FileField(
        upload_to=upload_to_anexos,
        blank=True,
        null=True
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
