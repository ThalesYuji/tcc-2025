import requests
from django.conf import settings


class CPF_CNPJValidationError(Exception):
    """Erro personalizado para falhas de validação de documentos"""
    pass


def validar_cpf(cpf: str):
    """
    Consulta API CPF e retorna (ok: bool, dados|mensagem: dict|str)
    """
    url = f"{settings.CPF_CNPJ_API_BASE}/{settings.CPF_CNPJ_TOKEN}/{settings.CPF_CNPJ_PACOTE_CPF_D}/{cpf}"
    try:
        resp = requests.get(url, timeout=settings.CPF_CNPJ_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()

        # 🔹 Garantir que situacao sempre seja string
        situacao = (
            str(data.get("situacao_cadastral"))
            or str(data.get("descricao_situacao_cadastral"))
            or str(data.get("status"))
        )

        if situacao and any(x in situacao.upper() for x in ["ATIV", "REGULAR"]):
            return True, data
        else:
            return False, f"CPF inválido. Situação cadastral: {situacao or 'Desconhecida'}"

    except Exception as e:
        return False, f"Erro ao validar CPF: {str(e)}"


def validar_cnpj(cnpj: str):
    """
    Consulta API CNPJ e retorna (ok: bool, dados|mensagem: dict|str)
    """
    url = f"{settings.CPF_CNPJ_API_BASE}/{settings.CPF_CNPJ_TOKEN}/{settings.CPF_CNPJ_PACOTE_CNPJ_C}/{cnpj}"
    try:
        resp = requests.get(url, timeout=settings.CPF_CNPJ_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()

        # 🔹 Garantir que situacao sempre seja string
        situacao = (
            str(data.get("situacao_cadastral"))
            or str(data.get("descricao_situacao_cadastral"))
            or str(data.get("status"))
        )

        if situacao and any(x in situacao.upper() for x in ["ATIV", "REGULAR"]):
            return True, data
        else:
            return False, f"CNPJ inválido. Situação cadastral: {situacao or 'Desconhecida'}"

    except Exception as e:
        return False, f"Erro ao validar CNPJ: {str(e)}"


def consultar_documento(numero: str, pacote_id: int):
    """
    Consulta genérica (compatível com serializers.py).
    Decide se vai validar CPF ou CNPJ com base no pacote.
    """
    numero = numero.strip()

    if pacote_id == settings.CPF_CNPJ_PACOTE_CPF_D:
        ok, result = validar_cpf(numero)
    elif pacote_id == settings.CPF_CNPJ_PACOTE_CNPJ_C:
        ok, result = validar_cnpj(numero)
    else:
        raise CPF_CNPJValidationError(f"Pacote {pacote_id} não suportado.")

    if not ok:
        raise CPF_CNPJValidationError(result)

    return result
