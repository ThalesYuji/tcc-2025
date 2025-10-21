# services/mercadopago.py
"""
Serviço de integração com Mercado Pago
Escopo atual: Checkout Pro (preference) + consulta de pagamento.
"""
from __future__ import annotations

import logging
from typing import Dict, Optional, Tuple
from urllib.parse import urlparse

import mercadopago
from django.conf import settings

logger = logging.getLogger(__name__)


# ---------------- Utils ----------------
def _split_nome_completo(nome: str) -> Tuple[str, str]:
    nome = (nome or "").strip()
    if not nome:
        return "", ""
    partes = nome.split()
    primeiro = partes[0]
    ultimo = " ".join(partes[1:]) if len(partes) > 1 else partes[0]
    return primeiro, ultimo


def _only_digits(s: Optional[str]) -> str:
    return "".join(c for c in (s or "") if c.isdigit())


def _extrair_msg_erro_mp(resp: object) -> str:
    """
    Extrai mensagem de erro do MP.
    Estruturas comuns:
      {"message": "...", "error": "...", "cause": [{"code": "...", "description": "..."}]}
    """
    if not isinstance(resp, dict):
        return str(resp)
    msg = resp.get("message") or resp.get("error") or resp.get("status_detail") or str(resp)
    cause = resp.get("cause")
    if isinstance(cause, list) and cause:
        msg = cause[0].get("description") or msg
    return msg


def _url_valida(url: Optional[str]) -> bool:
    """Retorna True se for http(s) com host público (não localhost)."""
    if not url:
        return False
    try:
        p = urlparse(url)
        if p.scheme not in ("http", "https"):
            return False
        if not p.netloc:
            return False
        host = (p.hostname or "").lower()
        if host in {"localhost", "127.0.0.1", "0.0.0.0"}:
            return False
        return True
    except Exception:
        return False


def _build_notification_url() -> Optional[str]:
    """
    Tenta montar a notification_url a partir de MP_WEBHOOK_URL ou SITE_URL.
    Só retorna se for uma URL pública válida; caso contrário, None.
    """
    url = getattr(settings, "MP_WEBHOOK_URL", None)
    if _url_valida(url):
        return url.rstrip("/")

    base = getattr(settings, "SITE_URL", "") or ""
    if base:
        candidate = f"{base.rstrip('/')}/mercadopago/webhook/"
        if _url_valida(candidate):
            return candidate.rstrip("/")
    return None


def _back_urls_completas(back_urls: Optional[Dict[str, str]]) -> Dict[str, str]:
    """Garante que success/pending/failure existam, usando FRONT_RETURN_URL como fallback."""
    default_return = (getattr(settings, "FRONT_RETURN_URL", None)
                      or f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/checkout/retorno").rstrip("/")
    b = dict(back_urls or {})
    b.setdefault("success", default_return)
    b.setdefault("pending", default_return)
    b.setdefault("failure", default_return)
    return b


# --------------- Serviço ---------------
class MercadoPagoService:
    """Operações do Mercado Pago via SDK (Checkout Pro + consulta)."""

    def __init__(self):
        access = settings.MERCADOPAGO_ACCESS_TOKEN
        self.sdk = mercadopago.SDK(access)

    # -------------- CHECKOUT PRO (PREFERENCE) --------------
    def criar_preferencia_checkout_pro(
        self,
        titulo: str,
        quantidade: int,
        valor_unitario: float,
        external_reference: Optional[str],
        back_urls: Dict[str, str],
        auto_return: str = "approved",
        payer: Optional[dict] = None,
    ) -> Dict:
        """
        Cria uma 'preference' do Checkout Pro.
        back_urls: {"success": URL, "pending": URL, "failure": URL}
        notification_url só é enviada se pública/valida (construída via _build_notification_url).
        """
        try:
            preference = {
                "items": [
                    {
                        "title": titulo,
                        "quantity": int(quantidade),
                        "unit_price": float(valor_unitario),
                        "currency_id": "BRL",
                    }
                ],
                "back_urls": _back_urls_completas(back_urls),
                "auto_return": auto_return,
            }

            if external_reference:
                preference["external_reference"] = str(external_reference)

            notif = _build_notification_url()
            if notif:
                preference["notification_url"] = notif

            if payer:
                preference["payer"] = payer

            logger.info("MP PREF → payload: %s", preference)
            res = self.sdk.preference().create(preference)
            status = res.get("status")
            body = res.get("response", {}) or {}
            logger.info("MP PREF ← status=%s", status)

            if status not in (200, 201) or "id" not in body:
                logger.error("MP PREF ERRO RAW: %s", res)
                return {"sucesso": False, "erro": _extrair_msg_erro_mp(body)}

            return {
                "sucesso": True,
                "preference_id": body.get("id"),
                "init_point": body.get("init_point"),
                "sandbox_init_point": body.get("sandbox_init_point"),
            }
        except Exception as e:
            logger.exception("❌ Erro ao criar preference")
            return {"sucesso": False, "erro": str(e)}

    # -------------- CONSULTA --------------
    def consultar_pagamento(self, payment_id: str) -> Optional[Dict]:
        """Consulta o status de um pagamento."""
        try:
            logger.info("MP GET pagamento → %s", payment_id)
            result = self.sdk.payment().get(payment_id)
            status = result.get("status")
            payment = result.get("response", {}) or {}
            logger.info("MP GET pagamento ← status=%s", status)

            if status not in (200, 201) or "id" not in payment:
                logger.warning("MP GET pagamento não encontrado/erro: %s", result)
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
            logger.exception("❌ Erro ao consultar pagamento %s", payment_id)
            return None

    # -------------- MAPA STATUS --------------
    def mapear_status_mp_para_local(self, status_mp: str) -> str:
        """Mapeia status do Mercado Pago para os status do model local."""
        mapeamento = {
            "pending": "pendente",
            "in_process": "em_processamento",
            "approved": "aprovado",
            "rejected": "rejeitado",
            "refunded": "reembolsado",
            "cancelled": "rejeitado",
            # 'charged_back' deve ir para 'reembolsado' (o model não tem 'estornado')
            "charged_back": "reembolsado",
        }
        return mapeamento.get(status_mp, "pendente")
