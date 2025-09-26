// src/Paginas/Contratos.jsx
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

  // Estados para paginação - PADRONIZADOS
  const [page, setPage] = useState(1);
  const [pageSize] = useState(6);
  const [numPages, setNumPages] = useState(1);

  const navigate = useNavigate();

  // Função para buscar contratos - PADRONIZADA
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
          // Se retornar array diretamente (sem paginação)
          setContratos(data);
          setPage(1);
          setNumPages(1);
        } else {
          // Se retornar objeto com paginação do DRF
          setContratos(data.results || []);
          
          // Calcular página e total de páginas a partir dos dados do DRF
          const totalItens = data.count || 0;
          const itensPorPagina = pageSize;
          const totalPaginas = Math.ceil(totalItens / itensPorPagina);
          
          // Calcular página atual a partir da URL
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

  // Carregar contratos inicial
  useEffect(() => {
    buscarContratos({ page: 1 });
    // eslint-disable-next-line
  }, [usuarioLogado]);

  // Recarregar quando houver sucesso
  useEffect(() => {
    if (sucesso) {
      buscarContratos({ page });
      // Limpar sucesso após 3 segundos
      setTimeout(() => setSucesso(""), 3000);
    }
    // eslint-disable-next-line
  }, [sucesso]);

  // Funções de paginação - PADRONIZADAS
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
      case "PAGO": return "bi-check-circle-fill";
      case "PENDENTE": return "bi-clock-fill";
      default: return "bi-question-circle";
    }
  }

  function getPagamentoColor(status) {
    switch (status) {
      case "PAGO": return "#10B981";
      case "PENDENTE": return "#F59E0B";
      default: return "#64748B";
    }
  }

  // Estados básicos
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
        
        {/* Header */}
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

        {/* Mensagens */}
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

        {/* Lista vazia */}
        {contratos.length === 0 && !erro && (
          <div className="contratos-empty">
            <i className="bi bi-inbox"></i>
            <h3>Nenhum contrato encontrado</h3>
            <p>Você ainda não possui contratos registrados no sistema.</p>
          </div>
        )}

        {/* Mensagem de erro */}
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

        {/* Grid de contratos */}
        {contratos.length > 0 && (
          <div className="contratos-grid">
            {contratos.map((contrato, index) => {
              const userId = parseInt(localStorage.getItem("userId"));
              const souCliente = contrato.cliente.id === userId;
              const souFreelancer = contrato.freelancer.id === userId;
              const jaAvaliei = contrato.avaliacoes?.some((a) => a.avaliador === userId);

              return (
                <div 
                  key={contrato.id} 
                  className="contrato-card"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Header do card */}
                  <div className="contrato-header">
                    <div className="contrato-trabalho">
                      <i className="bi bi-briefcase"></i>
                      <span>{contrato.trabalho?.titulo || "Trabalho"}</span>
                    </div>
                    <div className="contrato-status">
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

                  {/* Body do card */}
                  <div className="contrato-body">
                    <div className="contrato-participantes">
                      <div className="participante">
                        <i className="bi bi-person-fill"></i>
                        <span><strong>Cliente:</strong> {contrato.cliente.nome}</span>
                      </div>
                      <div className="participante">
                        <i className="bi bi-person-gear"></i>
                        <span><strong>Freelancer:</strong> {contrato.freelancer.nome}</span>
                      </div>
                    </div>

                    <div className="contrato-datas">
                      <div className="data-item">
                        <i className="bi bi-calendar-check"></i>
                        <span><strong>Início:</strong> {formatarData(contrato.data_inicio)}</span>
                      </div>
                      {contrato.data_fim && (
                        <div className="data-item">
                          <i className="bi bi-calendar-x"></i>
                          <span><strong>Fim:</strong> {formatarData(contrato.data_fim)}</span>
                        </div>
                      )}
                    </div>

                    {/* Pagamento */}
                    {contrato.pagamento && (
                      <div className="contrato-pagamento">
                        <i 
                          className={`bi ${getPagamentoIcon(contrato.pagamento.status)}`}
                          style={{ color: getPagamentoColor(contrato.pagamento.status) }}
                        />
                        <span>
                          <strong>Pagamento:</strong> {contrato.pagamento.metodo.toUpperCase()} - 
                          <span style={{ color: getPagamentoColor(contrato.pagamento.status) }}>
                            {contrato.pagamento.status.toUpperCase()}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Footer do card */}
                  <div className="contrato-footer">
                    <div className="contrato-acoes">
                      {/* Chat */}
                      <Link
                        to={`/contratos/${contrato.id}/chat`}
                        className="btn btn-primary"
                        onClick={() => setSucesso("Abrindo chat do contrato...")}
                      >
                        <i className="bi bi-chat-dots"></i>
                        Chat
                      </Link>

                      {/* Pagamento */}
                      {contrato.status === "ativo" && souCliente && !contrato.pagamento && (
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

                      {/* Avaliação */}
                      {contrato.status === "concluido" && 
                       (souCliente || souFreelancer) && 
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

                    {/* Informações extras */}
                    {contrato.status === "ativo" && souFreelancer && !contrato.pagamento && (
                      <div className="contrato-info">
                        <i className="bi bi-info-circle"></i>
                        <span>Aguardando pagamento do cliente</span>
                      </div>
                    )}

                    {contrato.status === "ativo" && !souCliente && !souFreelancer && (
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

        {/* Paginação - PADRONIZADA */}
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