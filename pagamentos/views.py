# pagamentos/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
import logging

from .models import Pagamento
from .serializers import PagamentoSerializer
from .permissoes import PermissaoPagamento
from services.mercadopago import MercadoPagoService
from notificacoes.utils import enviar_notificacao

logger = logging.getLogger(__name__)


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

    # ===================== PIX =====================
    @action(detail=False, methods=['post'], url_path='criar-pix')
    def criar_pix(self, request):
        """
        Cria um pagamento via PIX
        POST /api/pagamentos/criar-pix/
        Body: { "contrato_id": 1 }
        """
        try:
            contrato_id = request.data.get('contrato_id')
            logger.info(f"📥 Recebido contrato_id: {contrato_id}")

            if not contrato_id:
                return Response({"erro": "contrato_id é obrigatório"}, status=status.HTTP_400_BAD_REQUEST)

            # Busca o contrato
            from contratos.models import Contrato
            try:
                contrato = Contrato.objects.get(id=contrato_id)
                logger.info(f"✅ Contrato encontrado: #{contrato.id}")
            except Contrato.DoesNotExist:
                logger.error(f"❌ Contrato {contrato_id} não encontrado")
                return Response({"erro": "Contrato não encontrado"}, status=status.HTTP_404_NOT_FOUND)

            # Verifica se o usuário é o cliente do contrato
            if contrato.cliente != request.user:
                logger.error(f"❌ Usuário {request.user.id} não é cliente")
                return Response({"erro": "Você não tem permissão para pagar este contrato"}, status=status.HTTP_403_FORBIDDEN)

            # Verifica pagamento pendente
            pagamento_existente = Pagamento.objects.filter(
                contrato=contrato,
                status__in=['pendente', 'em_processamento']
            ).first()
            if pagamento_existente:
                logger.warning(f"⚠️ Pagamento pendente já existe: #{pagamento_existente.id}")
                return Response({"erro": "Já existe um pagamento pendente para este contrato"}, status=status.HTTP_400_BAD_REQUEST)

            # Verifica CPF
            if not request.user.cpf:
                logger.error("❌ Usuário sem CPF")
                return Response({"erro": "É necessário ter um CPF cadastrado para realizar pagamentos"}, status=status.HTTP_400_BAD_REQUEST)

            cpf_limpo = request.user.cpf.replace(".", "").replace("-", "").replace(" ", "")
            logger.info(f"🔐 CPF processado: {cpf_limpo[:3]}***")

            # Mercado Pago
            mp_service = MercadoPagoService()
            logger.info("💳 Criando pagamento PIX no Mercado Pago...")

            resultado = mp_service.criar_pagamento_pix(
                valor=float(contrato.valor),
                descricao=f"Pagamento do contrato #{contrato.id} - {contrato.trabalho.titulo}",
                email_pagador=request.user.email,
                cpf_pagador=cpf_limpo,
                nome_pagador=request.user.nome,
                external_reference=str(contrato.id)
            )

            if not resultado.get("sucesso"):
                logger.error(f"❌ Erro MP: {resultado.get('erro')}")
                return Response({"erro": resultado.get("erro", "Erro ao criar pagamento no Mercado Pago")}, status=status.HTTP_400_BAD_REQUEST)

            logger.info(f"✅ Pagamento criado no MP: {resultado['payment_id']}")

            pagamento = Pagamento.objects.create(
                contrato=contrato,
                cliente=request.user,
                valor=contrato.valor,
                metodo='pix',
                status='pendente',
                mercadopago_payment_id=resultado['payment_id'],
                codigo_transacao=resultado['qr_code']
            )

            logger.info(f"✅ Pagamento salvo no banco: #{pagamento.id}")

            try:
                enviar_notificacao(
                    usuario=request.user,
                    mensagem=f"Pagamento PIX criado para o contrato '{contrato.trabalho.titulo}'. Use o QR Code para pagar.",
                    link=f"/contratos/{contrato.id}/pagamento"
                )
            except Exception as e:
                logger.warning(f"⚠️ Erro ao enviar notificação: {str(e)}")

            return Response({
                "sucesso": True,
                "pagamento_id": pagamento.id,
                "mercadopago_payment_id": resultado['payment_id'],
                "qr_code": resultado['qr_code'],
                "qr_code_base64": resultado['qr_code_base64'],
                "ticket_url": resultado['ticket_url'],
                "expiration_date": resultado.get('expiration_date'),
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"❌ Erro inesperado ao criar pagamento PIX: {str(e)}", exc_info=True)
            return Response({"erro": f"Erro interno: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # =================== BOLETO ====================
    @action(detail=False, methods=['post'], url_path='criar-boleto')
    def criar_boleto(self, request):
        """
        Cria um pagamento via Boleto Registrado
        POST /api/pagamentos/criar-boleto/
        Body obrigatório:
          {
            "contrato_id": 1,
            "cep": "12345678",
            "rua": "Av. Brasil",
            "numero": "1000",
            "bairro": "Centro",
            "cidade": "São Paulo",
            "uf": "SP"
          }
        """
        try:
            contrato_id = request.data.get('contrato_id')
            logger.info(f"📥 Recebido contrato_id para boleto: {contrato_id}")

            if not contrato_id:
                return Response({"erro": "contrato_id é obrigatório"}, status=status.HTTP_400_BAD_REQUEST)

            from contratos.models import Contrato
            try:
                contrato = Contrato.objects.get(id=contrato_id)
                logger.info(f"✅ Contrato encontrado: #{contrato.id}")
            except Contrato.DoesNotExist:
                logger.error(f"❌ Contrato {contrato_id} não encontrado")
                return Response({"erro": "Contrato não encontrado"}, status=status.HTTP_404_NOT_FOUND)

            if contrato.cliente != request.user:
                logger.error(f"❌ Usuário {request.user.id} não é cliente")
                return Response({"erro": "Você não tem permissão para pagar este contrato"}, status=status.HTTP_403_FORBIDDEN)

            pagamento_existente = Pagamento.objects.filter(
                contrato=contrato,
                status__in=['pendente', 'em_processamento']
            ).first()
            if pagamento_existente:
                logger.warning(f"⚠️ Pagamento pendente já existe: #{pagamento_existente.id}")
                return Response({"erro": "Já existe um pagamento pendente para este contrato"}, status=status.HTTP_400_BAD_REQUEST)

            if not request.user.cpf:
                logger.error("❌ Usuário sem CPF")
                return Response({"erro": "É necessário ter um CPF cadastrado para realizar pagamentos"}, status=status.HTTP_400_BAD_REQUEST)

            cpf_limpo = request.user.cpf.replace(".", "").replace("-", "").replace(" ", "")
            logger.info(f"🔐 CPF processado: {cpf_limpo[:3]}***")

            # Endereço exigido pelo boleto registrado
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
                    status=status.HTTP_400_BAD_REQUEST
                )

            mp_service = MercadoPagoService()
            logger.info("📄 Criando boleto no Mercado Pago...")

            resultado = mp_service.criar_pagamento_boleto(
                valor=float(contrato.valor),
                descricao=f"Pagamento do contrato #{contrato.id} - {contrato.trabalho.titulo}",
                email_pagador=request.user.email,
                cpf_pagador=cpf_limpo,
                nome_pagador=request.user.nome,
                external_reference=str(contrato.id),
                endereco=endereco,
            )

            if not resultado.get("sucesso"):
                logger.error(f"❌ Erro MP: {resultado.get('erro')}")
                return Response({"erro": resultado.get("erro", "Erro ao criar boleto no Mercado Pago")}, status=status.HTTP_400_BAD_REQUEST)

            logger.info(f"✅ Boleto criado no MP: {resultado['payment_id']}")

            pagamento = Pagamento.objects.create(
                contrato=contrato,
                cliente=request.user,
                valor=contrato.valor,
                metodo='boleto',
                status='pendente',
                mercadopago_payment_id=resultado['payment_id'],
                codigo_transacao=resultado['boleto_url']
            )

            logger.info(f"✅ Pagamento salvo no banco: #{pagamento.id}")

            try:
                enviar_notificacao(
                    usuario=request.user,
                    mensagem=f"Boleto gerado para o contrato '{contrato.trabalho.titulo}'. Acesse o link para pagar.",
                    link=f"/contratos/{contrato.id}/pagamento"
                )
            except Exception as e:
                logger.warning(f"⚠️ Erro ao enviar notificação: {str(e)}")

            return Response({
                "sucesso": True,
                "pagamento_id": pagamento.id,
                "mercadopago_payment_id": resultado['payment_id'],
                "boleto_url": resultado['boleto_url'],
                "barcode": resultado.get('barcode'),
                "expiration_date": resultado.get('expiration_date'),
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"❌ Erro inesperado ao criar boleto: {str(e)}", exc_info=True)
            return Response({"erro": f"Erro interno: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # =================== CARTÃO ====================
    @action(detail=False, methods=['post'], url_path='criar-cartao')
    def criar_cartao(self, request):
        """
        Cria um pagamento via Cartão
        POST /api/pagamentos/criar-cartao/
        Body:
        {
            "contrato_id": 1,
            "token": "token_do_cartao",
            "parcelas": 1
        }
        """
        try:
            contrato_id = request.data.get('contrato_id')
            token_cartao = request.data.get('token')
            parcelas = request.data.get('parcelas', 1)

            if not all([contrato_id, token_cartao]):
                return Response({"erro": "contrato_id e token são obrigatórios"}, status=status.HTTP_400_BAD_REQUEST)

            from contratos.models import Contrato
            try:
                contrato = Contrato.objects.get(id=contrato_id)
            except Contrato.DoesNotExist:
                return Response({"erro": "Contrato não encontrado"}, status=status.HTTP_404_NOT_FOUND)

            if contrato.cliente != request.user:
                return Response({"erro": "Você não tem permissão para pagar este contrato"}, status=status.HTTP_403_FORBIDDEN)

            pagamento_existente = Pagamento.objects.filter(
                contrato=contrato,
                status__in=['pendente', 'em_processamento']
            ).first()
            if pagamento_existente:
                return Response({"erro": "Já existe um pagamento pendente para este contrato"}, status=status.HTTP_400_BAD_REQUEST)

            mp_service = MercadoPagoService()
            cpf_limpo = request.user.cpf.replace(".", "").replace("-", "") if request.user.cpf else ""

            resultado = mp_service.criar_pagamento_cartao(
                valor=float(contrato.valor),
                descricao=f"Pagamento do contrato #{contrato.id} - {contrato.trabalho.titulo}",
                token_cartao=token_cartao,
                parcelas=int(parcelas),
                email_pagador=request.user.email,
                cpf_pagador=cpf_limpo,
                external_reference=str(contrato.id)
            )

            if not resultado.get("sucesso"):
                return Response({"erro": resultado.get("erro", "Erro ao criar pagamento")}, status=status.HTTP_400_BAD_REQUEST)

            status_local = mp_service.mapear_status_mp_para_local(resultado['status'])

            pagamento = Pagamento.objects.create(
                contrato=contrato,
                cliente=request.user,
                valor=contrato.valor,
                metodo='card',
                status=status_local,
                mercadopago_payment_id=resultado['payment_id']
            )

            if status_local == 'aprovado':
                self._concluir_contrato(contrato)

            enviar_notificacao(
                usuario=request.user,
                mensagem=f"Pagamento com cartão processado para o contrato '{contrato.trabalho.titulo}'.",
                link=f"/contratos/{contrato.id}/pagamento"
            )

            return Response({
                "sucesso": True,
                "pagamento_id": pagamento.id,
                "mercadopago_payment_id": resultado['payment_id'],
                "status": status_local,
                "status_detail": resultado.get('status_detail'),
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"❌ Erro ao criar pagamento Cartão: {str(e)}")
            return Response({"erro": "Erro interno ao processar pagamento"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ================ CONSULTAR STATUS ================
    @action(detail=True, methods=['get'], url_path='status')
    def consultar_status(self, request, pk=None):
        """
        Consulta o status atual de um pagamento
        GET /api/pagamentos/{id}/status/
        """
        try:
            pagamento = self.get_object()

            if pagamento.mercadopago_payment_id:
                mp_service = MercadoPagoService()
                payment_info = mp_service.consultar_pagamento(pagamento.mercadopago_payment_id)

                if payment_info:
                    novo_status = mp_service.mapear_status_mp_para_local(payment_info['status'])
                    if novo_status != pagamento.status:
                        pagamento.status = novo_status
                        pagamento.save()

                        if novo_status == 'aprovado':
                            self._concluir_contrato(pagamento.contrato)

            serializer = self.get_serializer(pagamento)
            return Response(serializer.data)

        except Exception as e:
            logger.error(f"❌ Erro ao consultar status: {str(e)}")
            return Response({"erro": "Erro ao consultar status do pagamento"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ================== HELPER ==================
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
# Webhook Mercado Pago (sem DRF, sem JWT, só Django puro)
# ------------------------
@csrf_exempt
def mercadopago_webhook(request):
    """
    Endpoint público para o Mercado Pago enviar eventos de pagamento.
    ⚠️ Não passa pelo DRF → não exige autenticação JWT.
    """
    if request.method != "POST":
        return HttpResponse(status=405)

    import json
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        logger.error("❌ Webhook MP: JSON inválido")
        return JsonResponse({"error": "JSON inválido"}, status=400)

    logger.info(f"🔔 Webhook recebido do Mercado Pago: {data.get('type')}")

    if data.get("type") == "payment":
        payment_id = data.get("data", {}).get("id")

        if not payment_id:
            logger.warning("⚠️ Webhook MP: payment_id não encontrado")
            return JsonResponse({"status": "ok"}, status=200)

        mp_service = MercadoPagoService()
        payment_info = mp_service.consultar_pagamento(str(payment_id))

        if not payment_info:
            logger.warning(f"⚠️ Pagamento {payment_id} não encontrado no MP")
            return JsonResponse({"status": "ok"}, status=200)

        pagamento = Pagamento.objects.filter(mercadopago_payment_id=str(payment_id)).first()

        if not pagamento:
            logger.warning(f"⚠️ Pagamento {payment_id} não encontrado no banco")
            return JsonResponse({"status": "ok"}, status=200)

        status_antigo = pagamento.status
        pagamento.status = mp_service.mapear_status_mp_para_local(payment_info['status'])
        pagamento.save()

        logger.info(f"✅ Pagamento #{pagamento.id} atualizado: {status_antigo} → {pagamento.status}")

        if pagamento.status == 'aprovado' and status_antigo != 'aprovado':
            contrato = pagamento.contrato
            if contrato.status != "concluido":
                viewset = PagamentoViewSet()
                viewset._concluir_contrato(contrato)
                logger.info(f"✅ Contrato #{contrato.id} concluído automaticamente")

        elif pagamento.status == 'rejeitado' and status_antigo != 'rejeitado':
            enviar_notificacao(
                usuario=pagamento.contrato.cliente,
                mensagem=f"O pagamento do contrato '{pagamento.contrato.trabalho.titulo}' foi rejeitado. Tente novamente.",
                link=f"/contratos/{pagamento.contrato.id}/pagamento"
            )
            logger.info(f"📧 Notificação de rejeição enviada para cliente #{pagamento.contrato.cliente.id}")

    return JsonResponse({"status": "ok"}, status=200)
