// src/Paginas/HistoricoNotificacoes.jsx
import React, { useEffect, useState } from "react";
import api from "../Servicos/Api";
import { useNavigate } from "react-router-dom";
import "../styles/HistoricoNotificacoes.css";

// Ícone baseado na mensagem usando Bootstrap Icons
function getIconeNotificacao(mensagem = "") {
  const msg = mensagem.toLowerCase();
  
  if (msg.includes("avaliação") || msg.includes("avaliacao")) return "bi-star-fill";
  if (msg.includes("denúncia") || msg.includes("denuncia")) return "bi-shield-exclamation";
  if (msg.includes("contrato")) return "bi-file-earmark-check";
  if (msg.includes("pagamento")) return "bi-credit-card";
  if (msg.includes("mensagem")) return "bi-chat-dots";
  if (msg.includes("proposta")) return "bi-file-earmark-text";
  if (msg.includes("trabalho")) return "bi-briefcase";
  if (msg.includes("aprovado") || msg.includes("aceito")) return "bi-check-circle-fill";
  if (msg.includes("rejeitado") || msg.includes("recusado")) return "bi-x-circle-fill";
  if (msg.includes("usuario") || msg.includes("usuário")) return "bi-person-circle";
  
  return "bi-bell";
}

// Cor do ícone baseada no tipo
function getCorIcone(mensagem = "") {
  const msg = mensagem.toLowerCase();
  
  if (msg.includes("avaliação") || msg.includes("avaliacao")) return "#F59E0B";
  if (msg.includes("denúncia") || msg.includes("denuncia")) return "#EF4444";
  if (msg.includes("contrato")) return "#10B981";
  if (msg.includes("pagamento")) return "#10B981";
  if (msg.includes("aprovado") || msg.includes("aceito")) return "#10B981";
  if (msg.includes("rejeitado") || msg.includes("recusado")) return "#EF4444";
  
  return "#3B82F6";
}

