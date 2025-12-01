from django.db import models
from django.utils import timezone
from usuarios.models import Usuario
from denuncias.models import Denuncia

class Punicao(models.Model):
    """
    Representa uma punição administrativa aplicada a um usuário.
    Cada punição pode ou não estar vinculada a uma denúncia.
    """

    TIPOS = [
        ("advertencia", "Advertência"),
        ("suspensao", "Suspensão Temporária"),
        ("banimento", "Banimento Permanente"),
    ]

    usuario_punido = models.ForeignKey(
        Usuario,
        related_name="punicoes_recebidas",
        on_delete=models.CASCADE
    )

    admin_responsavel = models.ForeignKey(
        Usuario,
        related_name="punicoes_aplicadas",
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    denuncia_relacionada = models.ForeignKey(
        Denuncia,
        related_name="punicoes",
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    tipo = models.CharField(max_length=20, choices=TIPOS)
    motivo = models.TextField()

    criado_em = models.DateTimeField(auto_now_add=True)
    valido_ate = models.DateTimeField(null=True, blank=True)

    ativo = models.BooleanField(default=True)

    # 🔥 NOVO – Histórico de remoção
    removida_em = models.DateTimeField(null=True, blank=True)
    removida_por_admin = models.ForeignKey(
        Usuario,
        related_name="punicoes_removidas",
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    def esta_expirada(self):
        if self.tipo != "suspensao":
            return False
        if self.valido_ate and timezone.now() > self.valido_ate:
            return True
        return False

    def __str__(self):
        return f"{self.tipo} - {self.usuario_punido} ({self.criado_em.date()})"
