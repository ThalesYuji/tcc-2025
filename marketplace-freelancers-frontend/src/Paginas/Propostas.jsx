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

  // Paginação
  const [page, setPage] = useState(1);
  const [pageSize] = useState(6);
  const [numPages, setNumPages] = useState(1);

  const navigate = useNavigate();

  // Buscar propostas (suporta DRF com paginação ou lista simples)
  function buscarPropostas(filtros = {}) {
    if (!usuarioLogado) return;

    setLoading(true);
    let url = "/propostas/";
    const params = [];
    params.push(`page=${filtros.page || page}`);
    params.push(`page_size=${pageSize}`);
    if (params.length > 0) url += `?${params.join("&")}`;

    api
      .get(url)
      .then((response) => {
        const data = response.data;

        if (Array.isArray(data)) {
          setPropostas(data);
          setPage(1);
          setNumPages(1);
        } else {
          setPropostas(data.results || []);
          const totalItens = data.count || 0;
          const totalPaginas = Math.ceil(totalItens / pageSize);
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
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    buscarPropostas({ page: 1 });
    // eslint-disable-next-line
  }, [usuarioLogado]);

  useEffect(() => {
    if (sucesso) buscarPropostas({ page });
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
    const m = String(msg).toLowerCase();
    if (m.includes("permission") || m.includes("not allowed") || m.includes("unauthorized"))
      return "Você não tem permissão para realizar essa ação.";
    if (m.includes("already exists") || m.includes("unique"))
      return "Já existe uma proposta enviada para esse trabalho.";
    if (m.includes("limite") && m.includes("envios"))
      return msg; // mostra a mensagem amigável do backend (limite de 3 envios)
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

  // Paginação
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

  // UI
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
              : "Gerencie as propostas recebidas em seus trabalhos como contratante"}
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
                : "Você ainda não recebeu nenhuma proposta como contratante."}
            </p>
          </div>
        )}

        {/* Erro */}
        {erro && (
          <div className="error-state">
            <i className="bi bi-exclamation-triangle"></i>
            <h3>Erro ao Carregar</h3>
            <p>{erro}</p>
            <button className="btn gradient-btn" onClick={() => buscarPropostas({ page })}>
              <i className="bi bi-arrow-clockwise"></i>
              Tentar Novamente
            </button>
          </div>
        )}

        {/* Grid */}
        {propostas.length > 0 && (
          <div className="propostas-grid">
            {propostas.map((proposta, index) => {
              const trabalhoId = typeof proposta.trabalho === "object" ? proposta.trabalho.id : proposta.trabalho;
              const trabalhoTitulo =
                proposta.trabalho_titulo ||
                (typeof proposta.trabalho === "object" && proposta.trabalho.titulo) ||
                `Trabalho #${trabalhoId}`;

              const numeroEnvio = proposta.numero_envio || 1;
              const motivo = (proposta.motivo_revisao || "").trim();

              return (
                <div
                  key={proposta.id}
                  className="proposta-card"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Header do card */}
                  <div className="proposta-header">
                    <div className="proposta-trabalho">
                      <button
                        onClick={() => navigate(`/trabalhos/detalhes/${trabalhoId}`)}
                        className="trabalho-link"
                      >
                        <i className="bi bi-briefcase"></i>
                        {trabalhoTitulo}
                      </button>
                    </div>

                    <div className="proposta-status">
                      <span className="envio-badge">Envio #{numeroEnvio}</span>
                      <i
                        className={`bi ${getStatusIcon(proposta.status)}`}
                        style={{ color: getStatusColor(proposta.status), marginLeft: 8 }}
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
                    {usuarioLogado.tipo === "contratante" && (
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

                    <div className="proposta-descricao">{proposta.descricao}</div>

                    {/* Motivo da revisão (apenas quando houver) */}
                    {motivo && (
                      <div className="proposta-revisao">
                        <i className="bi bi-arrow-repeat"></i>
                        <div>
                          <strong>Motivo da revisão:</strong>
                          <div className="motivo-text">{motivo}</div>
                        </div>
                      </div>
                    )}

                    <div className="proposta-detalhes">
                      <div className="detalhe-item">
                        <i className="bi bi-currency-dollar"></i>
                        <span>
                          R$ {Number(proposta.valor).toFixed(2)}
                        </span>
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

                    {usuarioLogado.tipo === "contratante" && proposta.status === "pendente" && (
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
              );
            })}
          </div>
        )}

        {/* Paginação */}
        {numPages > 1 && (
          <div className="trabalhos-pagination">
            <button className="pagination-btn" onClick={anterior} disabled={page <= 1}>
              <i className="bi bi-chevron-left"></i>
              Anterior
            </button>

            <div className="pagination-info">
              Página <strong>{page}</strong> de <strong>{numPages}</strong>
            </div>

            <button className="pagination-btn" onClick={proxima} disabled={page >= numPages}>
              Próxima
              <i className="bi bi-chevron-right"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
