"""
Serviço para integração com Mercado Pago
Suporta: PIX, Boleto e Cartão de Crédito
"""
import logging
from typing import Dict, Optional, Tuple

import mercadopago
from django.conf import settings

logger = logging.getLogger(__name__)


def _split_nome_completo(nome: str) -> Tuple[str, str]:
    nome = (nome or "").strip()
    if not nome:
        return "", ""
    partes = nome.split()
    primeiro = partes[0]
    ultimo = " ".join(partes[1:]) if len(partes) > 1 else partes[0]
    return primeiro, ultimo


def _extrair_msg_erro_mp(resp: dict) -> str:
    """
    Tenta extrair a melhor mensagem de erro do Mercado Pago.
    Estruturas comuns:
      {"message": "...", "error": "...", "cause": [{"code": "...", "description": "..."}]}
    """
    if not isinstance(resp, dict):
        return str(resp)
    msg = resp.get("message") or resp.get("error") or str(resp)
    cause = resp.get("cause")
    if isinstance(cause, list) and cause:
        msg = cause[0].get("description") or msg
    return msg


class MercadoPagoService:
    """Classe para gerenciar operações do Mercado Pago"""

    def __init__(self):
        """Inicializa o SDK do Mercado Pago"""
        self.sdk = mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN)

    # ------------------------------
    # PIX
    # ------------------------------
    def criar_pagamento_pix(
        self,
        valor: float,
        descricao: str,
        email_pagador: str,
        cpf_pagador: str,
        nome_pagador: str,
        external_reference: str = None
    ) -> Dict:
        """Cria um pagamento via PIX"""
        try:
            primeiro, ultimo = _split_nome_completo(nome_pagador)

            payment_data = {
                "transaction_amount": float(valor),
                "description": descricao,
                "payment_method_id": "pix",
                "payer": {
                    "email": email_pagador,
                    "first_name": primeiro,
                    "last_name": ultimo,
                    "identification": {"type": "CPF", "number": cpf_pagador},
                },
            }
            if external_reference:
                payment_data["external_reference"] = str(external_reference)

            logger.info(f"MP PIX → payload: {payment_data}")
            result = self.sdk.payment().create(payment_data)
            status = result.get("status")
            payment = result.get("response", {})
            logger.info(f"MP PIX ← status={status} body={payment}")

            if status not in (200, 201) or "id" not in payment:
                return {"sucesso": False, "erro": _extrair_msg_erro_mp(payment)}

            poi = (payment.get("point_of_interaction") or {}).get("transaction_data") or {}

            return {
                "sucesso": True,
                "payment_id": payment.get("id"),
                "status": payment.get("status"),
                "qr_code": poi.get("qr_code"),
                "qr_code_base64": poi.get("qr_code_base64"),
                "ticket_url": poi.get("ticket_url"),
                "expiration_date": payment.get("date_of_expiration"),
            }

        except Exception as e:
            logger.exception(f"❌ Erro ao criar pagamento PIX: {e}")
            return {"sucesso": False, "erro": str(e)}

    # ------------------------------
    # BOLETO (REGISTRADO)
    # ------------------------------
