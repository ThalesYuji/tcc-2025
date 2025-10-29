from django.db import models
from django.utils import timezone
from usuarios.models import Usuario
from contratos.models import Contrato
import os


# =========================
# Upload de anexos
# =========================
def mensagem_upload_to(instance: "Mensagem", filename: str) -> str:
    """
    Caminho do arquivo anexo da mensagem.
    Organiza por contrato e por ano/mês para facilitar manutenção/backup.

    Ex.: mensagens/contrato_10/2025/08/comprovante.pdf
    """
    base, ext = os.path.splitext(filename)
    return f"mensagens/contrato_{instance.contrato_id}/{timezone.now():%Y/%m}/{base}{ext}"


# =========================
# Modelo principal
# =========================
class Mensagem(models.Model):
    """
    Mensagem trocada entre contratante e freelancer dentro de um contrato.
    """

    contrato = models.ForeignKey(
        Contrato,
        on_delete=models.CASCADE,
        related_name="mensagens",
        help_text="Contrato ao qual esta mensagem pertence.",
    )

    remetente = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name="mensagens_enviadas",
        help_text="Usuário que enviou a mensagem.",
    )

    destinatario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name="mensagens_recebidas",
        help_text="Usuário destinatário da mensagem.",
    )

    texto = models.TextField(
        max_length=2000,
        help_text="Conteúdo de texto da mensagem (máx. 2000 caracteres).",
    )

    anexo = models.FileField(
        upload_to=mensagem_upload_to,
        null=True,
        blank=True,
        help_text="Anexo opcional (imagens/PDF).",
    )

    data_envio = models.DateTimeField(auto_now_add=True)
    editada_em = models.DateTimeField(null=True, blank=True)

    # 🔹 Novo campo para exclusão lógica
    excluida = models.BooleanField(default=False, help_text="Indica se a mensagem foi excluída.")

    class Meta:
        ordering = ["data_envio"]

    def __str__(self) -> str:
        return f"Contrato {self.contrato_id} | {self.remetente_id} -> {self.destinatario_id} | {self.data_envio:%d/%m %H:%M}"
