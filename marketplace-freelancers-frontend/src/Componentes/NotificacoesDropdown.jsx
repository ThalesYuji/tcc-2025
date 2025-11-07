// src/Componentes/NotificacoesDropdown.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../Servicos/Api";
import "../styles/NotificacoesDropdown.css";

/* ========= Ícone por tipo de mensagem ========= */
function getIconeNotificacao(mensagem = "") {
  const msg = (mensagem || "").toLowerCase();

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

/* ========= Data “human friendly” ========= */
function formatarData(dataStr) {
  if (!dataStr) return "";
  const agora = new Date();
  const data = new Date(dataStr);
  const diffMs = agora - data;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min`;
  if (diffH < 24) return `${diffH}h`;
  if (diffD < 7) return `${diffD}d`;

  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}`;
}

export default function NotificacoesDropdown() {
  const [notificacoes, setNotificacoes] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  /* ====== Buscar notificações do backend ====== */
  async function fetchNotificacoes() {
    try {
      setCarregando(true);
      setErro("");
      const token = localStorage.getItem("token");
      const res = await api.get("/notificacoes/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dados = res.data?.results || res.data;
      setNotificacoes(Array.isArray(dados) ? dados : []);
    } catch (err) {
      console.error("Erro ao carregar notificações:", err);
      setErro("Erro ao buscar notificações.");
      setNotificacoes([]);
    } finally {
      setCarregando(false);
    }
  }

  // Busca inicial
  useEffect(() => {
    fetchNotificacoes();
  }, []);

  // Atualiza quando abrir
  useEffect(() => {
    if (aberto) fetchNotificacoes();
  }, [aberto]);

  // Refresh a cada 60s enquanto aberto
  useEffect(() => {
    if (!aberto) return;
    const id = setInterval(fetchNotificacoes, 60000);
    return () => clearInterval(id);
  }, [aberto]);

  // Clique fora + Esc fecha
  useEffect(() => {
    function handleClickFora(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setAberto(false);
      }
    }
    function handleEsc(e) {
      if (e.key === "Escape") setAberto(false);
    }
    if (aberto) {
      document.addEventListener("mousedown", handleClickFora);
      document.addEventListener("keydown", handleEsc);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickFora);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [aberto]);

  // Contadores
  const naoLidas = notificacoes.filter((n) => !n.lida).length;
  const listaNaoLidas = notificacoes.filter((n) => !n.lida);
  const listaLidas = notificacoes.filter((n) => n.lida).slice(0, 5);

  // Marcar uma como lida + navegar
  async function marcarComoLida(id, link) {
    try {
      const token = localStorage.getItem("token");
      await api.patch(
        `/notificacoes/${id}/`,
        { lida: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotificacoes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
      );

      setAberto(false);
      if (link) navigate(link);
    } catch (err) {
      console.error("Erro ao marcar notificação como lida:", err);
    }
  }

  // Marcar todas como lidas
  async function marcarTodasComoLidas() {
    try {
      const token = localStorage.getItem("token");
      const promises = notificacoes
        .filter((n) => !n.lida)
        .map((n) =>
          api.patch(
            `/notificacoes/${n.id}/`,
            { lida: true },
            { headers: { Authorization: `Bearer ${token}` } }
          )
        );

    await Promise.all(promises);
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    } catch (err) {
      console.error("Erro ao marcar todas como lidas:", err);
    }
  }

  return (
    <div className="notificacoes-dropdown" ref={dropdownRef}>
      {/* Botão do sino */}
      <button
        className="notificacoes-icon-btn"
        onClick={() => setAberto((v) => !v)}
        aria-label={`Notificações${naoLidas > 0 ? ` (${naoLidas} não lidas)` : ""}`}
        title="Notificações"
      >
        <i className="bi bi-bell" style={{ fontSize: "1.1rem" }} />
        {naoLidas > 0 && (
          <span className="notificacoes-badge">{naoLidas > 99 ? "99+" : naoLidas}</span>
        )}
      </button>

      {/* Dropdown */}
      {aberto && (
        <div className="notificacoes-dropdown-menu" role="menu" aria-label="Lista de notificações">
          {/* Cabeçalho */}
          <div className="notificacoes-dropdown-header-centralizado">
            <div className="notificacoes-dropdown-titulo">
              <i className="bi bi-bell"></i>
              Notificações
            </div>
            <button
              className="notificacoes-marcar-lido-btn"
              onClick={marcarTodasComoLidas}
              disabled={naoLidas === 0 || carregando}
              title="Marcar todas como lidas"
              style={{ display: naoLidas > 0 ? "flex" : "none" }}
            >
              <i className="bi bi-check-all"></i>
              Marcar como lidas
            </button>
          </div>

          {/* Loading */}
          {carregando && (
            <div className="notificacoes-dropdown-vazio">
              <div className="loading-spinner"></div>
              Carregando...
            </div>
          )}

          {/* Erro */}
          {erro && !carregando && (
            <div className="notificacoes-dropdown-vazio erro">
              <i className="bi bi-exclamation-triangle"></i>
              {erro}
            </div>
          )}

          {/* Lista vazia */}
          {!carregando && !erro && notificacoes.length === 0 && (
            <div className="notificacoes-dropdown-vazio">
              <i className="bi bi-inbox"></i>
              Nenhuma notificação
            </div>
          )}

          {/* Lista */}
          {!carregando && !erro && notificacoes.length > 0 && (
            <ul className="notificacoes-lista">
              {/* Não lidas primeiro */}
              {listaNaoLidas.map((n) => (
                <li
                  key={n.id}
                  onClick={() => marcarComoLida(n.id, n.link)}
                  className="notificacoes-item notificacao-nao-lida"
                  tabIndex={0}
                  title={n.mensagem}
                  role="menuitem"
                >
                  <span className="notificacoes-item-icone">
                    <i className={`bi ${getIconeNotificacao(n.mensagem)}`}></i>
                  </span>
                  <div className="notificacoes-item-conteudo">
                    <div className="notificacoes-item-texto">{n.mensagem}</div>
                    <div className="notificacoes-item-data">{formatarData(n.data_criacao)}</div>
                  </div>
                </li>
              ))}

              {/* Lidas depois (limite 5) */}
              {listaLidas.map((n) => (
                <li
                  key={n.id}
                  onClick={() => marcarComoLida(n.id, n.link)}
                  className="notificacoes-item notificacao-lida"
                  tabIndex={0}
                  title={n.mensagem}
                  role="menuitem"
                >
                  <span className="notificacoes-item-icone">
                    <i className={`bi ${getIconeNotificacao(n.mensagem)}`}></i>
                  </span>
                  <div className="notificacoes-item-conteudo">
                    <div className="notificacoes-item-texto">{n.mensagem}</div>
                    <div className="notificacoes-item-data">{formatarData(n.data_criacao)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Ver todas */}
          {!carregando && !erro && notificacoes.length > 0 && (
            <button
              className="notificacoes-ver-todas-btn"
              onClick={() => { setAberto(false); navigate("/notificacoes"); }}
            >
              <i className="bi bi-arrow-right"></i>
              Ver todas as notificações
            </button>
          )}
        </div>
      )}
    </div>
  );
}
