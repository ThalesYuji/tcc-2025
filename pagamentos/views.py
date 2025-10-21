# pagamentos/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django.db.models import Q
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.shortcuts import redirect

import logging
import json

from .models import Pagamento
from .serializers import PagamentoSerializer
from .permissoes import PermissaoPagamento
from services.mercadopago import MercadoPagoService
from notificacoes.utils import enviar_notificacao

logger = logging.getLogger(__name__)


class PagamentoViewSet(viewsets.ModelViewSet):
    """
    CRUD de Pagamento + ações de Checkout Pro.
    Agora sem PIX/BOLETO/CARTÃO direto: só criamos a preferência e confirmamos via webhook.
    """
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

    # ============ CHECKOUT PRO (criar preference) ============
    # aceita /checkout-pro/criar-preferencia/ e /checkout_pro/criar_preferencia/
    @action(detail=False, methods=['post'], url_path=r'checkout[-_]pro/criar[-_]preferencia')
    def criar_preferencia_checkout_pro(self, request):
        """
        Body: { "contrato_id": 123, (opcionais) "cep","rua","numero","bairro","cidade","uf" }
        Cria a preferência e retorna init_point para redirecionar o usuário.
        """
        try:
            contrato_id = request.data.get("contrato_id")
            if not contrato_id:
                return Response({"erro": "contrato_id é obrigatório"}, status=400)

            from contratos.models import Contrato
            try:
                contrato = Contrato.objects.get(id=contrato_id)
            except Contrato.DoesNotExist:
                return Response({"erro": "Contrato não encontrado"}, status=404)

            if contrato.cliente != request.user:
                return Response({"erro": "Você não tem permissão para pagar este contrato"}, status=403)

            # back_urls sempre no backend (evita problemas de auto_return)
            site_url = (getattr(settings, "SITE_URL", "") or "").rstrip("/")
            if not site_url:
                return Response({"erro": "SITE_URL não configurada no backend."}, status=500)

            retorno_backend = f"{site_url}/mercadopago/retorno/"
            back_urls = {"success": retorno_backend, "pending": retorno_backend, "failure": retorno_backend}

            # payer (ajuda o MP a liberar meios lá dentro)
            cpf_limpo = (request.user.cpf or "").replace(".", "").replace("-", "")
            payer = {
                "email": request.user.email,
                "name": getattr(request.user, "nome", "") or getattr(request.user, "first_name", "") or "Cliente",
                "surname": getattr(request.user, "sobrenome", "") or getattr(request.user, "last_name", "") or "",
            }
            if cpf_limpo:
                payer["identification"] = {"type": "CPF", "number": cpf_limpo}

            # endereço opcional
            addr = {
                "zip_code": (request.data.get("cep") or "").replace("-", "") or None,
                "street_name": (request.data.get("rua") or None),
                "street_number": (request.data.get("numero") or None),
                "neighborhood": (request.data.get("bairro") or None),
                "city": (request.data.get("cidade") or None),
                "federal_unit": ((request.data.get("uf") or "").upper()[:2] or None),
            }
            payer["address"] = {k: v for k, v in addr.items() if v}

            mp = MercadoPagoService()
            res = mp.criar_preferencia_checkout_pro(
                titulo=f"Contrato #{contrato.id} - {contrato.trabalho.titulo}",
                quantidade=1,
                valor_unitario=float(contrato.valor),
                external_reference=str(contrato.id),
                back_urls=back_urls,
                auto_return="approved",
                payer={k: v for k, v in payer.items() if v},
            )
            if not res.get("sucesso"):
                return Response({"erro": res.get("erro", "Falha ao criar preferência")}, status=400)

            return Response({
                "sucesso": True,
                "preference_id": res["preference_id"],
                "init_point": res["init_point"],
                "sandbox_init_point": res.get("sandbox_init_point"),
            }, status=201)

        except Exception as e:
            logger.exception("Erro ao criar preference do Checkout Pro")
            return Response({"erro": f"Erro interno: {e}"}, status=500)

    # ================ CONSULTAR STATUS ================
    @action(detail=True, methods=['get'], url_path='status')
    def consultar_status(self, request, pk=None):
        """
        Consulta status no MP pelo payment_id (quando existir) e sincroniza local.
        """
        try:
            pagamento = self.get_object()

            if pagamento.mercadopago_payment_id:
                mp = MercadoPagoService()
                info = mp.consultar_pagamento(pagamento.mercadopago_payment_id)
                if info:
                    novo = mp.mapear_status_mp_para_local(info['status'])
                    if novo != pagamento.status:
                        pagamento.status = novo
                        pagamento.save()
                        if novo == 'aprovado':
                            self._concluir_contrato(pagamento.contrato)

            serializer = self.get_serializer(pagamento)
            return Response(serializer.data, status=200)

        except Exception:
            logger.exception("Erro ao consultar status")
            return Response({"erro": "Erro ao consultar status do pagamento"}, status=500)

    # helper: conclui contrato e notifica
    def _concluir_contrato(self, contrato):
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
# Retorno do Checkout Pro -> redireciona para o front
# ------------------------
def mercadopago_retorno(request):
    front_base = (getattr(settings, "FRONT_RETURN_URL", None)
                  or f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')}/checkout/retorno")
    qs = request.GET.urlencode()
    destino = f"{front_base}?{qs}" if qs else front_base
    logger.info("↪️ Redirecionando retorno do MP para o front: %s", destino)
    return redirect(destino)


# ------------------------
# Webhook Mercado Pago (sem JWT)
# ------------------------
@csrf_exempt
def mercadopago_webhook(request):
    if request.method != "POST":
        return HttpResponse(status=405)

    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        logger.error("❌ Webhook MP: JSON inválido")
        return JsonResponse({"error": "JSON inválido"}, status=400)

    logger.info("🔔 Webhook recebido do Mercado Pago: %s", data.get('type'))

    if data.get("type") == "payment":
        payment_id = data.get("data", {}).get("id")
        if not payment_id:
            return JsonResponse({"status": "ok"}, status=200)

        mp = MercadoPagoService()
        info = mp.consultar_pagamento(str(payment_id))
        if not info:
            return JsonResponse({"status": "ok"}, status=200)

        pagamento = Pagamento.objects.filter(mercadopago_payment_id=str(payment_id)).first()

        # se não existir (caso Checkout Pro), cria pelo external_reference (id do contrato)
        if not pagamento:
            external_ref = info.get("external_reference")
            if external_ref:
                try:
                    from contratos.models import Contrato
                    contrato = Contrato.objects.get(id=int(external_ref))
                except Exception:
                    contrato = None

                if contrato:
                    status_local = mp.mapear_status_mp_para_local(info['status'])
                    pagamento = Pagamento.objects.create(
                        contrato=contrato,
                        cliente=contrato.cliente,
                        valor=info.get("transaction_amount") or contrato.valor,
                        metodo='checkout_pro',  # <- padronizado
                        status=status_local,
                        mercadopago_payment_id=str(payment_id),
                    )
                else:
                    return JsonResponse({"status": "ok"}, status=200)
            else:
                return JsonResponse({"status": "ok"}, status=200)

        status_antigo = pagamento.status
        pagamento.status = mp.mapear_status_mp_para_local(info['status'])
        pagamento.save()

        if pagamento.status == 'aprovado' and status_antigo != 'aprovado':
            contrato = pagamento.contrato
            if contrato.status != "concluido":
                PagamentoViewSet()._concluir_contrato(contrato)
        elif pagamento.status == 'rejeitado' and status_antigo != 'rejeitado':
            enviar_notificacao(
                usuario=pagamento.contrato.cliente,
                mensagem=f"O pagamento do contrato '{pagamento.contrato.trabalho.titulo}' foi rejeitado. Tente novamente.",
                link=f"/contratos/{pagamento.contrato.id}/pagamento"
            )

    return JsonResponse({"status": "ok"}, status=200)


# ------------------------
# DEV: força aprovação (sandbox) - precisa JWT + staff/superuser
# ------------------------
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def force_approve_payment(request, pagamento_id: int):
    """
    Endpoint de teste:
    - Busca infos no MP pelo payment_id
    - Garante Pagamento local
    - Marca como 'aprovado' e conclui o contrato
    """
    if not (request.user.is_staff or request.user.is_superuser):
        return Response({"erro": "Acesso restrito a staff/superuser."}, status=403)

    mp_id = str(pagamento_id)
    mp = MercadoPagoService()

    info = mp.consultar_pagamento(mp_id)
    if not info:
        return Response({"erro": f"Pagamento {mp_id} não encontrado no Mercado Pago."}, status=404)

    pagamento = Pagamento.objects.filter(mercadopago_payment_id=mp_id).first()

    if not pagamento:
        external_ref = info.get("external_reference")
        contrato = None
        if external_ref:
            try:
                from contratos.models import Contrato
                contrato = Contrato.objects.get(id=int(external_ref))
            except Exception:
                contrato = None

        if not contrato:
            return Response({"erro": "Não há Pagamento local e o external_reference não mapeia um contrato."}, status=404)

        pagamento = Pagamento.objects.create(
            contrato=contrato,
            cliente=contrato.cliente,
            valor=info.get("transaction_amount") or contrato.valor,
            metodo='checkout_pro',  # <- padronizado
            status='pendente',
            mercadopago_payment_id=mp_id,
        )

    status_antigo = pagamento.status
    pagamento.status = 'aprovado'
    pagamento.save()

    if status_antigo != 'aprovado':
        PagamentoViewSet()._concluir_contrato(pagamento.contrato)

    return Response({
        "ok": True,
        "payment_id": mp_id,
        "pagamento_local_id": pagamento.id,
        "status": pagamento.status,
    }, status=200)
