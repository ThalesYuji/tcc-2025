// src/Paginas/Propostas.jsx
import React, { useEffect, useState, useContext } from "react";
import api from "../Servicos/Api";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import { useNavigate } from "react-router-dom";
import "../styles/Propostas.css";

export default function Propostas() {
  const { usuarioLogado } = useContext(UsuarioContext);
  const [propostas, setPropostas] = useState([]);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);
  const [sucesso, setSucesso] = useState("");

  // Estados para paginação
  const [page, setPage] = useState(1);
  const [pageSize] = useState(6);
  const [numPages, setNumPages] = useState(1);

  const navigate = useNavigate();

  // Função para buscar propostas
  function buscarPropostas(filtros = {}) {
    if (!usuarioLogado) return;
    
    setLoading(true);
    let url = "/propostas/";
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
          setPropostas(data);
          setPage(1);
          setNumPages(1);
        } else {
          // Se retornar objeto com paginação do DRF
          setPropostas(data.results || []);
          
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
        console.error("Erro ao buscar propostas:", err);
        setErro("Erro ao buscar propostas.");
        setPropostas([]);
        setPage(1);
        setNumPages(1);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  // Carregar propostas inicial
  useEffect(() => {
    buscarPropostas({ page: 1 });
    // eslint-disable-next-line
  }, [usuarioLogado]);

  // Recarregar quando houver sucesso
  useEffect(() => {
    if (sucesso) {
      buscarPropostas({ page });
    }
    // eslint-disable-next-line
  }, [sucesso]);

  function formatarData(dataStr) {
    if (!dataStr) return "";
    const data = new Date(dataStr);
    const agora = new Date();
    const diffMs = agora - data;
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffDias === 0) return "Hoje";
    if (diffDias === 1) return "Ontem";
    if (diffDias < 7) return `${diffDias}d atrás`;
    
    return data.toLocaleDateString("pt-BR");
  }

  function traduzirErroBackend(msg) {
    if (!msg) return "Erro inesperado ao processar a proposta.";
    if (
      typeof msg === "string" &&
      (msg.toLowerCase().includes("permission") ||
        msg.toLowerCase().includes("not allowed") ||
        msg.toLowerCase().includes("unauthorized"))
    ) {
      return "Você não tem permissão para realizar essa ação.";
    }
    if (
      typeof msg === "string" &&
      (msg.toLowerCase().includes("already exists") ||
        msg.toLowerCase().includes("unique"))
    ) {
      return "Já existe uma proposta enviada para esse trabalho.";
    }
    return msg;
  }

  async function aceitarOuRecusar(propostaId, status) {
    setSucesso("");
    setErro("");
    try {
      const resp = await api.patch(`/propostas/${propostaId}/alterar-status/`, { status });
      setSucesso(resp.data.mensagem || "Operação realizada com sucesso!");
    } catch (err) {
      const backendMsg =
        err.response?.data?.erro || err.response?.data?.detail || "Erro ao alterar status.";
      setErro(traduzirErroBackend(backendMsg));
    }
  }

  // Funções de paginação
  function anterior() {
    if (page > 1) {
      const newPage = page - 1;
      setPage(newPage);
      buscarPropostas({ page: newPage });
    }
  }

  function proxima() {
    if (page < numPages) {
      const newPage = page + 1;
      setPage(newPage);
      buscarPropostas({ page: newPage });
    }
  }

  function getStatusIcon(status) {
    switch (status) {
      case "aceita": return "bi-check-circle-fill";
      case "recusada": return "bi-x-circle-fill";
      case "pendente": return "bi-clock";
      default: return "bi-question-circle";
    }
  }

  function getStatusColor(status) {
    switch (status) {
      case "aceita": return "#10B981";
      case "recusada": return "#EF4444";
      case "pendente": return "#F59E0B";
      default: return "#64748B";
    }
  }

  // Estados básicos
  if (loading) {
    return (
      <div className="propostas-page">
        <div className="page-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <h3>Carregando propostas...</h3>
            <p>Buscando suas propostas...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!usuarioLogado) {
    return (
      <div className="propostas-page">
        <div className="page-container">
          <div className="error-state">
            <i className="bi bi-person-x"></i>
            <h3>Usuário não autenticado</h3>
            <p>Você precisa estar logado para ver suas propostas</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="propostas-page">
      <div className="page-container fade-in">
        
        {/* Header */}
        <div className="propostas-header">
          <h1 className="propostas-title">
            <div className="propostas-title-icon">
              <i className="bi bi-file-earmark-text"></i>
            </div>
            {usuarioLogado.tipo === "freelancer" ? "Minhas Propostas" : "Propostas Recebidas"}
          </h1>
          <p className="propostas-subtitle">
            {usuarioLogado.tipo === "freelancer" 
              ? "Acompanhe o status das suas propostas enviadas"
              : "Gerencie as propostas recebidas em seus trabalhos"
            }
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
        {propostas.length === 0 && !erro && (
          <div className="propostas-empty">
            <i className="bi bi-inbox"></i>
            <h3>Nenhuma proposta encontrada</h3>
            <p>
              {usuarioLogado.tipo === "freelancer"
                ? "Você ainda não enviou nenhuma proposta."
                : "Você ainda não recebeu nenhuma proposta."
              }
            </p>
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
              onClick={() => buscarPropostas({ page })}
            >
              <i className="bi bi-arrow-clockwise"></i>
              Tentar Novamente
            </button>
          </div>
        )}

        {/* Grid de propostas */}
        {propostas.length > 0 && (
          <div className="propostas-grid">
            {propostas.map((proposta, index) => (
              <div 
                key={proposta.id} 
                className="proposta-card"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Header do card */}
                <div className="proposta-header">
                  <div className="proposta-trabalho">
                    <button
                      onClick={() => navigate(`/trabalhos/detalhes/${proposta.trabalho}`)}
                      className="trabalho-link"
                    >
                      <i className="bi bi-briefcase"></i>
                      {proposta.trabalho_titulo || `Trabalho #${proposta.trabalho}`}
                    </button>
                  </div>
                  <div className="proposta-status">
                    <i 
                      className={`bi ${getStatusIcon(proposta.status)}`}
                      style={{ color: getStatusColor(proposta.status) }}
                    />
                    <span 
                      className="status-text"
                      style={{ color: getStatusColor(proposta.status) }}
                    >
                      {proposta.status}
                    </span>
                  </div>
                </div>

                {/* Body do card */}
                <div className="proposta-body">
                  {usuarioLogado.tipo === "cliente" && (
                    <div className="proposta-freelancer">
                      <button
                        onClick={() => navigate(`/perfil/${proposta.freelancer}`)}
                        className="freelancer-link"
                      >
                        <i className="bi bi-person-circle"></i>
                        {proposta.freelancer_nome || `Freelancer #${proposta.freelancer}`}
                      </button>
                    </div>
                  )}

                  <div className="proposta-descricao">
                    {proposta.descricao}
                  </div>

                  <div className="proposta-detalhes">
                    <div className="detalhe-item">
                      <i className="bi bi-currency-dollar"></i>
                      <span>R$ {Number(proposta.valor).toFixed(2)}</span>
                    </div>
                    <div className="detalhe-item">
                      <i className="bi bi-calendar-event"></i>
                      <span>{proposta.prazo_estimado}</span>
                    </div>
                  </div>
                </div>

                {/* Footer do card */}
                <div className="proposta-footer">
                  <div className="proposta-data">
                    <i className="bi bi-clock"></i>
                    {formatarData(proposta.data_envio)}
                  </div>

                  {usuarioLogado.tipo === "cliente" && proposta.status === "pendente" && (
                    <div className="proposta-acoes">
                      <button
                        className="btn btn-success"
                        onClick={() => aceitarOuRecusar(proposta.id, "aceita")}
                      >
                        <i className="bi bi-check"></i>
                        Aceitar
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => aceitarOuRecusar(proposta.id, "recusada")}
                      >
                        <i className="bi bi-x"></i>
                        Recusar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginação */}
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