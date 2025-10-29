// src/Paginas/PagamentoContrato.jsx
// Pagamento de contrato - Checkout Pro (Mercado Pago)
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../Servicos/Api";
import "../styles/PagamentoContrato.css";

export default function PagamentoContrato() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [contrato, setContrato] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [processandoPagamento, setProcessandoPagamento] = useState(false);

  // 🔹 Carrega o contrato
  useEffect(() => {
    (async () => {
      try {
        const resp = await api.get(`/contratos/${id}/`);
        setContrato(resp.data);
      } catch {
        setErro("Erro ao carregar contrato para pagamento.");
      } finally {
        setCarregando(false);
      }
    })();
  }, [id]);

  // 🔹 Trata erros vindos do backend
  const handleErro = (error) => {
    let msg = "Erro ao iniciar o pagamento.";
    const data = error?.response?.data;
    if (data) {
      if (typeof data === "string") msg = data;
      else if (data.erro) msg = data.erro;
      else if (data.detail) msg = data.detail;
      else {
        const primeiro = Object.values(data)[0];
        msg = Array.isArray(primeiro) ? primeiro[0] : primeiro;
      }
    } else if (error?.message) {
      msg = error.message;
    }
    setErro(msg);
  };

  // 🔹 Cria preferência do Checkout Pro
  const criarPreferenceCheckoutPro = async () => {
    if (!contrato?.id) return;
    setErro("");
    setProcessandoPagamento(true);

    try {
      const payload = { contrato_id: contrato.id };
      const resp = await api.post("/pagamentos/checkout-pro/criar-preferencia/", payload);

      const initPoint = resp.data?.init_point || resp.data?.sandbox_init_point;
      if (!initPoint) throw new Error("Não foi possível obter o link de pagamento.");

      window.location.href = initPoint;
    } catch (e) {
      handleErro(e);
      setProcessandoPagamento(false);
    }
  };

  // 🔹 Estados de carregamento e erro
  if (carregando) {
    return (
      <div className="pagamento-container">
        <div className="pagamento-loading">
          <div className="loading-spinner"></div>
          <h3>Carregando contrato</h3>
          <p>Buscando informações para pagamento...</p>
        </div>
      </div>
    );
  }

  if (!contrato) {
    return (
      <div className="main-center">
        <div className="error-msg">
          <i className="bi bi-exclamation-triangle"></i>
          Contrato não encontrado
        </div>
      </div>
    );
  }

  const valorFormatado = Number(contrato.valor).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // 🔹 Tela principal
  return (
    <div className="pagamento-container">
      {/* Header */}
      <div className="pagamento-header">
        <h1 className="pagamento-title">
          <div className="pagamento-icon"><i className="bi bi-credit-card"></i></div>
          Pagamento do Contrato
        </h1>
        <p className="pagamento-subtitle">
          O pagamento é feito externamente via Mercado Pago (Checkout Pro).
        </p>
      </div>

      {/* Mensagem de erro */}
      {erro && (
        <div className="pagamento-msg erro">
          <i className="bi bi-exclamation-circle"></i>
          <span>{erro}</span>
        </div>
      )}

      <div className="pagamento-content">
        {/* Esquerda - Detalhes do Contrato */}
        <div className="pagamento-main">
          <div className="contrato-detalhes">
            <h3><i className="bi bi-file-text"></i> Detalhes do Contrato</h3>
            <div className="detalhes-grid">
              <div className="detalhe-item">
                <span className="detalhe-label">Projeto</span>
                <span className="detalhe-valor">{contrato.trabalho.titulo}</span>
              </div>
              <div className="detalhe-item">
                <span className="detalhe-label">Contratante</span>
                <span className="detalhe-valor">{contrato.contratante?.nome}</span>
              </div>
              <div className="detalhe-item">
                <span className="detalhe-label">Freelancer</span>
                <span className="detalhe-valor">{contrato.freelancer?.nome || "N/A"}</span>
              </div>
              <div className="detalhe-item">
                <span className="detalhe-label">Valor</span>
                <span className="detalhe-valor preco">R$ {valorFormatado}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Direita - Resumo e Ações */}
        <div className="pagamento-sidebar">
          <div className="resumo-pagamento">
            <h4><i className="bi bi-receipt"></i> Resumo do Pagamento</h4>
            <div className="resumo-item">
              <span className="resumo-label">Total</span>
              <span className="resumo-valor">R$ {valorFormatado}</span>
            </div>

            <div className="pagamento-actions">
              <button
                onClick={() => navigate("/contratos")}
                className="btn-voltar"
                disabled={processandoPagamento}
              >
                <i className="bi bi-arrow-left"></i> Cancelar
              </button>

              <button
                onClick={criarPreferenceCheckoutPro}
                className="btn-confirmar"
                disabled={processandoPagamento || !contrato?.id}
              >
                {processandoPagamento ? (
                  <>
                    <div className="loading-spinner small"></div> Processando...
                  </>
                ) : (
                  <>
                    <i className="bi bi-shop-window"></i> Ir para o pagamento
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
