import sendgrid
from sendgrid.helpers.mail import Mail
from django.conf import settings
import logging

# Configura logger para exibir mensagens no console e Railway
logger = logging.getLogger("sendgrid")

def enviar_email_sendgrid(destinatario, assunto, corpo_texto, corpo_html=None):
    """
    Envia e-mail via API HTTPS do SendGrid.
    Compatível com Railway e ambiente local.
    """
    try:
        logger.info(f"📤 Iniciando envio de e-mail para: {destinatario}")

        # Cria cliente SendGrid com a API Key
        sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)

        # Monta o corpo da mensagem
        mensagem = Mail(
            from_email=settings.DEFAULT_FROM_EMAIL,
            to_emails=destinatario,
            subject=assunto,
            plain_text_content=corpo_texto,
            html_content=corpo_html or corpo_texto,
        )

        # Envia e registra o resultado
        response = sg.send(mensagem)
        logger.info(f"✅ E-mail enviado para {destinatario} - Status {response.status_code}")

    except Exception as e:
        logger.error(f"❌ Falha ao enviar e-mail para {destinatario}: {e}")
