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
        # pega a primeira descrição detalhada, se existir
        desc = cause[0].get("description") or cause[0].get("message")
        if desc:
            msg = desc
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
    default_return = (
        getattr(settings, "FRONT_RETURN_URL", None)
        or f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/checkout/retorno"
    ).rstrip("/")
    b = dict(back_urls or {})
    b.setdefault("success", default_return)
    b.setdefault("pending", default_return)
    b.setdefault("failure", default_return)
    return b


def _normalize_payer(payer: Optional[dict]) -> Optional[dict]:
    """
    Normaliza/valida o objeto payer.
    - Garante first_name/last_name (mesmo que mínimos)
    - Limpa CPF para apenas dígitos
    - Só mantém identification se CPF tiver 11 dígitos
    Retorna um novo dict normalizado, ou None se payer vier vazio.
    """
    if not payer or not isinstance(payer, dict):
        return None

    first = (payer.get("first_name") or "").strip()
    last = (payer.get("last_name") or "").strip()

    # fallback gentis
    if not first and payer.get("name"):
        first = payer["name"].strip()
    if not last and payer.get("surname"):
        last = payer["surname"].strip()

    if not first and not last:
        first = "Cliente"
        last = "."

    email = (payer.get("email") or "").strip()

    # Identification (CPF)
    ident = payer.get("identification") or {}
    id_type = (ident.get("type") or "").upper().strip()
    id_num = _only_digits(ident.get("number"))
    identification = None
    if id_type in {"CPF", "CPF_TAXPAYER"} and len(id_num) == 11:
        identification = {"type": "CPF", "number": id_num}

    normalized = {
        "first_name": first,
        "last_name": last or ".",
    }
    if email:
        normalized["email"] = email
    if identification:
        normalized["identification"] = identification

    return normalized


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
        notification_url só é enviada se pública/válida (construída via _build_notification_url).
        - Se 'payer' vier com CPF válido, apenas priorizamos o boleto como método padrão
          (default_payment_method_id = "bolbradesco"), SEM bloquear os demais.
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

            # —— Normaliza o payer (se fornecido)
            normalized_payer = _normalize_payer(payer)
            if normalized_payer:
                preference["payer"] = normalized_payer

                # Se tiver CPF válido, sugerimos boleto como default (não exclui cartões/PIX)
                ident = normalized_payer.get("identification") or {}
                if ident.get("type") == "CPF" and len(_only_digits(ident.get("number"))) == 11:
                    preference["payment_methods"] = {
                        "default_payment_method_id": "bolbradesco",
                        "installments": 1,  # boleto não parcela; cartões seguem com 1 por padrão
                    }

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
