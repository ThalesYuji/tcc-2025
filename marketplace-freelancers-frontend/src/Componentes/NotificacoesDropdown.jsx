// src/Componentes/NotificacoesDropdown.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../Servicos/Api";
import "../styles/NotificacoesDropdown.css";

// Função para retornar ícone Bootstrap Icons de acordo com o tipo
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

// Função para formatar data de forma mais limpa
function formatarData(dataStr) {
  if (!dataStr) return "";
  
  const agora = new Date();
  const data = new Date(dataStr);
  const diffMs = agora - data;
  const diffMinutos = Math.floor(diffMs / 60000);
  const diffHoras = Math.floor(diffMs / 3600000);
  const diffDias = Math.floor(diffMs / 86400000);

  if (diffMinutos < 1) return "agora";
  if (diffMinutos < 60) return `${diffMinutos}min`;
  if (diffHoras < 24) return `${diffHoras}h`;
  if (diffDias < 7) return `${diffDias}d`;
  
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

  // Busca notificações do backend
  async function fetchNotificacoes() {
    try {
      setCarregando(true);
      setErro("");
      const token = localStorage.getItem("token");
      const res = await api.get("/notificacoes/", {
        headers: { Authorization: `Bearer ${token}` }
      });

      const dados = res.data.results || res.data;
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

  // Contadores
  const naoLidas = notificacoes.filter(n => !n.lida).length;
  const listaNaoLidas = notificacoes.filter(n => !n.lida);
  const listaLidas = notificacoes.filter(n => n.lida).slice(0, 5); // Apenas 5 lidas

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
    <div className="notificacoes-dropdown" ref={dropdownRef}>
      {/* Botão do sino - PADRONIZADO COM A NAVBAR */}
      <button
        className="notificacoes-icon-btn"
        onClick={() => setAberto(!aberto)}
        aria-label={`Notificações${naoLidas > 0 ? ` (${naoLidas} não lidas)` : ''}`}
      >
        <i className="bi bi-bell" style={{ fontSize: '1.1rem' }}></i>
        {naoLidas > 0 && (
          <span className="notificacoes-badge">
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {aberto && (
        <div className="notificacoes-dropdown-menu">
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
              title="Marcar todas as notificações como lidas"
              style={{ 
                display: naoLidas > 0 ? 'flex' : 'none',
                alignItems: 'center',
                gap: '0.25rem'
              }}
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

          {/* Lista de notificações - ESTRUTURA PADRONIZADA */}
          {!carregando && !erro && notificacoes.length > 0 && (
            <ul className="notificacoes-lista">
              {/* Não lidas primeiro */}
              {listaNaoLidas.map((notificacao) => (
                <li
                  key={notificacao.id}
                  onClick={() => marcarComoLida(notificacao.id, notificacao.link)}
                  className="notificacoes-item notificacao-nao-lida"
                  tabIndex={0}
                  title={notificacao.mensagem}
                >
                  <span className="notificacoes-item-icone">
                    <i className={`bi ${getIconeNotificacao(notificacao.mensagem)}`}></i>
                  </span>
                  <div className="notificacoes-item-conteudo">
                    <div className="notificacoes-item-texto">
                      {notificacao.mensagem}
                    </div>
                    <div className="notificacoes-item-data">
                      {formatarData(notificacao.data_criacao)}
                    </div>
                  </div>
                </li>
              ))}
              
              {/* Lidas depois */}
              {listaLidas.map((notificacao) => (
                <li
                  key={notificacao.id}
                  onClick={() => marcarComoLida(notificacao.id, notificacao.link)}
                  className="notificacoes-item notificacao-lida"
                  tabIndex={0}
                  title={notificacao.mensagem}
                >
                  <span className="notificacoes-item-icone">
                    <i className={`bi ${getIconeNotificacao(notificacao.mensagem)}`}></i>
                  </span>
                  <div className="notificacoes-item-conteudo">
                    <div className="notificacoes-item-texto">
                      {notificacao.mensagem}
                    </div>
                    <div className="notificacoes-item-data">
                      {formatarData(notificacao.data_criacao)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Botão ver todas */}
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