def criar_pagamento_boleto(
    self,
    valor: float,
    descricao: str,
    email_pagador: str,
    cpf_pagador: str,
    nome_pagador: str,
    external_reference: str = None,
    endereco: dict | None = None,
) -> Dict:
    """
    Cria um pagamento via Boleto Registrado.
    'endereco' deve conter: zip_code, street_name, street_number, neighborhood, city, federal_unit (UF).
    """
    try:
        primeiro, ultimo = _split_nome_completo(nome_pagador)

        # saneia CEP e UF
        cep = (endereco or {}).get("zip_code")
        if cep:
            cep = "".join(c for c in str(cep) if c.isdigit())
        uf = (endereco or {}).get("federal_unit")
        if uf:
            uf = str(uf).upper()[:2]

        payer = {
            "email": email_pagador,
            "first_name": primeiro,
            "last_name": ultimo,
            "identification": {"type": "CPF", "number": cpf_pagador},
        }
        if endereco:
            payer["address"] = {
                "zip_code": cep,
                "street_name": (endereco or {}).get("street_name"),
                "street_number": (endereco or {}).get("street_number"),
                "neighborhood": (endereco or {}).get("neighborhood"),
                "city": (endereco or {}).get("city"),
                "federal_unit": uf,
            }

        # notification_url (webhook público)
        try:
            notification_url = getattr(settings, "MP_WEBHOOK_URL", None) \
                or (getattr(settings, "SITE_URL", "").rstrip("/") + "/mercadopago/webhook/")
        except Exception:
            notification_url = None

        payment_data = {
            "transaction_amount": float(valor),
            "description": descricao,
            "payment_method_id": "bolbradesco",
            "payer": payer,
        }
        if external_reference:
            payment_data["external_reference"] = str(external_reference)
        if notification_url:
            payment_data["notification_url"] = notification_url

        # Alguns adquirentes exigem também em additional_info.payer
        if endereco:
            payment_data["additional_info"] = {
                "payer": {
                    "first_name": primeiro,
                    "last_name": ultimo,
                    "registration_type": "CPF",
                    "registration_number": cpf_pagador,
                    "address": {
                        "zip_code": cep,
                        "street_name": (endereco or {}).get("street_name"),
                        "street_number": (endereco or {}).get("street_number"),
                        "neighborhood": (endereco or {}).get("neighborhood"),
                        "city": (endereco or {}).get("city"),
                        "federal_unit": uf,
                    },
                }
            }

        logger.info(f"MP BOLETO → payload: {payment_data}")
        result = self.sdk.payment().create(payment_data)
        status = result.get("status")
        payment = result.get("response", {})
        logger.info(f"MP BOLETO ← status={status}")

        # Se falhou, loga a resposta completa para debug
        if status not in (200, 201) or "id" not in payment:
            logger.error(f"MP BOLETO ERRO RAW: {result}")
            return {"sucesso": False, "erro": _extrair_msg_erro_mp(payment)}

        poi_tx = (payment.get("point_of_interaction") or {}).get("transaction_data") or {}
        boleto_url = poi_tx.get("ticket_url") or (payment.get("transaction_details") or {}).get("external_resource_url")

        barcode = None
        if isinstance(poi_tx.get("barcode"), str):
            barcode = poi_tx.get("barcode")
        elif isinstance(payment.get("barcode"), dict):
            barcode = payment.get("barcode", {}).get("content")

        expiration_date = poi_tx.get("expiration_date") or payment.get("date_of_expiration")

        if not boleto_url:
            return {"sucesso": False, "erro": "Resposta do MP sem URL do boleto."}

        return {
            "sucesso": True,
            "payment_id": payment.get("id"),
            "status": payment.get("status"),
            "boleto_url": boleto_url,
            "barcode": barcode,
            "expiration_date": expiration_date,
        }

    except Exception as e:
        logger.exception(f"❌ Erro ao criar pagamento Boleto: {e}")
        return {"sucesso": False, "erro": str(e)}

    # ------------------------------
    # CARTÃO
    # ------------------------------
    def criar_pagamento_cartao(
        self,
        valor: float,
        descricao: str,
        token_cartao: str,
        parcelas: int,
        email_pagador: str,
        cpf_pagador: str,
        external_reference: str = None
    ) -> Dict:
        """Cria um pagamento via Cartão de Crédito"""
        try:
            # não fixe payment_method_id; o token já carrega a bandeira
            payment_data = {
                "transaction_amount": float(valor),
                "token": token_cartao,
                "description": descricao,
                "installments": int(parcelas),
                "payer": {
                    "email": email_pagador,
                    "identification": {"type": "CPF", "number": cpf_pagador},
                },
            }
            if external_reference:
                payment_data["external_reference"] = str(external_reference)

            logger.info(f"MP CARTAO → payload: {payment_data}")
            result = self.sdk.payment().create(payment_data)
            status = result.get("status")
            payment = result.get("response", {})
            logger.info(f"MP CARTAO ← status={status} body={payment}")

            if status not in (200, 201) or "id" not in payment:
                return {"sucesso": False, "erro": _extrair_msg_erro_mp(payment)}

            return {
                "sucesso": True,
                "payment_id": payment.get("id"),
                "status": payment.get("status"),
                "status_detail": payment.get("status_detail"),
            }

        except Exception as e:
            logger.exception(f"❌ Erro ao criar pagamento Cartão: {e}")
            return {"sucesso": False, "erro": str(e)}

    # ------------------------------
    # CONSULTA
    # ------------------------------
    def consultar_pagamento(self, payment_id: str) -> Optional[Dict]:
        """Consulta o status de um pagamento"""
        try:
            logger.info(f"MP GET pagamento → {payment_id}")
            result = self.sdk.payment().get(payment_id)
            status = result.get("status")
            payment = result.get("response", {})
            logger.info(f"MP GET pagamento ← status={status} body={payment}")

            if status not in (200, 201) or "id" not in payment:
                logger.warning(f"MP GET pagamento não encontrado/erro: {payment}")
                return None

            return {
                "payment_id": payment.get("id"),
                "status": payment.get("status"),
                "status_detail": payment.get("status_detail"),
                "transaction_amount": payment.get("transaction_amount"),
                "date_created": payment.get("date_created"),
                "date_approved": payment.get("date_approved"),
                "external_reference": payment.get("external_reference"),
            }

        except Exception as e:
            logger.exception(f"❌ Erro ao consultar pagamento {payment_id}: {e}")
            return None

    # ------------------------------
    # MAPA DE STATUS
    # ------------------------------
    def mapear_status_mp_para_local(self, status_mp: str) -> str:
        """Mapeia status do Mercado Pago para os status do model local"""
        mapeamento = {
            "pending": "pendente",
            "in_process": "em_processamento",
            "approved": "aprovado",
            "rejected": "rejeitado",
            "refunded": "reembolsado",
            "cancelled": "rejeitado",
        }
        return mapeamento.get(status_mp, "pendente")
