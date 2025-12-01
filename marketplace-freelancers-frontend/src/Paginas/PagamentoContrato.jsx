import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../Servicos/Api";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import "../styles/PagamentoContrato.css";

export default function PagamentoContrato() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useContext(UsuarioContext);

  const [contrato, setContrato] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [processandoPagamento, setProcessandoPagamento] = useState(false);

  // Dados do formulário de endereço
  const [dadosEndereco, setDadosEndereco] = useState({
    cep: "",
    rua: "",
    numero: "",
    bairro: "",
    cidade: "",
    uf: "",
  });

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

  // Trata erros vindos do backend
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

  // Busca endereço por CEP
  const buscarEnderecoPorCEP = async (cep) => {
    const cepLimpo = cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;

    try {
      const resp = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const dados = await resp.json();
      
      if (!dados.erro) {
        setDadosEndereco(prev => ({
          ...prev,
          rua: dados.logradouro || "",
          bairro: dados.bairro || "",
          cidade: dados.localidade || "",
          uf: dados.uf || "",
        }));
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    }
  };

  // Atualiza campo do endereço
  const handleEnderecoChange = (campo, valor) => {
    setDadosEndereco(prev => ({ ...prev, [campo]: valor }));
    
    // Auto-busca endereço quando CEP tem 8 dígitos
    if (campo === "cep" && valor.replace(/\D/g, "").length === 8) {
      buscarEnderecoPorCEP(valor);
    }
  };

  // Valida se todos os campos obrigatórios estão preenchidos
  const validarDadosEndereco = () => {
    const { cep, rua, numero, bairro, cidade, uf } = dadosEndereco;
    
    if (!cep || cep.replace(/\D/g, "").length !== 8) {
      setErro("CEP inválido. Deve conter 8 dígitos.");
      return false;
    }
    if (!rua || rua.trim().length < 3) {
      setErro("Rua inválida.");
      return false;
    }
    if (!numero || numero.trim().length === 0) {
      setErro("Número do endereço é obrigatório.");
      return false;
    }
    if (!bairro || bairro.trim().length < 2) {
      setErro("Bairro inválido.");
      return false;
    }
    if (!cidade || cidade.trim().length < 2) {
      setErro("Cidade inválida.");
      return false;
    }
    if (!uf || uf.length !== 2) {
      setErro("UF inválida. Deve conter 2 letras.");
      return false;
    }
    
    return true;
  };

  // Cria preferência do Checkout Pro
  const criarPreferenceCheckoutPro = async () => {
    if (!contrato?.id) return;
    
    setErro("");
    
    // Valida dados do endereço
    if (!validarDadosEndereco()) {
      return;
    }

    setProcessandoPagamento(true);

    try {
      // Envia dados do contrato + endereço completo
      const payload = {
        contrato_id: contrato.id,
        // Dados do endereço
        cep: dadosEndereco.cep.replace(/\D/g, ""),
        rua: dadosEndereco.rua,
        numero: dadosEndereco.numero,
        bairro: dadosEndereco.bairro,
        cidade: dadosEndereco.cidade,
        uf: dadosEndereco.uf.toUpperCase(),
      };

      const resp = await api.post("/pagamentos/checkout-pro/criar-preferencia/", payload);

      const initPoint = resp.data?.init_point || resp.data?.sandbox_init_point;
      if (!initPoint) throw new Error("Não foi possível obter o link de pagamento.");

      // Redireciona para o Mercado Pago
      window.location.href = initPoint;
    } catch (e) {
      handleErro(e);
      setProcessandoPagamento(false);
    }
  };

  // Estados de carregamento e erro
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

  // Tela principal
  return (
    <div className="pagamento-container">
      {/* Header */}
      <div className="pagamento-header">
        <h1 className="pagamento-title">
          <div className="pagamento-icon"><i className="bi bi-credit-card"></i></div>
          Pagamento do Contrato
        </h1>
        <p className="pagamento-subtitle">
          Preencha seus dados para prosseguir com o pagamento via Mercado Pago.
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
        {/* Esquerda - Detalhes do Contrato + Formulário */}
        <div className="pagamento-main">
          {/* Detalhes do Contrato */}
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

          {/* Formulário de Endereço (necessário para boleto) */}
          <div className="endereco-form">
            <h3>
              <i className="bi bi-geo-alt"></i> Dados para Pagamento
              <span className="form-badge">Obrigatório para boleto</span>
            </h3>
            <p className="form-description">
              Estes dados são necessários para gerar o boleto bancário.
              Você também poderá pagar com cartão ou PIX no Mercado Pago.
            </p>

            <div className="form-row">
              <div className="form-group">
                <label>CEP *</label>
                <input
                  type="text"
                  placeholder="00000-000"
                  maxLength="9"
                  value={dadosEndereco.cep}
                  onChange={(e) => handleEnderecoChange("cep", e.target.value)}
                  disabled={processandoPagamento}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group flex-3">
                <label>Rua *</label>
                <input
                  type="text"
                  placeholder="Nome da rua"
                  value={dadosEndereco.rua}
                  onChange={(e) => handleEnderecoChange("rua", e.target.value)}
                  disabled={processandoPagamento}
                />
              </div>
              <div className="form-group flex-1">
                <label>Número *</label>
                <input
                  type="text"
                  placeholder="Nº"
                  value={dadosEndereco.numero}
                  onChange={(e) => handleEnderecoChange("numero", e.target.value)}
                  disabled={processandoPagamento}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Bairro *</label>
                <input
                  type="text"
                  placeholder="Bairro"
                  value={dadosEndereco.bairro}
                  onChange={(e) => handleEnderecoChange("bairro", e.target.value)}
                  disabled={processandoPagamento}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group flex-3">
                <label>Cidade *</label>
                <input
                  type="text"
                  placeholder="Cidade"
                  value={dadosEndereco.cidade}
                  onChange={(e) => handleEnderecoChange("cidade", e.target.value)}
                  disabled={processandoPagamento}
                />
              </div>
              <div className="form-group flex-1">
                <label>UF *</label>
                <input
                  type="text"
                  placeholder="SP"
                  maxLength="2"
                  value={dadosEndereco.uf}
                  onChange={(e) => handleEnderecoChange("uf", e.target.value.toUpperCase())}
                  disabled={processandoPagamento}
                />
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

            <div className="metodos-info">
              <p><i className="bi bi-check-circle"></i> Cartão de crédito</p>
              <p><i className="bi bi-check-circle"></i> PIX</p>
              <p><i className="bi bi-check-circle"></i> Boleto bancário</p>
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