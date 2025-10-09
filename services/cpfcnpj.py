import requests
from django.conf import settings

class CPF_CNPJValidationError(Exception):
    """Erro personalizado para falhas de validação de documentos"""
    pass

def validar_cpf(cpf: str):
    """
    Consulta API CPF e retorna (ok: bool, dados|mensagem: dict|str)
    Pacote C retorna: status (1=válido, 0=inválido), nome, nascimento, mae, genero
    """
    url = f"{settings.CPF_CNPJ_API_BASE}/{settings.CPF_CNPJ_TOKEN}/{settings.CPF_CNPJ_PACOTE_CPF_C}/{cpf}"
    try:
        resp = requests.get(url, timeout=settings.CPF_CNPJ_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        
        # 🔹 Verifica campo "status" (1 = válido, 0 = inválido)
        status = data.get("status")
        if status == 1:
            return True, data
        elif status == 0:
            return False, "CPF inválido ou não encontrado na base da Receita Federal."
        else:
            # Se não tem status mas tem nome, considera válido
            if data.get("nome"):
                return True, data
            return False, "CPF não encontrado na base da Receita Federal."
    
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            return False, "CPF não encontrado na base da Receita Federal."
        return False, f"Erro ao validar CPF: Status {e.response.status_code}"
    except Exception as e:
        return False, f"Erro ao validar CPF: {str(e)}"

def validar_cnpj(cnpj: str):
    """
    Consulta API CNPJ e retorna (ok: bool, dados|mensagem: dict|str)
    Pacote C retorna: razao_social, nome_fantasia, etc.
    """
    url = f"{settings.CPF_CNPJ_API_BASE}/{settings.CPF_CNPJ_TOKEN}/{settings.CPF_CNPJ_PACOTE_CNPJ_C}/{cnpj}"
    try:
        resp = requests.get(url, timeout=settings.CPF_CNPJ_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        
        # 🔹 Verifica campo "status" (1 = válido, 0 = inválido)
        status = data.get("status")
        if status == 1:
            return True, data
        elif status == 0:
            return False, "CNPJ inválido ou não encontrado na base da Receita Federal."
        else:
            # Se não tem status mas tem razão social, considera válido
            if data.get("razao_social") or data.get("nome_fantasia"):
                return True, data
            return False, "CNPJ não encontrado na base da Receita Federal."
    
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            return False, "CNPJ não encontrado na base da Receita Federal."
        return False, f"Erro ao validar CNPJ: Status {e.response.status_code}"
    except Exception as e:
        return False, f"Erro ao validar CNPJ: {str(e)}"

def consultar_documento(numero: str, pacote_id: int):
    """
    Consulta genérica (compatível com serializers.py).
    Decide se vai validar CPF ou CNPJ com base no pacote.
    """
    numero = numero.strip()
    if pacote_id == settings.CPF_CNPJ_PACOTE_CPF_C:
        ok, result = validar_cpf(numero)
    elif pacote_id == settings.CPF_CNPJ_PACOTE_CNPJ_C:
        ok, result = validar_cnpj(numero)
    else:
        raise CPF_CNPJValidationError(f"Pacote {pacote_id} não suportado.")
    
    if not ok:
        raise CPF_CNPJValidationError(result)
    
    return result