import React, { useEffect, useState, useContext } from "react";
import api from "../Servicos/Api";
import { useNavigate, Link } from "react-router-dom";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import "../styles/Contratos.css";

export default function Contratos() {
  const { usuarioLogado } = useContext(UsuarioContext);
  const [contratos, setContratos] = useState([]);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [loading, setLoading] = useState(true);

  // Estados para paginação
  const [page, setPage] = useState(1);
  const [pageSize] = useState(6);
  const [numPages, setNumPages] = useState(1);

  const navigate = useNavigate();

  // Função para buscar contratos
  function buscarContratos(filtros = {}) {
    if (!usuarioLogado) return;
    
    setLoading(true);
    let url = "/contratos/";
    let params = [];
    
    params.push(`page=${filtros.page || page}`);
    params.push(`page_size=${pageSize}`);
    
    if (params.length > 0) url += `?${params.join("&")}`;

    api
      .get(url)
      .then((response) => {
        const data = response.data;
        
        if (Array.isArray(data)) {
          setContratos(data);
          setPage(1);
          setNumPages(1);
        } else {
          setContratos(data.results || []);
          const totalItens = data.count || 0;
          const itensPorPagina = pageSize;
          const totalPaginas = Math.ceil(totalItens / itensPorPagina);
          const paginaAtual = filtros.page || page;
          
          setPage(paginaAtual);
          setNumPages(totalPaginas);
        }
        setErro("");
      })
      .catch((err) => {
        console.error("Erro ao buscar contratos:", err);
        setErro("Erro ao carregar contratos.");
        setContratos([]);
        setPage(1);
        setNumPages(1);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    buscarContratos({ page: 1 });
    // eslint-disable-next-line
  }, [usuarioLogado]);

  useEffect(() => {
    if (sucesso) {
      buscarContratos({ page });
      setTimeout(() => setSucesso(""), 3000);
    }
    // eslint-disable-next-line
  }, [sucesso]);

  function anterior() {
    if (page > 1) {
      const newPage = page - 1;
      setPage(newPage);
      buscarContratos({ page: newPage });
    }
  }

  function proxima() {
    if (page < numPages) {
      const newPage = page + 1;
      setPage(newPage);
      buscarContratos({ page: newPage });
    }
  }

  function formatarData(dataStr) {
    if (!dataStr) return "";
    return new Date(dataStr).toLocaleDateString("pt-BR");
  }

  function getStatusIcon(status) {
    switch (status) {
      case "ativo": return "bi-play-circle-fill";
      case "concluido": return "bi-check-circle-fill";
      case "cancelado": return "bi-x-circle-fill";
      default: return "bi-question-circle";
    }
  }

  function getStatusColor(status) {
    switch (status) {
      case "ativo": return "#3B82F6";
      case "concluido": return "#10B981";
      case "cancelado": return "#EF4444";
      default: return "#64748B";
    }
  }

  function getPagamentoIcon(status) {
    switch (status) {
      case "PAGO":
      case "APROVADO": 
        return "bi-check-circle-fill";
      case "PENDENTE": 
        return "bi-clock-fill";
      case "RECUSADO":
      case "CANCELADO":
        return "bi-x-circle-fill";
      default: 
        return "bi-question-circle";
    }
  }

  function getPagamentoColor(status) {
    switch (status) {
      case "PAGO":
      case "APROVADO": 
        return "#10B981";
      case "PENDENTE": 
        return "#F59E0B";
      case "RECUSADO":
      case "CANCELADO":
        return "#EF4444";
      default: 
        return "#64748B";
    }
  }

  function formatarMetodoPagamento(metodo) {
    const metodos = {
      'CHECKOUT_PRO': 'Mercado Pago',
      'checkout_pro': 'Mercado Pago',
      'CARTAO_CREDITO': 'Cartão de Crédito',
      'PIX': 'PIX',
      'BOLETO': 'Boleto',
      'PAYPAL': 'PayPal'
    };
    return metodos[metodo] || metodo;
  }

  function formatarStatusPagamento(status) {
    const statusMap = {
      'APROVADO': 'Aprovado',
      'PAGO': 'Pago',
      'PENDENTE': 'Pendente',
      'RECUSADO': 'Recusado',
      'CANCELADO': 'Cancelado'
    };
    return statusMap[status] || status;
  }

  if (loading) {
    return (
      <div className="contratos-page">
        <div className="page-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <h3>Carregando contratos...</h3>
            <p>Buscando seus contratos...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!usuarioLogado) {
    return (
      <div className="contratos-page">
        <div className="page-container">
          <div className="error-state">
            <i className="bi bi-person-x"></i>
            <h3>Usuário não autenticado</h3>
            <p>Você precisa estar logado para ver seus contratos</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="contratos-page">
      <div className="page-container fade-in">
        
        <div className="contratos-header">
          <h1 className="contratos-title">
            <div className="contratos-title-icon">
              <i className="bi bi-file-earmark-check"></i>
            </div>
            Meus Contratos
          </h1>
          <p className="contratos-subtitle">
            Gerencie e acompanhe todos os seus contratos de trabalho
          </p>
        </div>

        {sucesso && (
          <div className="alert-success">
            <i className="bi bi-check-circle"></i>
            {sucesso}
          </div>
        )}
        
        {erro && (
          <div className="alert-error">
            <i className="bi bi-exclamation-triangle"></i>
            {erro}
          </div>
        )}

        {contratos.length === 0 && !erro && (
          <div className="contratos-empty">
            <i className="bi bi-inbox"></i>
            <h3>Nenhum contrato encontrado</h3>
            <p>Você ainda não possui contratos registrados no sistema.</p>
          </div>
        )}

        {erro && (
          <div className="error-state">
            <i className="bi bi-exclamation-triangle"></i>
            <h3>Erro ao Carregar</h3>
            <p>{erro}</p>
            <button 
              className="btn gradient-btn"
              onClick={() => buscarContratos({ page })}
            >
              <i className="bi bi-arrow-clockwise"></i>
              Tentar Novamente
            </button>
          </div>
        )}

        {contratos.length > 0 && (
          <div className="contratos-grid">
            {contratos.map((contrato, index) => {
              const userId = parseInt(localStorage.getItem("userId"));
              const souContratante = contrato.contratante.id === userId;
              const souFreelancer = contrato.freelancer.id === userId;
              const jaAvaliei = contrato.avaliacoes?.some((a) => a.avaliador === userId);

              return (
                <div 
                  key={contrato.id} 
                  className="contrato-card"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="contrato-header">
                    <div className="contrato-trabalho">
                      <i className="bi bi-briefcase"></i>
                      <span>{contrato.trabalho?.titulo || "Trabalho"}</span>
                    </div>
                    <div 
                      className="contrato-status"
                      style={{ 
                        background: `${getStatusColor(contrato.status)}20`,
                        border: `1.5px solid ${getStatusColor(contrato.status)}40`
                      }}
                    >
                      <i 
                        className={`bi ${getStatusIcon(contrato.status)}`}
                        style={{ color: getStatusColor(contrato.status) }}
                      />
                      <span 
                        className="status-text"
                        style={{ color: getStatusColor(contrato.status) }}
                      >
                        {contrato.status}
                      </span>
                    </div>
                  </div>

                  <div className="contrato-body">
                    <div className="contrato-participantes">
                      <div className="participante">
                        <i className="bi bi-person-fill"></i>
                        <div className="participante-info">
                          <span className="participante-label">Contratante</span>
                          <span className="participante-nome">{contrato.contratante.nome}</span>
                        </div>
                      </div>
                      <div className="participante">
                        <i className="bi bi-person-gear"></i>
                        <div className="participante-info">
                          <span className="participante-label">Freelancer</span>
                          <span className="participante-nome">{contrato.freelancer.nome}</span>
                        </div>
                      </div>
                    </div>

                    <div className="contrato-datas">
                      <div className="data-item">
                        <i className="bi bi-calendar-check"></i>
                        <div className="data-info">
                          <span className="data-label">Início</span>
                          <span className="data-valor">{formatarData(contrato.data_inicio)}</span>
                        </div>
                      </div>
                      {contrato.data_fim && (
                        <div className="data-item">
                          <i className="bi bi-calendar-x"></i>
                          <div className="data-info">
                            <span className="data-label">Fim</span>
                            <span className="data-valor">{formatarData(contrato.data_fim)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {contrato.pagamento && (
                      <div className="contrato-pagamento-moderna">
                        <div className="pagamento-titulo">
                          <i className="bi bi-credit-card-2-front"></i>
                          <span>Informações de Pagamento</span>
                        </div>
                        <div className="pagamento-conteudo">
                          <div className="pagamento-item">
                            <i className="bi bi-wallet2"></i>
                            <div className="pagamento-dados">
                              <span className="pagamento-rotulo">Método</span>
                              <span className="pagamento-valor">
                                {formatarMetodoPagamento(contrato.pagamento.metodo)}
                              </span>
                            </div>
                          </div>
                          <div className="pagamento-item">
                            <i 
                              className={`bi ${getPagamentoIcon(contrato.pagamento.status)}`}
                              style={{ color: getPagamentoColor(contrato.pagamento.status) }}
                            />
                            <div className="pagamento-dados">
                              <span className="pagamento-rotulo">Status</span>
                              <div 
                                className="pagamento-badge"
                                style={{ 
                                  background: `${getPagamentoColor(contrato.pagamento.status)}20`,
                                  border: `1.5px solid ${getPagamentoColor(contrato.pagamento.status)}40`,
                                  color: getPagamentoColor(contrato.pagamento.status)
                                }}
                              >
                                {formatarStatusPagamento(contrato.pagamento.status)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="contrato-footer">
                    <div className="contrato-acoes">
                      <Link
                        to={`/contratos/${contrato.id}/chat`}
                        className="btn btn-primary"
                        onClick={() => setSucesso("Abrindo chat do contrato...")}
                      >
                        <i className="bi bi-chat-dots"></i>
                        Chat
                      </Link>

                      {contrato.status === "ativo" && souContratante && !contrato.pagamento && (
                        <button
                          onClick={() => {
                            setSucesso("Redirecionando para pagamento...");
                            navigate(`/contratos/${contrato.id}/pagamento`);
                          }}
                          className="btn btn-success"
                        >
                          <i className="bi bi-credit-card"></i>
                          Pagar
                        </button>
                      )}

                      {contrato.status === "concluido" && 
                       (souContratante || souFreelancer) && 
                       !jaAvaliei && (
                        <button
                          onClick={() => {
                            setSucesso("Redirecionando para avaliação...");
                            navigate(`/contratos/${contrato.id}/avaliacao`);
                          }}
                          className="btn btn-warning"
                        >
                          <i className="bi bi-star"></i>
                          Avaliar
                        </button>
                      )}
                    </div>

                    {contrato.status === "ativo" && souFreelancer && !contrato.pagamento && (
                      <div className="contrato-info">
                        <i className="bi bi-info-circle"></i>
                        <span>Aguardando pagamento do contratante</span>
                      </div>
                    )}

                    {contrato.status === "ativo" && !souContratante && !souFreelancer && (
                      <div className="contrato-info">
                        <i className="bi bi-info-circle"></i>
                        <span>Você não é participante deste contrato</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {numPages > 1 && (
          <div className="trabalhos-pagination">
            <button
              className="pagination-btn"
              onClick={anterior}
              disabled={page <= 1}
            >
              <i className="bi bi-chevron-left"></i>
              Anterior
            </button>
            
            <div className="pagination-info">
              Página <strong>{page}</strong> de <strong>{numPages}</strong>
            </div>
            
            <button
              className="pagination-btn"
              onClick={proxima}
              disabled={page >= numPages}
            >
              Próxima
              <i className="bi bi-chevron-right"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}