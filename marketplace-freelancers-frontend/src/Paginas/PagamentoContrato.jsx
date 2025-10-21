// src/Paginas/PagamentoContrato.jsx
// Pagamento de contrato - somente Checkout Pro (Mercado Pago)
import React, { useEffect, useMemo, useState } from "react";
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

  // Endereço (opcional – enviado ao Checkout Pro se houver algo)
  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");

  // Estados para busca de CEP
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [cepEncontrado, setCepEncontrado] = useState(false);
  const [erroCep, setErroCep] = useState("");

  // Accordion: aberto/fechado
  const [mostrarEndereco, setMostrarEndereco] = useState(false);

  const enderecoPreenchido = useMemo(
    () => Boolean(cep || rua || numero || bairro || cidade || uf),
    [cep, rua, numero, bairro, cidade, uf]
  );

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

  // Buscar CEP automaticamente quando digitar 8 dígitos
  useEffect(() => {
    const cepLimpo = cep.replace(/\D/g, "");
    
    if (cepLimpo.length === 8) {
      buscarCep(cepLimpo);
    } else {
      setCepEncontrado(false);
      setErroCep("");
    }
  }, [cep]);

  const buscarCep = async (cepNumerico) => {
    setBuscandoCep(true);
    setErroCep("");
    setCepEncontrado(false);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepNumerico}/json/`);
      const dados = await response.json();

      if (dados.erro) {
        setErroCep("CEP não encontrado");
        limparCamposEndereco();
      } else {
        // Preenche os campos automaticamente
        setRua(dados.logradouro || "");
        setBairro(dados.bairro || "");
        setCidade(dados.localidade || "");
        setUf(dados.uf || "");
        setCepEncontrado(true);
        setErroCep("");
      }
    } catch (error) {
      setErroCep("Erro ao buscar CEP");
      limparCamposEndereco();
    } finally {
      setBuscandoCep(false);
    }
  };

  const limparCamposEndereco = () => {
    setRua("");
    setBairro("");
    setCidade("");
    setUf("");
  };

  const formatarCep = (valor) => {
    const numeros = valor.replace(/\D/g, "");
    if (numeros.length <= 5) {
      return numeros;
    }
    return `${numeros.slice(0, 5)}-${numeros.slice(5, 8)}`;
  };

  const handleCepChange = (e) => {
    const valorFormatado = formatarCep(e.target.value);
    setCep(valorFormatado);
  };

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

  const criarPreferenceCheckoutPro = async () => {
    if (!contrato?.id) return;
    setErro("");
    setProcessandoPagamento(true);
    try {
      const payload = { contrato_id: contrato.id };

      // Só inclui endereço se houver algo preenchido
      if (enderecoPreenchido) {
        payload.cep = (cep || "").replace(/\D/g, "");
        payload.rua = rua || "";
        payload.numero = numero || "";
        payload.bairro = bairro || "";
        payload.cidade = cidade || "";
        payload.uf = (uf || "").toUpperCase().slice(0, 2);
      }

      const resp = await api.post("/pagamentos/checkout-pro/criar-preferencia/", payload);
      const initPoint = resp.data?.init_point || resp.data?.sandbox_init_point;
      if (!initPoint) throw new Error("Não foi possível obter o link de pagamento.");
      window.location.href = initPoint;
    } catch (e) {
      handleErro(e);
      setProcessandoPagamento(false);
    }
  };

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

      {/* Mensagens */}
      {erro && (
        <div className="pagamento-msg erro">
          <i className="bi bi-exclamation-circle"></i>
          <span>{erro}</span>
        </div>
      )}

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

          {/* Endereço (opcional) - Accordion */}
          <div className="pagamento-form pagamento-form-accordion">
            <button
              type="button"
              className={`accordion-toggle ${mostrarEndereco ? "aberto" : ""}`}
              onClick={() => setMostrarEndereco((v) => !v)}
              aria-expanded={mostrarEndereco}
              aria-controls="endereco-accordion"
            >
              <span><i className="bi bi-geo-alt"></i> Endereço do Pagador (opcional)</span>
              <i className={`bi ${mostrarEndereco ? "bi-chevron-up" : "bi-chevron-down"}`}></i>
            </button>

            {mostrarEndereco && (
              <div id="endereco-accordion" className="accordion-content">
                <div className="detalhes-grid">
                  <div className="detalhe-item">
                    <span className="detalhe-label">CEP</span>
                    <div className="cep-input-wrapper">
                      <input 
                        className={`form-control ${buscandoCep ? 'loading' : ''}`}
                        value={cep} 
                        onChange={handleCepChange}
                        placeholder="12345-678"
                        maxLength={9}
                      />
                      {buscandoCep && <div className="cep-loading"></div>}
                      {cepEncontrado && !buscandoCep && (
                        <i className="bi bi-check-circle-fill cep-success"></i>
                      )}
                    </div>
                    {erroCep && (
                      <div className="cep-error-msg">
                        <i className="bi bi-exclamation-circle"></i>
                        {erroCep}
                      </div>
                    )}
                  </div>
                  <div className="detalhe-item">
                    <span className="detalhe-label">Rua</span>
                    <input 
                      className="form-control" 
                      value={rua} 
                      onChange={(e)=>setRua(e.target.value)}
                      disabled={buscandoCep}
                    />
                  </div>
                  <div className="detalhe-item">
                    <span className="detalhe-label">Número</span>
                    <input 
                      className="form-control" 
                      value={numero} 
                      onChange={(e)=>setNumero(e.target.value)}
                      disabled={buscandoCep}
                    />
                  </div>
                  <div className="detalhe-item">
                    <span className="detalhe-label">Bairro</span>
                    <input 
                      className="form-control" 
                      value={bairro} 
                      onChange={(e)=>setBairro(e.target.value)}
                      disabled={buscandoCep}
                    />
                  </div>
                  <div className="detalhe-item">
                    <span className="detalhe-label">Cidade</span>
                    <input 
                      className="form-control" 
                      value={cidade} 
                      onChange={(e)=>setCidade(e.target.value)}
                      disabled={buscandoCep}
                    />
                  </div>
                  <div className="detalhe-item">
                    <span className="detalhe-label">UF</span>
                    <input 
                      className="form-control" 
                      value={uf} 
                      onChange={(e)=>setUf(e.target.value)} 
                      maxLength={2} 
                      placeholder="SP"
                      disabled={buscandoCep}
                    />
                  </div>
                </div>
                <small className="text-muted">
                  Digite o CEP e os campos serão preenchidos automaticamente. Esses dados podem ser enviados ao Checkout Pro para agilizar o pagamento.
                </small>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="pagamento-sidebar">
          <div className="resumo-pagamento">
            <h4><i className="bi bi-receipt"></i> Resumo do Pagamento</h4>
            <div className="resumo-item">
              <span className="resumo-label">Total</span>
              <span className="resumo-valor">R$ {valorFormatado}</span>
            </div>

            <div className="pagamento-actions">
              <button onClick={() => navigate("/contratos")} className="btn-voltar" disabled={processandoPagamento}>
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