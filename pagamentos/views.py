# pagamentos/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
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

from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import user_passes_test

logger = logging.getLogger(__name__)


class PagamentoViewSet(viewsets.ModelViewSet):
    queryset = Pagamento.objects.all()
    serializer_class = PagamentoSerializer
    permission_classes = [IsAuthenticated, PermissaoPagamento]

    # ---------------- Queryset por usuário ----------------
    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Pagamento.objects.all()
        return Pagamento.objects.filter(
            Q(cliente=user) |
            Q(contrato__cliente=user) |
            Q(contrato__freelancer=user)
        ).distinct()

    # ===================== PIX =====================
    @action(detail=False, methods=['post'], url_path='criar-pix')
    def criar_pix(self, request):
        try:
            contrato_id = request.data.get('contrato_id')
            if not contrato_id:
                return Response({"erro": "contrato_id é obrigatório"}, status=400)

            from contratos.models import Contrato
            try:
                contrato = Contrato.objects.get(id=contrato_id)
            except Contrato.DoesNotExist:
                return Response({"erro": "Contrato não encontrado"}, status=404)

            if contrato.cliente != request.user:
                return Response({"erro": "Você não tem permissão para pagar este contrato"}, status=403)

            # evita duplicidade
            if Pagamento.objects.filter(
                contrato=contrato, status__in=['pendente', 'em_processamento']
            ).exists():
                return Response({"erro": "Já existe um pagamento pendente para este contrato"}, status=400)

            if not request.user.cpf:
                return Response({"erro": "É necessário ter um CPF cadastrado para realizar pagamentos"}, status=400)

            cpf_limpo = request.user.cpf.replace(".", "").replace("-", "").replace(" ", "")

            mp = MercadoPagoService()
            res = mp.criar_pagamento_pix(
                valor=float(contrato.valor),
                descricao=f"Pagamento do contrato #{contrato.id} - {contrato.trabalho.titulo}",
                email_pagador=request.user.email,
                cpf_pagador=cpf_limpo,
                nome_pagador=getattr(request.user, "nome", "") or request.user.get_full_name() or "Cliente",
                external_reference=str(contrato.id),
            )
            if not res.get("sucesso"):
                return Response({"erro": res.get("erro", "Erro ao criar pagamento no Mercado Pago")}, status=400)

            pagamento = Pagamento.objects.create(
                contrato=contrato,
                cliente=request.user,
                valor=contrato.valor,
                metodo='pix',
                status='pendente',
                mercadopago_payment_id=res['payment_id'],
                codigo_transacao=res.get('qr_code') or "",
            )

            try:
                enviar_notificacao(
                    usuario=request.user,
                    mensagem=f"Pagamento PIX criado para o contrato '{contrato.trabalho.titulo}'.",
                    link=f"/contratos/{contrato.id}/pagamento",
                )
            except Exception:
                logger.warning("Falha ao enviar notificação do PIX", exc_info=True)

            return Response({
                "sucesso": True,
                "pagamento_id": pagamento.id,
                "mercadopago_payment_id": res['payment_id'],
                "qr_code": res.get('qr_code'),
                "qr_code_base64": res.get('qr_code_base64'),
                "ticket_url": res.get('ticket_url'),
                "expiration_date": res.get('expiration_date'),
            }, status=201)

        except Exception as e:
            logger.exception("Erro inesperado ao criar pagamento PIX")
            return Response({"erro": f"Erro interno: {e}"}, status=500)

    # =================== BOLETO ====================
    @action(detail=False, methods=['post'], url_path='criar-boleto')
    def criar_boleto(self, request):
        try:
            contrato_id = request.data.get('contrato_id')
            if not contrato_id:
                return Response({"erro": "contrato_id é obrigatório"}, status=400)

            from contratos.models import Contrato
            try:
                contrato = Contrato.objects.get(id=contrato_id)
            except Contrato.DoesNotExist:
                return Response({"erro": "Contrato não encontrado"}, status=404)

            if contrato.cliente != request.user:
                return Response({"erro": "Você não tem permissão para pagar este contrato"}, status=403)

            if float(contrato.valor) < 3:
                return Response({"erro": "O valor mínimo para boleto é R$ 3,00."}, status=400)

            if Pagamento.objects.filter(
                contrato=contrato, status__in=['pendente', 'em_processamento']
            ).exists():
                return Response({"erro": "Já existe um pagamento pendente para este contrato"}, status=400)

            if not request.user.cpf:
                return Response({"erro": "É necessário ter um CPF cadastrado para realizar pagamentos"}, status=400)

            cpf_limpo = request.user.cpf.replace(".", "").replace("-", "").replace(" ", "")

            endereco = {
                "zip_code": (request.data.get("cep") or "").replace("-", "").strip(),
                "street_name": request.data.get("rua"),
                "street_number": request.data.get("numero"),
                "neighborhood": request.data.get("bairro"),
                "city": request.data.get("cidade"),
                "federal_unit": (request.data.get("uf") or "").upper()[:2],
            }
            faltando = [k for k, v in endereco.items() if not v]
            if faltando:
                return Response(
                    {"erro": "Para gerar boleto, informe CEP, rua, número, bairro, cidade e UF.",
                     "campos_faltando": faltando},
                    status=400
                )

            mp = MercadoPagoService()
            res = mp.criar_pagamento_boleto(
                valor=float(contrato.valor),
                descricao=f"Pagamento do contrato #{contrato.id} - {contrato.trabalho.titulo}",
                email_pagador=request.user.email,
                cpf_pagador=cpf_limpo,
                nome_pagador=getattr(request.user, "nome", "") or request.user.get_full_name() or "Cliente",
                external_reference=str(contrato.id),
                endereco=endereco,
            )
            if not res.get("sucesso"):
                return Response({"erro": res.get("erro", "Erro ao criar boleto no Mercado Pago")}, status=400)

            pagamento = Pagamento.objects.create(
                contrato=contrato,
                cliente=request.user,
                valor=contrato.valor,
                metodo='boleto',
                status='pendente',
                mercadopago_payment_id=res['payment_id'],
                codigo_transacao=res['boleto_url'],
            )

            try:
                enviar_notificacao(
                    usuario=request.user,
                    mensagem=f"Boleto gerado para o contrato '{contrato.trabalho.titulo}'.",
                    link=f"/contratos/{contrato.id}/pagamento",
                )
            except Exception:
                logger.warning("Falha ao enviar notificação do Boleto", exc_info=True)

            return Response({
                "sucesso": True,
                "pagamento_id": pagamento.id,
                "mercadopago_payment_id": res['payment_id'],
                "boleto_url": res['boleto_url'],
                "barcode": res.get('barcode'),
                "expiration_date": res.get('expiration_date'),
            }, status=201)

        except Exception as e:
            logger.exception("Erro inesperado ao criar boleto")
            return Response({"erro": f"Erro interno: {e}"}, status=500)

    # =================== CARTÃO ====================
    @action(detail=False, methods=['post'], url_path='criar-cartao')
    def criar_cartao(self, request):
        try:
            contrato_id = request.data.get('contrato_id')
            token_cartao = request.data.get('token')
            parcelas = request.data.get('parcelas', 1)

            if not all([contrato_id, token_cartao]):
                return Response({"erro": "contrato_id e token são obrigatórios"}, status=400)

            from contratos.models import Contrato
            try:
                contrato = Contrato.objects.get(id=contrato_id)
            except Contrato.DoesNotExist:
                return Response({"erro": "Contrato não encontrado"}, status=404)

            if contrato.cliente != request.user:
                return Response({"erro": "Você não tem permissão para pagar este contrato"}, status=403)

            if Pagamento.objects.filter(
                contrato=contrato, status__in=['pendente', 'em_processamento']
            ).exists():
                return Response({"erro": "Já existe um pagamento pendente para este contrato"}, status=400)

            mp = MercadoPagoService()
            cpf_limpo = request.user.cpf.replace(".", "").replace("-", "") if request.user.cpf else ""

            res = mp.criar_pagamento_cartao(
                valor=float(contrato.valor),
                descricao=f"Pagamento do contrato #{contrato.id} - {contrato.trabalho.titulo}",
                token_cartao=token_cartao,
                parcelas=int(parcelas),
                email_pagador=request.user.email,
                cpf_pagador=cpf_limpo,
                external_reference=str(contrato.id),
            )
            if not res.get("sucesso"):
                return Response({"erro": res.get("erro", "Erro ao criar pagamento")}, status=400)

            status_local = mp.mapear_status_mp_para_local(res['status'])
            pagamento = Pagamento.objects.create(
                contrato=contrato,
                cliente=request.user,
                valor=contrato.valor,
                metodo='card',
                status=status_local,
                mercadopago_payment_id=res['payment_id'],
            )

            if status_local == 'aprovado':
                self._concluir_contrato(contrato)

            enviar_notificacao(
                usuario=request.user,
                mensagem=f"Pagamento com cartão processado para o contrato '{contrato.trabalho.titulo}'.",
                link=f"/contratos/{contrato.id}/pagamento",
            )

            return Response({
                "sucesso": True,
                "pagamento_id": pagamento.id,
                "mercadopago_payment_id": res['payment_id'],
                "status": status_local,
                "status_detail": res.get('status_detail'),
            }, status=201)

        except Exception as e:
            logger.exception("Erro ao criar pagamento no cartão")
            return Response({"erro": "Erro interno ao processar pagamento"}, status=500)

    # ============ CHECKOUT PRO (criar preference) ============
    # aceita /checkout-pro/criar-preferencia/ e /checkout_pro/criar_preferencia/
    @action(detail=False, methods=['post'], url_path=r'checkout[-_]pro/criar[-_]preferencia')
    def criar_preferencia_checkout_pro(self, request):
        """
        Cria uma preference do Checkout Pro.
        Body: { "contrato_id": 123, (opcionais) "cep","rua","numero","bairro","cidade","uf","telefone" }
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

            # back_urls SEMPRE para o backend (evita erro de auto_return)
            site_url = (getattr(settings, "SITE_URL", "") or "").rstrip("/")
            if not site_url:
                return Response({"erro": "SITE_URL não configurada no backend."}, status=500)

            retorno_backend = f"{site_url}/mercadopago/retorno/"
            back_urls = {"success": retorno_backend, "pending": retorno_backend, "failure": retorno_backend}

            # payer completo ajuda a liberar boleto/pix dentro do Checkout Pro
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

        except Exception as e:
            logger.exception("Erro ao consultar status")
            return Response({"erro": "Erro ao consultar status do pagamento"}, status=500)

    # ================== HELPER ==================
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
# Retorno do Checkout Pro (redireciona ao front)
# ------------------------
def mercadopago_retorno(request):
    """
    O Mercado Pago redireciona o comprador para esta URL pública (success/pending/failure).
    Aqui só repassamos os parâmetros para a rota do front.
    """
    front_base = (getattr(settings, "FRONT_RETURN_URL", None)
                  or f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')}/checkout/retorno")
    qs = request.GET.urlencode()
    destino = f"{front_base}?{qs}" if qs else front_base
    logger.info("↪️ Redirecionando retorno do MP para o front: %s", destino)
    return redirect(destino)


# ------------------------
# Webhook Mercado Pago (sem DRF, sem JWT, só Django puro)
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

        # Se pagamento não existir (caso do Checkout Pro), cria a partir do external_reference
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
                        metodo='checkout_pro',
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
                viewset = PagamentoViewSet()
                viewset._concluir_contrato(contrato)
        elif pagamento.status == 'rejeitado' and status_antigo != 'rejeitado':
            enviar_notificacao(
                usuario=pagamento.contrato.cliente,
                mensagem=f"O pagamento do contrato '{pagamento.contrato.trabalho.titulo}' foi rejeitado. Tente novamente.",
                link=f"/contratos/{pagamento.contrato.id}/pagamento"
            )

    return JsonResponse({"status": "ok"}, status=200)

# --- APENAS DEV: força aprovação de um pagamento ---
@csrf_exempt
@require_POST
@user_passes_test(lambda u: u.is_staff, login_url=None, redirect_field_name=None)  # só staff pode usar
def force_approve_payment(request, pagamento_id: int):
    """
    Marca um Pagamento como 'aprovado' e conclui o contrato (APENAS DEBUG).
    Exemplo: POST /mercadopago/test/force-approve/123/
    """
    if not settings.DEBUG:
        return HttpResponse(status=404)

    try:
        pagamento = Pagamento.objects.get(id=pagamento_id)
    except Pagamento.DoesNotExist:
        return JsonResponse({"erro": "Pagamento não encontrado"}, status=404)

    status_antigo = pagamento.status
    pagamento.status = "aprovado"
    pagamento.save()

    # conclui contrato se ainda não estiver
    if pagamento.contrato.status != "concluido":
        PagamentoViewSet()._concluir_contrato(pagamento.contrato)

    logger.info(f"🔧 Forçado: pagamento #{pagamento.id} {status_antigo} -> aprovado (DEV)")
    return JsonResponse({"ok": True, "pagamento_id": pagamento.id, "novo_status": pagamento.status})
