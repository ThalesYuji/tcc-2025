// src/Paginas/PagamentoContrato.jsx - Integrado com Mercado Pago
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
  
  // Dados específicos do Mercado Pago
  const [qrCode, setQrCode] = useState(null);
  const [qrCodeBase64, setQrCodeBase64] = useState(null);
  const [boletoUrl, setBoletoUrl] = useState(null);
  const [pixCopiado, setPixCopiado] = useState(false);
  
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
        const response = await api.get(`/pagamentos/${pagamentoId}/status/`, {
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

  // Copiar código PIX
  const copiarPixCode = () => {
    if (qrCode) {
      navigator.clipboard.writeText(qrCode);
      setPixCopiado(true);
      setTimeout(() => setPixCopiado(false), 2000);
    }
  };

  // Confirmar pagamento - PIX
  const criarPagamentoPix = async () => {
    setErro("");
    setSucesso("");
    setProcessandoPagamento(true);

    console.log("🔍 DEBUG - Iniciando pagamento PIX");
    console.log("📦 Contrato ID:", contrato?.id);
    console.log("🔑 Token existe:", !!token);
    console.log("🌐 Base URL:", api.defaults.baseURL);

    try {
      console.log("📡 Chamando API:", `${api.defaults.baseURL}/pagamentos/criar-pix/`);
      
      const response = await api.post("/pagamentos/criar-pix/", 
        { contrato_id: contrato?.id }
      );

      console.log("✅ Resposta recebida:", response.data);

      setPagamentoId(response.data.pagamento_id);
      setQrCode(response.data.qr_code);
      setQrCodeBase64(response.data.qr_code_base64);
      
      setSucesso("💳 QR Code PIX gerado! Use o aplicativo do seu banco para pagar.");
    } catch (error) {
      console.error("❌ Erro completo:", error);
      console.error("❌ Response:", error.response);
      console.error("❌ Status:", error.response?.status);
      console.error("❌ Data:", error.response?.data);
      handleErro(error);
      setProcessandoPagamento(false);
    }
  };

  // Confirmar pagamento - Boleto
  const criarPagamentoBoleto = async () => {
    setErro("");
    setSucesso("");
    setProcessandoPagamento(true);

    try {
      const response = await api.post("/pagamentos/criar-boleto/", 
        { contrato_id: contrato?.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPagamentoId(response.data.pagamento_id);
      setBoletoUrl(response.data.boleto_url);
      
      setSucesso("📄 Boleto gerado! Clique no botão abaixo para baixar.");
    } catch (error) {
      handleErro(error);
      setProcessandoPagamento(false);
    }
  };

  // Confirmar pagamento - Cartão
  const criarPagamentoCartao = async () => {
    setErro("");
    setSucesso("");
    
    // TODO: Implementar formulário de cartão com Mercado Pago SDK
    setErro("⚠️ Pagamento com cartão será implementado em breve. Use PIX ou Boleto.");
  };

  // Função principal de pagamento
  const confirmarPagamento = async () => {
    if (!metodo) {
      setErro("Escolha uma forma de pagamento.");
      return;
    }

    switch(metodo) {
      case 'pix':
        await criarPagamentoPix();
        break;
      case 'boleto':
        await criarPagamentoBoleto();
        break;
      case 'card':
        await criarPagamentoCartao();
        break;
      default:
        setErro("Método de pagamento inválido.");
    }
  };

  // Handler de erros
  const handleErro = (error) => {
    let msg = "Erro ao registrar pagamento.";
    if (error.response?.data) {
      if (typeof error.response.data === "string") {
        msg = error.response.data;
      } else if (error.response.data.erro) {
        msg = error.response.data.erro;
      } else if (error.response.data.detail) {
        msg = error.response.data.detail;
      } else {
        const primeiroErro = Object.values(error.response.data)[0];
        msg = Array.isArray(primeiroErro) ? primeiroErro[0] : primeiroErro;
      }
    }
    setErro(msg);
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
      label: "Cartão de Crédito/Débito", 
      descricao: "Em breve",
      icon: "bi bi-credit-card",
      disabled: true
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
          <span>{erro}</span>
        </div>
      )}
      
      {sucesso && (
        <div className="pagamento-msg sucesso">
          <i className="bi bi-check-circle"></i>
          <span>{sucesso}</span>
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
          {!qrCode && !boletoUrl && (
            <div className="pagamento-form">
              <h4>
                <i className="bi bi-wallet2"></i>
                Escolha o método de pagamento
              </h4>
              
              <div className="pagamento-opcoes">
                {metodosDisponiveis.map((opcao, idx) => (
                  <label
                    key={`${opcao.value}-${idx}`}
                    className={`opcao-box ${metodo === opcao.value ? "ativo" : ""} ${opcao.disabled ? "disabled" : ""}`}
                  >
                    <input
                      type="radio"
                      value={opcao.value}
                      checked={metodo === opcao.value}
                      onChange={(e) => setMetodo(e.target.value)}
                      disabled={processandoPagamento || opcao.disabled}
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
          )}

          {/* QR Code PIX */}
          {qrCodeBase64 && (
            <div className="pix-container">
              <h4>
                <i className="bi bi-qr-code"></i>
                QR Code PIX
              </h4>
              <div className="qr-code-display">
                <img src={`data:image/png;base64,${qrCodeBase64}`} alt="QR Code PIX" />
              </div>
              <div className="pix-actions">
                <button 
                  onClick={copiarPixCode}
                  className="btn-copiar-pix"
                >
                  <i className={pixCopiado ? "bi bi-check-lg" : "bi bi-clipboard"}></i>
                  {pixCopiado ? "Código Copiado!" : "Copiar Código PIX"}
                </button>
              </div>
              <p className="pix-instrucoes">
                🔹 Abra o app do seu banco<br/>
                🔹 Escaneie o QR Code ou cole o código<br/>
                🔹 Confirme o pagamento<br/>
                ⏳ Aguarde a confirmação automática
              </p>
            </div>
          )}

          {/* Boleto */}
          {boletoUrl && (
            <div className="boleto-container">
              <h4>
                <i className="bi bi-file-earmark-text"></i>
                Boleto Bancário
              </h4>
              <div className="boleto-actions">
                <a 
                  href={boletoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-baixar-boleto"
                >
                  <i className="bi bi-download"></i>
                  Baixar Boleto
                </a>
              </div>
              <p className="boleto-instrucoes">
                📄 Clique para baixar o boleto<br/>
                🏦 Pague em qualquer banco ou lotérica<br/>
                ⏳ Aguarde até 2 dias úteis para confirmação
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
                {pagamentoId ? "Fechar" : "Cancelar"}
              </button>
              
              {!pagamentoId && (
                <button 
                  onClick={confirmarPagamento} 
                  className="btn-confirmar"
                  disabled={processandoPagamento || !metodo}
                >
                  {processandoPagamento ? (
                    <>
                      <div className="loading-spinner small"></div>
                      Processando...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg"></i>
                      Gerar Pagamento
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}