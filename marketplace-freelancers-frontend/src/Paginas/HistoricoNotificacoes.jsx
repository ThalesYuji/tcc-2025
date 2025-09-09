// src/Paginas/HistoricoNotificacoes.jsx
import React, { useEffect, useState } from "react";
import api from "../Servicos/Api";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiCheckCircle } from "react-icons/fi";
import "../styles/HistoricoNotificacoes.css";

// 🔹 Ícone baseado na mensagem
function getIconeNotificacao(mensagem = "") {
  mensagem = mensagem.toLowerCase();
  if (mensagem.includes("avaliação") || mensagem.includes("avaliacao")) return "⭐";
  if (mensagem.includes("denúncia") || mensagem.includes("denuncia")) return "🚨";
  if (mensagem.includes("contrato")) return "📄";
  if (mensagem.includes("pagamento")) return "💰";
  if (mensagem.includes("mensagem")) return "✉️";
  return "🔔";
}

// 🔹 Data no formato BR
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

  // 🔹 Buscar notificações
  async function fetchNotificacoes() {
    setCarregando(true);
    setErro("");
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/notificacoes/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotificacoes(res.data || []);
    } catch (err) {
      setErro("Erro ao buscar notificações.");
    }
    setCarregando(false);
  }

  useEffect(() => {
    fetchNotificacoes();
  }, []);

  // 🔹 Marcar todas como lidas
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
      setNotificacoes(notificacoes.map((n) => ({ ...n, lida: true })));
    } catch (err) {
      console.error("Erro ao marcar todas como lidas:", err);
    }
  }

  // 🔹 Marcar uma como lida e redirecionar
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

  return (
    <div className="historico-page">
      <div className="historico-box">
        {/* 🔹 Título */}
        <div className="historico-title">Histórico de Notificações</div>

        {/* 🔹 Lista */}
        <div className="historico-lista">
          {carregando && (
            <div className="historico-carregando">Carregando...</div>
          )}
          {erro && <div className="historico-erro">{erro}</div>}
          {!carregando && notificacoes.length === 0 && !erro && (
            <div className="historico-vazio">Sem notificações.</div>
          )}
          <ul className="notificacoes-ul">
            {notificacoes.map((n) => (
              <li
                key={n.id}
                className={`notificacoes-item ${
                  n.lida ? "notificacao-lida" : "notificacao-nao-lida"
                }`}
                tabIndex={0}
                title={n.mensagem}
                onClick={() => n.link && handleNotificacaoClick(n.id, n.link)}
              >
                <span className="notificacao-icone">
                  {getIconeNotificacao(n.mensagem)}
                </span>
                <div className="notificacao-conteudo">
                  <div
                    className={`notificacao-mensagem ${
                      n.lida ? "mensagem-lida" : "mensagem-nao-lida"
                    }`}
                  >
                    {n.mensagem}
                  </div>
                  <span className="notificacao-data">
                    {formatarData(n.data_criacao)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* 🔹 Rodapé */}
        <div className="historico-footer">
          <button className="btn-voltar" onClick={() => navigate(-1)}>
            <FiArrowLeft /> <span>Voltar</span>
          </button>

          <button
            className="btn-marcar-todas"
            onClick={marcarTodasComoLidas}
            disabled={notificacoes.every((n) => n.lida)}
          >
            Marcar todas como lidas
            <FiCheckCircle size={16} style={{ marginLeft: 6 }} />
          </button>
        </div>
      </div>
    </div>
  );
}
