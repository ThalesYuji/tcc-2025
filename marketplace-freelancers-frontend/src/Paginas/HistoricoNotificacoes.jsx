// src/Paginas/HistoricoNotificacoes.jsx
import React, { useEffect, useState } from "react";
import api from "../Servicos/Api";
import "../App.css";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiCheckCircle } from "react-icons/fi";

// Função para definir o ícone com base no conteúdo da mensagem
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

export default function HistoricoNotificacoes() {
  const [notificacoes, setNotificacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const navigate = useNavigate();

  // Função para buscar notificações
  async function fetchNotificacoes() {
    setCarregando(true);
    setErro("");
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/notificacoes/", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotificacoes(res.data || []);
    } catch (err) {
      console.error("Erro ao buscar notificações:", err);
      setErro("Erro ao buscar notificações.");
    }
    setCarregando(false);
  }

  useEffect(() => {
    fetchNotificacoes();
  }, []);

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
      setNotificacoes(notificacoes.map(n => ({ ...n, lida: true })));
    } catch (err) {
      console.error("Erro ao marcar todas como lidas:", err);
    }
  }

  // Marca uma como lida e navega se tiver link
  async function handleNotificacaoClick(id, link) {
    try {
      const token = localStorage.getItem("token");
      await api.patch(`/notificacoes/${id}/`, { lida: true }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotificacoes(notificacoes =>
        notificacoes.map(n => n.id === id ? { ...n, lida: true } : n)
      );
      if (link) navigate(link);
    } catch (err) {
      console.error("Erro ao marcar notificação como lida:", err);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(120deg,#e8f0fa 0%,#f7fafd 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 0
      }}
    >
      <div
        className="main-box"
        style={{
          maxWidth: 540,
          width: "98vw",
          margin: "0 auto",
          marginTop: 80,
          borderRadius: 20,
          boxShadow: "0 4px 28px #b3d1ef1c",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          minHeight: 500,
          padding: 0,
        }}
      >
        {/* Título */}
        <div
          style={{
            textAlign: "center",
            fontWeight: 800,
            color: "#1976d2",
            fontSize: 23,
            padding: "28px 16px 18px 16px",
            borderBottom: "1px solid #e0e7fa",
            letterSpacing: 0.5,
          }}
        >
          Histórico de Notificações
        </div>

        {/* Lista */}
        <div
          style={{
            flex: 1,
            minHeight: 260,
            overflowY: "auto",
            padding: "10px 0",
          }}
        >
          {carregando && (
            <div style={{ textAlign: "center", padding: 30, color: "#1976d2" }}>Carregando...</div>
          )}
          {erro && (
            <div style={{ textAlign: "center", color: "red", padding: 18 }}>{erro}</div>
          )}
          {!carregando && notificacoes.length === 0 && !erro && (
            <div className="notificacoes-dropdown-vazio">Sem notificações.</div>
          )}
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {notificacoes.map(n => (
              <li
                key={n.id}
                className={`notificacoes-item ${n.lida ? "notificacao-lida" : "notificacao-nao-lida"}`}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16,
                  padding: "19px 28px",
                  borderBottom: "1px solid #f2f5fc",
                  background: n.lida ? "#fff" : "#eaf4fd",
                  fontWeight: n.lida ? 400 : 700,
                  cursor: n.link ? "pointer" : "default",
                  transition: "background 0.13s"
                }}
                tabIndex={0}
                title={n.mensagem}
                onClick={() => n.link && handleNotificacaoClick(n.id, n.link)}
              >
                <span style={{ fontSize: 27, marginTop: 2 }}>
                  {getIconeNotificacao(n.mensagem)}
                </span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 15.5,
                      color: n.lida ? "#223146" : "#1976d2",
                      whiteSpace: "pre-line",
                    }}
                  >
                    {n.mensagem}
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      color: "#868ca3",
                      marginTop: 3,
                      display: "inline-block"
                    }}
                  >
                    {formatarData(n.data_criacao)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Rodapé */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #e0e7fa",
            background: "#f7fafd",
            padding: "16px 24px",
            borderRadius: "0 0 20px 20px",
            minHeight: 58
          }}
        >
          {/* Voltar */}
          <button
            className="btn"
            onClick={() => navigate(-1)}
            style={{
              background: "#f6f9ff",
              border: "none",
              color: "#1976d2",
              fontSize: 16,
              borderRadius: 11,
              padding: "8px 18px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              height: "36px"
            }}
            title="Voltar"
          >
            <FiArrowLeft style={{ marginRight: 6, fontSize: 18 }} />
            <span>Voltar</span>
          </button>

          {/* Marcar todas */}
          <button
            className="notificacoes-marcar-lido-btn"
            onClick={marcarTodasComoLidas}
            disabled={notificacoes.every(n => n.lida)}
            style={{
              background: notificacoes.every(n => n.lida) ? "#e0e7ef" : "#70b7f8",
              color: notificacoes.every(n => n.lida) ? "#99aacb" : "#fff",
              border: "none",
              fontWeight: 700,
              fontSize: 15,
              borderRadius: 11,
              padding: "8px 16px",
              cursor: notificacoes.every(n => n.lida) ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              height: "36px"
            }}
            title="Marcar todas como lidas"
          >
            Marcar todas como lidas
            <FiCheckCircle size={16} style={{ marginLeft: 6 }} />
          </button>
        </div>
      </div>
    </div>
  );
}
