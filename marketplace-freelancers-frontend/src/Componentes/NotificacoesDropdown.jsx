// src/Componentes/NotificacoesDropdown.jsx
import React, { useEffect, useState, useRef } from "react";
import { FiBell, FiCheckCircle } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import api from "../Servicos/Api";
import "../App.css";

// Função para retornar ícone de acordo com o tipo de notificação
function getIconeNotificacao(mensagem = "") {
  mensagem = mensagem.toLowerCase();

  if (mensagem.includes("avaliação") || mensagem.includes("avaliacao")) return "⭐";
  if (mensagem.includes("denúncia") || mensagem.includes("denuncia")) return "🚨";
  if (mensagem.includes("contrato")) return "📄";
  if (mensagem.includes("pagamento")) return "💰";
  if (mensagem.includes("mensagem")) return "✉️";

  return "🔔";
}

// Função para formatar data no padrão brasileiro
function formatarData(dataStr) {
  if (!dataStr) return "";
  const d = new Date(dataStr);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${dia}/${mes} ${hora}`;
}

export default function NotificacoesDropdown() {
  const [notificacoes, setNotificacoes] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState("");
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Busca notificações do backend
  async function fetchNotificacoes() {
    try {
      setErro("");
      const token = localStorage.getItem("token");
      const res = await api.get("/notificacoes/", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotificacoes(res.data || []);
    } catch (err) {
      console.error("Erro ao carregar notificações:", err);
      setErro("Erro ao buscar notificações.");
      setNotificacoes([]);
    }
  }

  // Busca inicial
  useEffect(() => {
    fetchNotificacoes();
  }, []);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickFora(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setAberto(false);
      }
    }
    if (aberto) {
      document.addEventListener("mousedown", handleClickFora);
    }
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, [aberto]);

  // Sempre que abrir o dropdown, atualiza as notificações
  useEffect(() => {
    if (aberto) {
      fetchNotificacoes();
    }
  }, [aberto]);

  const naoLidas = notificacoes.filter(n => !n.lida).length;
  const listaNaoLidas = notificacoes.filter(n => !n.lida);
  const listaLidas = notificacoes.filter(n => n.lida);

  // Marca notificação como lida e redireciona se tiver link
  async function marcarComoLida(id, link) {
    try {
      const token = localStorage.getItem("token");
      await api.patch(`/notificacoes/${id}/`, { lida: true }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotificacoes(notificacoes =>
        notificacoes.map(n => n.id === id ? { ...n, lida: true } : n)
      );
      setAberto(false);
      if (link) navigate(link);
    } catch (err) {
      console.error("Erro ao marcar notificação como lida:", err);
    }
  }

  // Marca todas como lidas
  async function marcarTodasComoLidas() {
    try {
      const token = localStorage.getItem("token");
      const promises = notificacoes
        .filter(n => !n.lida)
        .map(n =>
          api.patch(`/notificacoes/${n.id}/`, { lida: true }, {
            headers: { Authorization: `Bearer ${token}` }
          })
        );
      await Promise.all(promises);
      setNotificacoes(notificacoes => notificacoes.map(n => ({ ...n, lida: true })));
    } catch (err) {
      console.error("Erro ao marcar todas como lidas:", err);
    }
  }

  return (
    <div className="notificacoes-dropdown" ref={dropdownRef} style={{ position: "relative", marginRight: 20 }}>
      {/* Ícone do sino com contador */}
      <button
        className="notificacoes-icon-btn"
        style={{
          background: "none",
          border: "none",
          position: "relative",
          cursor: "pointer"
        }}
        onClick={() => setAberto(!aberto)}
        aria-label="Notificações"
      >
        <FiBell size={26} color="#fff" />
        {naoLidas > 0 && (
          <span className="notificacoes-badge">{naoLidas}</span>
        )}
      </button>

      {/* Dropdown */}
      {aberto && (
        <div className="notificacoes-dropdown-menu notificacoes-dropdown-grande">
          {/* Cabeçalho */}
          <div className="notificacoes-dropdown-header-centralizado">
            <div className="notificacoes-dropdown-titulo">Notificações</div>
            <button
              className="notificacoes-marcar-lido-btn"
              onClick={marcarTodasComoLidas}
              disabled={naoLidas === 0}
              title="Marcar todas como lidas"
            >
              Marcar todas como lidas <FiCheckCircle size={18} style={{ verticalAlign: "-2px" }} />
            </button>
          </div>

          {/* Mensagem de erro */}
          {erro && (
            <div className="notificacoes-dropdown-vazio" style={{ color: "red" }}>
              {erro}
            </div>
          )}

          {/* Lista vazia */}
          {(listaNaoLidas.length === 0 && listaLidas.length === 0 && !erro) && (
            <div className="notificacoes-dropdown-vazio">
              Sem notificações.
            </div>
          )}

          {/* Lista de não lidas */}
          {listaNaoLidas.length > 0 && (
            <ul className="notificacoes-lista">
              {listaNaoLidas.map((n) => (
                <li
                  key={n.id}
                  onClick={() => marcarComoLida(n.id, n.link)}
                  className="notificacoes-item notificacao-nao-lida"
                  tabIndex={0}
                  title={n.mensagem}
                >
                  <span className="notificacoes-item-icone">{getIconeNotificacao(n.mensagem)}</span>
                  <span className="notificacoes-item-texto">{n.mensagem}</span>
                  <span className="notificacoes-item-data">{formatarData(n.data_criacao)}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Lista de lidas */}
          {listaLidas.length > 0 && (
            <ul className="notificacoes-lista">
              {listaLidas.map((n) => (
                <li
                  key={n.id}
                  onClick={() => marcarComoLida(n.id, n.link)}
                  className="notificacoes-item notificacao-lida"
                  tabIndex={0}
                  title={n.mensagem}
                >
                  <span className="notificacoes-item-icone">{getIconeNotificacao(n.mensagem)}</span>
                  <span className="notificacoes-item-texto">{n.mensagem}</span>
                  <span className="notificacoes-item-data">{formatarData(n.data_criacao)}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Botão ver todas */}
          <div style={{ padding: 12, textAlign: "center" }}>
            <button
              className="notificacoes-ver-todas-btn"
              onClick={() => { setAberto(false); navigate("/notificacoes"); }}
            >
              Ver todas as notificações
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
