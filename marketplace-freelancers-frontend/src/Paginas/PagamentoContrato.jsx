// src/Paginas/PagamentoContrato.jsx - Integrado com Stripe
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
  const [pagamentoId, setPagamentoId] = useState(null);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
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

  // Polling: verificar status do pagamento a cada 3 segundos
  useEffect(() => {
    if (!pagamentoId) return;

    console.log("🔄 Polling iniciado para pagamento ID:", pagamentoId);

    const intervalo = setInterval(async () => {
      try {
        console.log("🔍 Verificando status do pagamento...");
        const response = await api.get(`/pagamentos/${pagamentoId}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const statusAtual = response.data.status;
        console.log("📊 Status atual:", statusAtual);
        
        if (statusAtual === "aprovado") {
          console.log("✅ Pagamento APROVADO detectado!");
          clearInterval(intervalo);
          setSucesso("✅ Pagamento confirmado! Contrato concluído com sucesso.");
          setProcessandoPagamento(false);
          setTimeout(() => navigate("/contratos"), 3000);
        } else if (statusAtual === "rejeitado") {
          console.log("❌ Pagamento REJEITADO detectado!");
          clearInterval(intervalo);
          setErro("❌ Pagamento rejeitado. Tente novamente com outro método.");
          setProcessandoPagamento(false);
        }
      } catch (error) {
        console.error("❌ Erro ao verificar status:", error);
      }
    }, 3000); // Verifica a cada 3 segundos

    return () => {
      console.log("🛑 Polling encerrado");
      clearInterval(intervalo);
    };
  }, [pagamentoId, token, navigate]);

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
      const response = await api.post("/pagamentos/", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Salvar IDs para monitoramento
      setPagamentoId(response.data.id);
      setPaymentIntentId(response.data.payment_intent_id);

      // Mostrar instruções para teste
      setSucesso(
        `💳 Pagamento criado! Payment Intent ID: ${response.data.payment_intent_id}\n\n` +
        `🧪 PARA TESTAR: Execute no terminal:\n` +
        `stripe trigger payment_intent.succeeded\n\n` +
        `⏳ Aguardando confirmação do Stripe...`
      );

      // Continua em "processandoPagamento" até o polling detectar mudança
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
          <pre style={{whiteSpace: 'pre-wrap', fontFamily: 'inherit'}}>{erro}</pre>
        </div>
      )}
      
      {sucesso && (
        <div className="pagamento-msg sucesso">
          <i className="bi bi-check-circle"></i>
          <pre style={{whiteSpace: 'pre-wrap', fontFamily: 'inherit'}}>{sucesso}</pre>
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
              {metodosDisponiveis.map((opcao, idx) => (
                <label
                  key={`${opcao.value}-${idx}`}
                  className={`opcao-box ${metodo === opcao.value ? "ativo" : ""}`}
                >
                  <input
                    type="radio"
                    value={opcao.value}
                    checked={metodo === opcao.value}
                    onChange={(e) => setMetodo(e.target.value)}
                    disabled={processandoPagamento}
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

          {/* Instruções de teste */}
          {paymentIntentId && processandoPagamento && (
            <div className="pagamento-instrucoes">
              <h4>
                <i className="bi bi-terminal"></i>
                Instruções para Teste
              </h4>
              <p>Execute no terminal para simular aprovação:</p>
              <code>stripe trigger payment_intent.succeeded</code>
              <p style={{marginTop: '10px', fontSize: '0.9em', color: '#666'}}>
                O sistema está monitorando automaticamente e atualizará quando o webhook receber o evento.
              </p>
            </div>
          )}
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

            {/* Status do pagamento */}
            {pagamentoId && (
              <div className="pagamento-status">
                <span className="status-label">Status:</span>
                <span className="status-badge processando">
                  <i className="bi bi-clock-history"></i>
                  Aguardando confirmação
                </span>
              </div>
            )}

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
                disabled={processandoPagamento || !metodo}
              >
                {processandoPagamento ? (
                  <>
                    <div className="loading-spinner small"></div>
                    Aguardando...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg"></i>
                    Criar Pagamento
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