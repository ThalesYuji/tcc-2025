from .models import Notificacao

def enviar_notificacao(usuario, mensagem, link=None, commit=True):
    if usuario and mensagem:
        notificacao = Notificacao(
            usuario=usuario,
            mensagem=mensagem.strip(),
            link=link or ""
        )
        if commit:
            notificacao.save()
        return notificacao
