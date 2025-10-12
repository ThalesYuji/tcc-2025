"""
Serviço para integração com Mercado Pago
Suporta: PIX, Boleto e Cartão de Crédito
"""
import mercadopago
from django.conf import settings
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


class MercadoPagoService:
    """Classe para gerenciar operações do Mercado Pago"""
    
    def __init__(self):
        """Inicializa o SDK do Mercado Pago"""
        self.sdk = mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN)
    
    def criar_pagamento_pix(
        self,
        valor: float,
        descricao: str,
        email_pagador: str,
        cpf_pagador: str,
        nome_pagador: str,
        external_reference: str = None
    ) -> Dict:
        """
        Cria um pagamento via PIX
        
        Args:
            valor: Valor do pagamento
            descricao: Descrição do pagamento
            email_pagador: Email do pagador
            cpf_pagador: CPF do pagador (apenas números)
            nome_pagador: Nome completo do pagador
            external_reference: Referência externa (ID do contrato, por exemplo)
        
        Returns:
            Dict com dados do pagamento incluindo QR Code e chave PIX
        """
        try:
            # Separa primeiro e último nome
            nome_parts = nome_pagador.strip().split()
            primeiro_nome = nome_parts[0]
            ultimo_nome = " ".join(nome_parts[1:]) if len(nome_parts) > 1 else nome_parts[0]
            
            payment_data = {
                "transaction_amount": float(valor),
                "description": descricao,
                "payment_method_id": "pix",
                "payer": {
                    "email": email_pagador,
                    "first_name": primeiro_nome,
                    "last_name": ultimo_nome,
                    "identification": {
                        "type": "CPF",
                        "number": cpf_pagador
                    }
                }
            }
            
            if external_reference:
                payment_data["external_reference"] = str(external_reference)
            
            result = self.sdk.payment().create(payment_data)
            payment = result["response"]
            
            logger.info(f"✅ Pagamento PIX criado: {payment['id']}")
            
            return {
                "sucesso": True,
                "payment_id": payment["id"],
                "status": payment["status"],
                "qr_code": payment["point_of_interaction"]["transaction_data"]["qr_code"],
                "qr_code_base64": payment["point_of_interaction"]["transaction_data"]["qr_code_base64"],
                "ticket_url": payment["point_of_interaction"]["transaction_data"]["ticket_url"],
                "expiration_date": payment.get("date_of_expiration"),
            }
            
        except Exception as e:
            logger.error(f"❌ Erro ao criar pagamento PIX: {str(e)}")
            return {
                "sucesso": False,
                "erro": str(e)
            }
    
    def criar_pagamento_boleto(
        self,
        valor: float,
        descricao: str,
        email_pagador: str,
        cpf_pagador: str,
        nome_pagador: str,
        external_reference: str = None
    ) -> Dict:
        """
        Cria um pagamento via Boleto
        
        Args:
            valor: Valor do pagamento
            descricao: Descrição do pagamento
            email_pagador: Email do pagador
            cpf_pagador: CPF do pagador (apenas números)
            nome_pagador: Nome completo do pagador
            external_reference: Referência externa (ID do contrato, por exemplo)
        
        Returns:
            Dict com dados do pagamento incluindo URL do boleto
        """
        try:
            # Separa primeiro e último nome
            nome_parts = nome_pagador.strip().split()
            primeiro_nome = nome_parts[0]
            ultimo_nome = " ".join(nome_parts[1:]) if len(nome_parts) > 1 else nome_parts[0]
            
            payment_data = {
                "transaction_amount": float(valor),
                "description": descricao,
                "payment_method_id": "bolbradesco",
                "payer": {
                    "email": email_pagador,
                    "first_name": primeiro_nome,
                    "last_name": ultimo_nome,
                    "identification": {
                        "type": "CPF",
                        "number": cpf_pagador
                    }
                }
            }
            
            if external_reference:
                payment_data["external_reference"] = str(external_reference)
            
            result = self.sdk.payment().create(payment_data)
            payment = result["response"]
            
            logger.info(f"✅ Pagamento Boleto criado: {payment['id']}")
            
            return {
                "sucesso": True,
                "payment_id": payment["id"],
                "status": payment["status"],
                "boleto_url": payment["transaction_details"]["external_resource_url"],
                "barcode": payment.get("barcode", {}).get("content"),
                "expiration_date": payment.get("date_of_expiration"),
            }
            
        except Exception as e:
            logger.error(f"❌ Erro ao criar pagamento Boleto: {str(e)}")
            return {
                "sucesso": False,
                "erro": str(e)
            }
    
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
        """
        Cria um pagamento via Cartão de Crédito
        
        Args:
            valor: Valor do pagamento
            descricao: Descrição do pagamento
            token_cartao: Token do cartão gerado no frontend
            parcelas: Número de parcelas
            email_pagador: Email do pagador
            cpf_pagador: CPF do pagador (apenas números)
            external_reference: Referência externa (ID do contrato, por exemplo)
        
        Returns:
            Dict com dados do pagamento
        """
        try:
            payment_data = {
                "transaction_amount": float(valor),
                "token": token_cartao,
                "description": descricao,
                "installments": int(parcelas),
                "payment_method_id": "visa",  # Será detectado pelo token
                "payer": {
                    "email": email_pagador,
                    "identification": {
                        "type": "CPF",
                        "number": cpf_pagador
                    }
                }
            }
            
            if external_reference:
                payment_data["external_reference"] = str(external_reference)
            
            result = self.sdk.payment().create(payment_data)
            payment = result["response"]
            
            logger.info(f"✅ Pagamento Cartão criado: {payment['id']}")
            
            return {
                "sucesso": True,
                "payment_id": payment["id"],
                "status": payment["status"],
                "status_detail": payment["status_detail"],
            }
            
        except Exception as e:
            logger.error(f"❌ Erro ao criar pagamento Cartão: {str(e)}")
            return {
                "sucesso": False,
                "erro": str(e)
            }
    
    def consultar_pagamento(self, payment_id: str) -> Optional[Dict]:
        """
        Consulta o status de um pagamento
        
        Args:
            payment_id: ID do pagamento no Mercado Pago
        
        Returns:
            Dict com informações do pagamento ou None se não encontrado
        """
        try:
            result = self.sdk.payment().get(payment_id)
            payment = result["response"]
            
            return {
                "payment_id": payment["id"],
                "status": payment["status"],
                "status_detail": payment["status_detail"],
                "transaction_amount": payment["transaction_amount"],
                "date_created": payment["date_created"],
                "date_approved": payment.get("date_approved"),
                "external_reference": payment.get("external_reference"),
            }
            
        except Exception as e:
            logger.error(f"❌ Erro ao consultar pagamento {payment_id}: {str(e)}")
            return None
    
    def mapear_status_mp_para_local(self, status_mp: str) -> str:
        """
        Mapeia status do Mercado Pago para os status do model local
        
        Args:
            status_mp: Status retornado pelo Mercado Pago
        
        Returns:
            Status compatível com o model Pagamento
        """
        mapeamento = {
            "pending": "pendente",
            "in_process": "em_processamento",
            "approved": "aprovado",
            "rejected": "rejeitado",
            "refunded": "reembolsado",
            "cancelled": "rejeitado",
        }
        return mapeamento.get(status_mp, "pendente")