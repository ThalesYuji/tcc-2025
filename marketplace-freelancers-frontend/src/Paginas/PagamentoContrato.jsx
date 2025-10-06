// src/Paginas/PagamentoContrato.jsx - Layout Expandido
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../Servicos/Api";
import "../styles/PagamentoContrato.css";

export default function PagamentoContrato() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [contrato, setContrato] = useState(null);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [metodo, setMetodo] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [processandoPagamento, setProcessandoPagamento] = useState(false);
  const token = localStorage.getItem("token");

  // Buscar contrato
  useEffect(() => {
    async function fetchContrato() {
      try {
        const response = await api.get(`/contratos/${id}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setContrato(response.data);
      } catch {
        setErro("Erro ao carregar contrato para pagamento.");
      } finally {
        setCarregando(false);
      }
    }
    fetchContrato();
  }, [id, token]);

  // Confirmar pagamento
  const confirmarPagamento = async () => {
    if (!metodo) {
      setErro("Escolha uma forma de pagamento.");
      return;
    }

    setErro("");
    setSucesso("");
    setProcessandoPagamento(true);

    const payload = {
      contrato: contrato?.id,
      cliente: contrato?.cliente?.id,
      valor: contrato?.valor,
      metodo,
    };

    try {
      await api.post("/pagamentos/", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSucesso("Pagamento realizado com sucesso! O contrato foi concluído.");
      setTimeout(() => navigate("/contratos"), 3000);
    } catch (error) {
      let msg = "Erro ao registrar pagamento.";
      if (error.response?.data) {
        if (typeof error.response.data === "string") {
          msg = error.response.data;
        } else if (error.response.data.detail) {
          msg = error.response.data.detail;
        } else {
          const primeiroErro = Object.values(error.response.data)[0];
          msg = Array.isArray(primeiroErro) ? primeiroErro[0] : primeiroErro;
        }
      }
      setErro(msg);
    } finally {
      setProcessandoPagamento(false);
    }
  };

  // Loading state
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

  // Error state
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

  const metodosDisponiveis = [
    { 
      value: "pix", 
      label: "PIX", 
      descricao: "Transferência instantânea e segura",
      icon: "bi bi-lightning-charge" 
    },
    { 
      value: "boleto", 
      label: "Boleto Bancário", 
      descricao: "Vencimento em 3 dias úteis",
      icon: "bi bi-upc-scan" 
    },
    { 
      value: "card", 
      label: "Cartão de Crédito", 
      descricao: "Parcelamento até 12x sem juros",
      icon: "bi bi-credit-card" 
    },
    { 
      value: "card", 
      label: "Cartão de Débito", 
      descricao: "Débito automático à vista",
      icon: "bi bi-credit-card-2-front" 
    },
  ];

  const valorFormatado = parseFloat(contrato.valor).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return (
    <div className="pagamento-container">
      
      {/* Header */}
      <div className="pagamento-header">
        <h1 className="pagamento-title">
          <div className="pagamento-icon">
            <i className="bi bi-credit-card"></i>
          </div>
          Pagamento do Contrato
        </h1>
        <p className="pagamento-subtitle">
          Finalize o pagamento para concluir seu projeto de forma segura
        </p>
      </div>

      {/* Mensagens de status */}
      {erro && (
        <div className="pagamento-msg erro">
          <i className="bi bi-exclamation-circle"></i>
          {erro}
        </div>
      )}
      
      {sucesso && (
        <div className="pagamento-msg sucesso">
          <i className="bi bi-check-circle"></i>
          {sucesso}
        </div>
      )}

      {/* Layout principal */}
      <div className="pagamento-content">
        
        {/* Área principal (esquerda) */}
        <div className="pagamento-main">
          
          {/* Detalhes do Contrato */}
          <div className="contrato-detalhes">
            <h3>
              <i className="bi bi-file-text"></i>
              Detalhes do Contrato
            </h3>
            <div className="detalhes-grid">
              <div className="detalhe-item">
                <span className="detalhe-label">Projeto</span>
                <span className="detalhe-valor">{contrato.trabalho.titulo}</span>
              </div>
              <div className="detalhe-item">
                <span className="detalhe-label">Cliente</span>
                <span className="detalhe-valor">{contrato.cliente.nome}</span>
              </div>
              <div className="detalhe-item">
                <span className="detalhe-label">Freelancer</span>
                <span className="detalhe-valor">{contrato.freelancer?.nome || "N/A"}</span>
              </div>
              <div className="detalhe-item">
                <span className="detalhe-label">Valor Total</span>
                <span className="detalhe-valor preco">R$ {valorFormatado}</span>
              </div>
            </div>
          </div>

          {/* Formulário de Pagamento */}
          <div className="pagamento-form">
            <h4>
              <i className="bi bi-wallet2"></i>
              Escolha o método de pagamento
            </h4>
            
            <div className="pagamento-opcoes">
              {metodosDisponiveis.map((opcao) => (
                <label
                  key={opcao.value}
                  className={`opcao-box ${metodo === opcao.value ? "ativo" : ""}`}
                >
                  <input
                    type="radio"
                    value={opcao.value}
                    checked={metodo === opcao.value}
                    onChange={(e) => setMetodo(e.target.value)}
                    disabled={processandoPagamento || sucesso}
                  />
                  <div className="icone">
                    <i className={opcao.icon}></i>
                  </div>
                  <div className="opcao-info">
                    <div className="opcao-titulo">{opcao.label}</div>
                    <div className="opcao-descricao">{opcao.descricao}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar (direita) */}
        <div className="pagamento-sidebar">
          
          {/* Resumo do Pagamento */}
          <div className="resumo-pagamento">
            <h4>
              <i className="bi bi-receipt"></i>
              Resumo do Pagamento
            </h4>
            
            <div className="resumo-item">
              <span className="resumo-label">Subtotal</span>
              <span className="resumo-valor">R$ {valorFormatado}</span>
            </div>
            
            <div className="resumo-item">
              <span className="resumo-label">Taxa da plataforma</span>
              <span className="resumo-valor">R$ 0,00</span>
            </div>
            
            <div className="resumo-item resumo-total">
              <span className="resumo-label">Total a pagar</span>
              <span className="resumo-valor">R$ {valorFormatado}</span>
            </div>

            {/* Botões de ação */}
            <div className="pagamento-actions">
              <button 
                onClick={() => navigate("/contratos")} 
                className="btn-voltar"
                disabled={processandoPagamento}
              >
                <i className="bi bi-arrow-left"></i>
                Cancelar
              </button>
              
              <button 
                onClick={confirmarPagamento} 
                className="btn-confirmar"
                disabled={processandoPagamento || !metodo || sucesso}
              >
                {processandoPagamento ? (
                  <>
                    <div className="loading-spinner small"></div>
                    Processando...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg"></i>
                    Pagar Agora
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