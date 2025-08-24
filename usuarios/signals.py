from django.db.models.signals import post_delete
from django.dispatch import receiver
from .models import Usuario

@receiver(post_delete, sender=Usuario)
def deletar_usuario_log(sender, instance, **kwargs):
    print(f"Usuário '{instance.email}' deletado com sucesso.")
