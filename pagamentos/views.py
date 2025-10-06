# pagamentos/views.py
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.conf import settings
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
import stripe

# ✅ Import correto das exceções do Stripe
from stripe import StripeError

from .models import Pagamento
from .serializers import PagamentoSerializer
from .permissoes import PermissaoPagamento
from notificacoes.utils import enviar_notificacao


class PagamentoViewSet(viewsets.ModelViewSet):
    queryset = Pagamento.objects.all()
    serializer_class = PagamentoSerializer
    permission_classes = [IsAuthenticated, PermissaoPagamento]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Pagamento.objects.all()

        return Pagamento.objects.filter(
            Q(cliente=user) |
            Q(contrato__cliente=user) |
            Q(contrato__freelancer=user)
        ).distinct()

    def perform_create(self, serializer):
        """
        🔹 Cria um PaymentIntent no Stripe para o método escolhido.
        Faz a normalização do método (ex: credito/debito → card).
        """
        pagamento = serializer.save(status="pendente")
        contrato = pagamento.contrato

        # 🔹 Normaliza método enviado
        metodo = pagamento.metodo.lower()
        if metodo in ["credito", "debito"]:
            metodo = "card"  # Stripe trata ambos como "card"

        # 🔹 Valor mínimo do Stripe (R$ 5,00)
        if pagamento.valor < 5:
            raise ValueError("O valor mínimo permitido pelo Stripe é R$ 5,00.")

        try:
            # 🔹 Criar PaymentIntent no Stripe
            intent = stripe.PaymentIntent.create(
                amount=int(pagamento.valor * 100),  # Stripe usa centavos
                currency="brl",
                payment_method_types=[metodo],
                metadata={"contrato_id": contrato.id, "pagamento_id": pagamento.id},
            )
        except StripeError as e:
            raise ValueError(
                f"Erro ao criar pagamento no Stripe: {str(e)}. "
                f"Verifique se o método '{metodo}' está habilitado no seu dashboard."
            )

        # 🔹 Atualizar pagamento com dados do Stripe
        pagamento.payment_intent_id = intent.id
        pagamento.status = "em_processamento"
        pagamento.save()

        # 🔹 Notificação inicial
        enviar_notificacao(
            usuario=contrato.cliente,
            mensagem=f"Pagamento criado para o contrato '{contrato.trabalho.titulo}'. Aguarde confirmação.",
            link=f"/contratos/{contrato.id}/pagamento"
        )

        # 🔹 Guardar client_secret para devolver no response
        self.client_secret = intent.client_secret

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        if hasattr(self, "client_secret"):
            response.data["client_secret"] = self.client_secret
        return response

    def perform_update(self, serializer):
        """
        🔹 Admin pode atualizar status manualmente.
        """
        pagamento = serializer.save()
        contrato = pagamento.contrato

        if pagamento.valor != contrato.valor:
            raise ValueError(
                f"O valor do pagamento ({pagamento.valor}) deve ser exatamente igual ao contrato ({contrato.valor})."
            )

        if pagamento.status == "aprovado" and contrato.status != "concluido":
            self._concluir_contrato(contrato)

    def _concluir_contrato(self, contrato):
        """
        🔹 Marca contrato e trabalho como concluídos, envia notificações.
        """
        contrato.status = "concluido"
        contrato.trabalho.status = "concluido"
        contrato.trabalho.save()
        contrato.save()

        enviar_notificacao(
            usuario=contrato.cliente,
            mensagem=f"O contrato do trabalho '{contrato.trabalho.titulo}' foi concluído após o pagamento.",
            link=f"/contratos/{contrato.id}"
        )
        enviar_notificacao(
            usuario=contrato.freelancer,
            mensagem=f"O contrato do trabalho '{contrato.trabalho.titulo}' foi concluído após o pagamento.",
            link=f"/contratos/{contrato.id}"
        )


# ------------------------
# Webhook Stripe (sem DRF, sem JWT, só Django puro)
# ------------------------
@csrf_exempt
def stripe_webhook(request):
    """
    Endpoint público para o Stripe enviar eventos de pagamento.
    ⚠️ Não passa pelo DRF → não exige autenticação JWT.
    Apenas valida a assinatura do Stripe.
    """
    if request.method != "POST":
        return HttpResponse(status=405)  # Método não permitido

    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")
    event = None

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        print("❌ Webhook: Payload inválido")
        return JsonResponse({"error": "Payload inválido"}, status=400)
    except stripe.error.SignatureVerificationError:
        print("❌ Webhook: Assinatura inválida")
        return JsonResponse({"error": "Assinatura inválida"}, status=400)
    except Exception as e:
        print(f"❌ Webhook: Erro inesperado - {str(e)}")
        return JsonResponse({"error": "Erro interno"}, status=500)

    # 🔹 Debug: logar o evento recebido
    print(f"🔔 Evento recebido do Stripe: {event['type']}")

    event_type = event["type"]
    intent = event["data"]["object"]

    # 🔹 Pagamento aprovado
    if event_type == "payment_intent.succeeded":
        pagamento = Pagamento.objects.filter(payment_intent_id=intent["id"]).first()
        if pagamento:
            print(f"✅ Pagamento #{pagamento.id} aprovado")
            pagamento.status = "aprovado"
            pagamento.save()
            
            contrato = pagamento.contrato
            if contrato.status != "concluido":
                # Usar método auxiliar da viewset
                viewset = PagamentoViewSet()
                viewset._concluir_contrato(contrato)
        else:
            print(f"⚠️ PaymentIntent {intent['id']} não encontrado no banco")

    # 🔹 Pagamento falhou
    elif event_type == "payment_intent.payment_failed":
        pagamento = Pagamento.objects.filter(payment_intent_id=intent["id"]).first()
        if pagamento:
            print(f"❌ Pagamento #{pagamento.id} rejeitado")
            pagamento.status = "rejeitado"
            pagamento.save()
            
            # Notificar cliente sobre falha
            enviar_notificacao(
                usuario=pagamento.contrato.cliente,
                mensagem=f"O pagamento do contrato '{pagamento.contrato.trabalho.titulo}' falhou. Tente novamente.",
                link=f"/contratos/{pagamento.contrato.id}/pagamento"
            )
        else:
            print(f"⚠️ PaymentIntent {intent['id']} não encontrado no banco")

    return JsonResponse({"status": "ok"}, status=200)