// Formatação de data
function formatarData(dataStr) {
  if (!dataStr) return "";
  
  const agora = new Date();
  const data = new Date(dataStr);
  const diffMs = agora - data;
  const diffMinutos = Math.floor(diffMs / 60000);
  const diffHoras = Math.floor(diffMs / 3600000);
  const diffDias = Math.floor(diffMs / 86400000);

  if (diffMinutos < 1) return "Agora";
  if (diffMinutos < 60) return `${diffMinutos}min`;
  if (diffHoras < 24) return `${diffHoras}h`;
  if (diffDias < 7) return `${diffDias}d`;
  
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}`;
}

export default function HistoricoNotificacoes() {
  const [notificacoes, setNotificacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [nextPage, setNextPage] = useState(null);
  const [prevPage, setPrevPage] = useState(null);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [filtro, setFiltro] = useState("todas");

  const navigate = useNavigate();

  // Buscar notificações - MANTENDO A LÓGICA ORIGINAL
  async function fetchNotificacoes(url = "/notificacoes/") {
    setCarregando(true);
    setErro("");
    try {
      const token = localStorage.getItem("token");
      const res = await api.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = res.data;
      if (Array.isArray(data)) {
        setNotificacoes(data);
        setNextPage(null);
        setPrevPage(null);
        setPage(1);
        setNumPages(1);
      } else {
        setNotificacoes(data.results || []);
        setNextPage(data.next);
        setPrevPage(data.previous);
        setPage(data.page || 1);
        setNumPages(data.num_pages || Math.ceil(data.count / 10) || 1);
      }
    } catch (err) {
      console.error("Erro ao buscar notificações:", err);
      setErro("Não foi possível carregar as notificações.");
      setNotificacoes([]);
    }
    setCarregando(false);
  }

  useEffect(() => {
    fetchNotificacoes();
  }, []);

  // Paginação - NOVA LÓGICA IGUAL AOS TRABALHOS
  function anterior() {
    if (prevPage) {
      fetchNotificacoes(prevPage);
    }
  }

  function proxima() {
    if (nextPage) {
      fetchNotificacoes(nextPage);
    }
  }

  // Marcar todas como lidas
  async function marcarTodasComoLidas() {
    try {
      const token = localStorage.getItem("token");
      const naoLidas = notificacoesFiltradas.filter(n => !n.lida);
      
      const promises = naoLidas.map((n) =>
        api.patch(
          `/notificacoes/${n.id}/`,
          { lida: true },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      );
      await Promise.all(promises);
      setNotificacoes(notificacoes.map((n) => ({ ...n, lida: true })));
    } catch (err) {
      console.error("Erro ao marcar todas como lidas:", err);
    }
  }

  // Marcar uma como lida e redirecionar
  async function handleNotificacaoClick(id, link) {
    try {
      const token = localStorage.getItem("token");
      await api.patch(
        `/notificacoes/${id}/`,
        { lida: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotificacoes((notificacoes) =>
        notificacoes.map((n) => (n.id === id ? { ...n, lida: true } : n))
      );
      if (link) navigate(link);
    } catch (err) {
      console.error("Erro ao marcar notificação como lida:", err);
    }
  }

  // Filtrar notificações
  const notificacoesFiltradas = notificacoes.filter(n => {
    if (filtro === "nao-lidas") return !n.lida;
    if (filtro === "lidas") return n.lida;
    return true;
  });

  const naoLidasCount = notificacoes.filter(n => !n.lida).length;
  const lidasCount = notificacoes.filter(n => n.lida).length;

  return (
    <div className="notificacoes-page">
      <div className="page-container">
        
        {/* Header igual aos trabalhos */}
        <div className="notificacoes-header">
          <div className="notificacoes-title">
            <div className="notificacoes-title-icon">
              <i className="bi bi-bell"></i>
            </div>
            Histórico de Notificações
          </div>
          <div className="notificacoes-subtitle">
            Visualize e gerencie todas as suas notificações
          </div>
        </div>

        {/* Filtros e ações */}
        <div className="filtros-container">
          <div className="filtros-grid">
            <div className="filtro-group">
              <label className="filtro-label">Filtrar por:</label>
              <select 
                className="filtro-select"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              >
                <option value="todas">Todas ({notificacoes.length})</option>
                <option value="nao-lidas">Não lidas ({naoLidasCount})</option>
                <option value="lidas">Lidas ({lidasCount})</option>
              </select>
            </div>

            <button 
              className="btn-voltar-header btn-action btn-secondary-action"
              onClick={() => navigate(-1)}
            >
              <i className="bi bi-arrow-left"></i>
              Voltar
            </button>

            <button
              className="btn-action btn-success-action"
              onClick={marcarTodasComoLidas}
              disabled={naoLidasCount === 0}
            >
              <i className="bi bi-check-all"></i>
              Marcar como lidas
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        {carregando && (
          <div className="notificacoes-empty">
            <div className="loading-spinner"></div>
            <div className="empty-title">Carregando notificações...</div>
          </div>
        )}

        {erro && (
          <div className="notificacoes-empty">
            <i className="bi bi-exclamation-triangle empty-icon"></i>
            <div className="empty-title">Erro ao carregar</div>
            <div className="empty-description">{erro}</div>
            <button className="btn-action btn-primary-action" onClick={() => fetchNotificacoes()}>
              <i className="bi bi-arrow-clockwise"></i>
              Tentar novamente
            </button>
          </div>
        )}

        {!carregando && !erro && notificacoesFiltradas.length === 0 && (
          <div className="notificacoes-empty">
            <i className="bi bi-inbox empty-icon"></i>
            <div className="empty-title">
              {filtro === "todas" ? "Nenhuma notificação" :
               filtro === "nao-lidas" ? "Todas lidas!" :
               "Nenhuma notificação lida"}
            </div>
            <div className="empty-description">
              {filtro === "todas" ? "Você ainda não possui notificações." :
               filtro === "nao-lidas" ? "Parabéns! Você está em dia." :
               "As notificações lidas aparecerão aqui."}
            </div>
          </div>
        )}

        {/* Grid de notificações */}
        {!carregando && !erro && notificacoesFiltradas.length > 0 && (
          <div className="notificacoes-grid">
            {notificacoesFiltradas.map((notificacao, index) => (
              <div
                key={notificacao.id}
                className={`notificacao-card ${notificacao.lida ? 'lida' : 'nao-lida'}`}
                onClick={() => handleNotificacaoClick(notificacao.id, notificacao.link)}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {!notificacao.lida && <div className="notificacao-status-indicator"></div>}
                
                <div className="notificacao-header">
                  <div className="notificacao-icon">
                    <i 
                      className={`bi ${getIconeNotificacao(notificacao.mensagem)}`}
                      style={{ color: getCorIcone(notificacao.mensagem) }}
                    />
                  </div>
                  <div className="notificacao-time">
                    {formatarData(notificacao.data_criacao)}
                  </div>
                </div>

                <div className="notificacao-body">
                  <div className="notificacao-message">
                    {notificacao.mensagem}
                  </div>
                </div>

                {notificacao.link && (
                  <div className="notificacao-footer">
                    <div className="notificacao-action">
                      <i className="bi bi-arrow-right"></i>
                      Clique para abrir
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Paginação igual aos trabalhos - APENAS ESTA PARTE MUDOU */}
        {numPages > 1 && (
          <div className="trabalhos-pagination">
            <button 
              className="pagination-btn"
              disabled={!prevPage} 
              onClick={anterior}
            >
              <i className="bi bi-chevron-left"></i>
              Anterior
            </button>
            
            <div className="pagination-info">
              Página <strong>{page}</strong> de <strong>{numPages}</strong>
            </div>
            
            <button 
              className="pagination-btn"
              disabled={!nextPage} 
              onClick={proxima}
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