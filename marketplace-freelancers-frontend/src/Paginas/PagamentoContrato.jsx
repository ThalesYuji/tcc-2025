// src/Paginas/PagamentoContrato.jsx
// Pagamento de contrato com PIX, Boleto e Checkout Pro (Mercado Pago)
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
  const [metodo, setMetodo] = useState(""); // pix | boleto | checkout_pro
  const [carregando, setCarregando] = useState(true);
  const [processandoPagamento, setProcessandoPagamento] = useState(false);
  const [pagamentoId, setPagamentoId] = useState(null);

  // PIX
  const [qrCode, setQrCode] = useState("");
  const [qrCodeBase64, setQrCodeBase64] = useState("");
  const [pixCopiado, setPixCopiado] = useState(false);

  // BOLETO
  const [boletoUrl, setBoletoUrl] = useState("");

  // Endereço para BOLETO
  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");

  // Carrega o contrato
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

  // Poll do status (PIX/BOLETO). Para Checkout Pro, o status será exibido na rota /checkout/retorno.
  useEffect(() => {
    if (!pagamentoId) return;
    const timer = setInterval(async () => {
      try {
        const resp = await api.get(`/pagamentos/${pagamentoId}/status/`);
        const statusAtual = resp.data.status;
        if (statusAtual === "aprovado") {
          clearInterval(timer);
          setSucesso("✅ Pagamento confirmado! Contrato concluído com sucesso.");
          setProcessandoPagamento(false);
          setTimeout(() => navigate("/contratos"), 2000);
        } else if (statusAtual === "rejeitado") {
          clearInterval(timer);
          setErro("❌ Pagamento rejeitado. Tente novamente.");
          setProcessandoPagamento(false);
        }
      } catch {
        // mantém polling silencioso
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [pagamentoId, navigate]);

  // Utils
  const copiarPixCode = () => {
    if (!qrCode) return;
    navigator.clipboard.writeText(qrCode);
    setPixCopiado(true);
    setTimeout(() => setPixCopiado(false), 2000);
  };

  const handleErro = (error) => {
    let msg = "Erro ao registrar pagamento.";
    const data = error?.response?.data;
    if (data) {
      if (typeof data === "string") msg = data;
      else if (data.erro) msg = data.erro;
      else if (data.detail) msg = data.detail;
      else {
        const primeiro = Object.values(data)[0];
        msg = Array.isArray(primeiro) ? primeiro[0] : primeiro;
      }
    }
    setErro(msg);
  };

  // Ações

  // PIX
  const criarPagamentoPix = async () => {
    setErro(""); setSucesso(""); setProcessandoPagamento(true);
    try {
      const resp = await api.post("/pagamentos/criar-pix/", { contrato_id: contrato?.id });
      setPagamentoId(resp.data.pagamento_id);
      setQrCode(resp.data.qr_code);
      setQrCodeBase64(resp.data.qr_code_base64);
      setSucesso("💳 QR Code PIX gerado! Pague pelo app do seu banco.");
    } catch (e) {
      handleErro(e); setProcessandoPagamento(false);
    }
  };

  // BOLETO
  const criarPagamentoBoleto = async () => {
    setErro(""); setSucesso(""); setProcessandoPagamento(true);
    try {
      const payload = {
        contrato_id: contrato?.id,
        cep: (cep || "").replace(/\D/g, ""),
        rua, numero, bairro, cidade,
        uf: (uf || "").toUpperCase().slice(0, 2),
      };
      const resp = await api.post("/pagamentos/criar-boleto/", payload);
      setPagamentoId(resp.data.pagamento_id);
      setBoletoUrl(resp.data.boleto_url);
      setSucesso("📄 Boleto gerado! Clique para baixar.");
    } catch (e) {
      handleErro(e); setProcessandoPagamento(false);
    }
  };

  // CHECKOUT PRO (redireciona para o Mercado Pago)
  const criarPreferenceCheckoutPro = async () => {
    setErro(""); setSucesso(""); setProcessandoPagamento(true);
    try {
      const resp = await api.post("/pagamentos/checkout-pro/criar-preferencia/", {
        contrato_id: contrato?.id,
      });
      const initPoint = resp.data?.init_point;
      if (!initPoint) throw new Error("Não foi possível obter o link de pagamento.");
      // redireciona o usuário para o fluxo do Mercado Pago
      window.location.href = initPoint;
    } catch (e) {
      handleErro(e);
      setProcessandoPagamento(false);
    }
  };

  const confirmarPagamento = () => {
    if (!metodo) {
      setErro("Escolha um método de pagamento.");
      return;
    }
    if (metodo === "pix") return criarPagamentoPix();
    if (metodo === "boleto") return criarPagamentoBoleto();
    if (metodo === "checkout_pro") return criarPreferenceCheckoutPro();
  };

  // ---- RENDER ----
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

  // opções de pagamento
  const metodosDisponiveis = [
    { value: "checkout_pro", label: "Pagar no Mercado Pago", descricao: "Checkout Pro (redirecionamento)", icon: "bi bi-shop-window" },
    { value: "pix", label: "PIX", descricao: "Transferência instantânea", icon: "bi bi-lightning-charge" },
    { value: "boleto", label: "Boleto Bancário", descricao: "Vencimento em 3 dias úteis", icon: "bi bi-upc-scan" },
  ];

  return (
    <div className="pagamento-container">
      {/* Header */}
      <div className="pagamento-header">
        <h1 className="pagamento-title">
          <div className="pagamento-icon"><i className="bi bi-credit-card"></i></div>
          Pagamento do Contrato
        </h1>
        <p className="pagamento-subtitle">
          Finalize o pagamento para concluir seu projeto com segurança
        </p>
      </div>

      {/* Mensagens */}
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

      {/* Conteúdo */}
      <div className="pagamento-content">
        {/* Esquerda */}
        <div className="pagamento-main">
          {/* Detalhes do contrato */}
          <div className="contrato-detalhes">
            <h3><i className="bi bi-file-text"></i> Detalhes do Contrato</h3>
            <div className="detalhes-grid">
              <div className="detalhe-item">
                <span className="detalhe-label">Projeto</span>
                <span className="detalhe-valor">{contrato.trabalho.titulo}</span>
              </div>
              <div className="detalhe-item">
                <span className="detalhe-label">Cliente</span>
                <span className="detalhe-valor">{contrato.cliente?.nome}</span>
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

          {/* Form de Endereço (somente quando o usuário escolhe boleto e ainda não gerou nada) */}
          {!qrCodeBase64 && !boletoUrl && metodo === "boleto" && (
            <div className="pagamento-form">
              <h4><i className="bi bi-geo-alt"></i> Endereço do Pagador (obrigatório para Boleto)</h4>
              <div className="detalhes-grid">
                <div className="detalhe-item">
                  <span className="detalhe-label">CEP</span>
                  <input className="form-control" value={cep} onChange={(e)=>setCep(e.target.value)} placeholder="12345678"/>
                </div>
                <div className="detalhe-item">
                  <span className="detalhe-label">Rua</span>
                  <input className="form-control" value={rua} onChange={(e)=>setRua(e.target.value)} />
                </div>
                <div className="detalhe-item">
                  <span className="detalhe-label">Número</span>
                  <input className="form-control" value={numero} onChange={(e)=>setNumero(e.target.value)} />
                </div>
                <div className="detalhe-item">
                  <span className="detalhe-label">Bairro</span>
                  <input className="form-control" value={bairro} onChange={(e)=>setBairro(e.target.value)} />
                </div>
                <div className="detalhe-item">
                  <span className="detalhe-label">Cidade</span>
                  <input className="form-control" value={cidade} onChange={(e)=>setCidade(e.target.value)} />
                </div>
                <div className="detalhe-item">
                  <span className="detalhe-label">UF</span>
                  <input className="form-control" value={uf} onChange={(e)=>setUf(e.target.value)} maxLength={2} placeholder="SP" />
                </div>
              </div>
              <small className="text-muted">Preencha para gerar <strong>Boleto</strong>.</small>
            </div>
          )}

          {/* Escolha de método (quando ainda não abriu PIX/BOLETO) */}
          {!qrCodeBase64 && !boletoUrl && (
            <div className="pagamento-form">
              <h4><i className="bi bi-wallet2"></i> Escolha o método de pagamento</h4>
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
                      disabled={processandoPagamento}
                    />
                    <div className="icone"><i className={opcao.icon}></i></div>
                    <div className="opcao-info">
                      <div className="opcao-titulo">{opcao.label}</div>
                      <div className="opcao-descricao">{opcao.descricao}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* PIX */}
          {qrCodeBase64 && (
            <div className="pix-container">
              <h4><i className="bi bi-qr-code"></i> QR Code PIX</h4>
              <div className="qr-code-display">
                <img src={`data:image/png;base64,${qrCodeBase64}`} alt="QR Code PIX" />
              </div>
              <div className="pix-actions">
                <button onClick={copiarPixCode} className="btn-copiar-pix">
                  <i className={pixCopiado ? "bi bi-check-lg" : "bi bi-clipboard"}></i>
                  {pixCopiado ? "Código copiado!" : "Copiar código PIX"}
                </button>
              </div>
              <p className="pix-instrucoes">
                Abra o app do seu banco, escaneie o QR Code ou cole o código e confirme o pagamento.
              </p>
            </div>
          )}

          {/* BOLETO */}
          {boletoUrl && (
            <div className="boleto-container">
              <h4><i className="bi bi-file-earmark-text"></i> Boleto Bancário</h4>
              <div className="boleto-actions">
                <a href={boletoUrl} target="_blank" rel="noopener noreferrer" className="btn-baixar-boleto">
                  <i className="bi bi-download"></i> Baixar Boleto
                </a>
              </div>
              <p className="boleto-instrucoes">
                Pague em qualquer banco ou lotérica. A confirmação pode levar até 2 dias úteis.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="pagamento-sidebar">
          <div className="resumo-pagamento">
            <h4><i className="bi bi-receipt"></i> Resumo do Pagamento</h4>
            <div className="resumo-item">
              <span className="resumo-label">Total</span>
              <span className="resumo-valor">R$ {valorFormatado}</span>
            </div>

            {pagamentoId && (
              <div className="pagamento-status">
                <span className="status-label">Status:</span>
                <span className="status-badge processando">
                  <i className="bi bi-clock-history"></i> Aguardando confirmação
                </span>
              </div>
            )}

            <div className="pagamento-actions">
              <button onClick={() => navigate("/contratos")} className="btn-voltar" disabled={processandoPagamento}>
                <i className="bi bi-arrow-left"></i> {pagamentoId ? "Fechar" : "Cancelar"}
              </button>

              {!pagamentoId && (
                <button
                  onClick={confirmarPagamento}
                  className="btn-confirmar"
                  disabled={processandoPagamento || !metodo || (metodo==="boleto" && (!cep||!rua||!numero||!bairro||!cidade||!uf))}
                >
                  {processandoPagamento ? (
                    <>
                      <div className="loading-spinner small"></div> Processando...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg"></i> {metodo === "checkout_pro" ? "Ir para pagamento" : "Gerar Pagamento"}
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
