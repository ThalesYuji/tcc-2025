// src/Paginas/Dashboard.jsx
import React, { useContext, useEffect, useState } from "react";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import api from "../Servicos/Api";
import "../styles/Dashboard.css";

export default function Dashboard() {
  const { usuarioLogado } = useContext(UsuarioContext);
  const [carregando, setCarregando] = useState(true);
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState("");

  // 🔹 Carrega o resumo de estatísticas do usuário logado
  useEffect(() => {
    async function fetchResumo() {
      try {
        const res = await api.get("/usuarios/me/resumo/");
        setResumo(res.data || {});
        setErro("");
      } catch (err) {
        console.error("Erro ao buscar resumo:", err);
        setErro("Erro ao carregar o resumo. Tente novamente mais tarde.");
        setResumo(null);
      } finally {
        setCarregando(false);
      }
    }

    if (usuarioLogado) {
      fetchResumo();
    } else {
      setCarregando(false);
    }
  }, [usuarioLogado]);

  // 🔹 Helper para singular/plural em avaliações
  const tituloAvaliacoes = (n) => {
    if (!n || n === 0) return "Sem Avaliações Recebidas";
    return n === 1 ? "1 Avaliação" : `${n} Avaliações`;
  };

  // 🔹 Configuração dos cards exibidos no painel (estatísticas)
  const getStatsConfig = () => {
    const totalAvaliacoes = resumo?.totalAvaliacoes ?? 0;
    const denunciasEnviadas = resumo?.denunciasEnviadas ?? 0;
    const denunciasRecebidas = resumo?.denunciasRecebidas ?? 0;

    // 🧑‍💻 Painel para FREELANCER
    if (usuarioLogado?.tipo === "freelancer") {
      return [
        {
          key: "enviadas",
          title: "Propostas Enviadas",
          icon: "bi-send",
          color: "primary",
          value: resumo?.enviadas ?? 0,
        },
        {
          key: "aceitas",
          title: "Propostas Aceitas",
          icon: "bi-check-circle",
          color: "success",
          value: resumo?.aceitas ?? 0,
        },
        {
          key: "recusadas",
          title: "Propostas Recusadas",
          icon: "bi-x-circle",
          color: "danger",
          value: resumo?.recusadas ?? 0,
        },
        {
          key: "avaliacao",
          title: tituloAvaliacoes(totalAvaliacoes),
          icon: "bi-star",
          color: "secondary",
          value: totalAvaliacoes > 0 ? totalAvaliacoes : "—",
        },
        // 🔸 NOVO CARD: denúncias enviadas
        {
          key: "denunciasEnviadas",
          title: "Denúncias Enviadas",
          icon: "bi-flag-fill",
          color: "danger",
          value: denunciasEnviadas,
        },
        // 🔸 NOVO CARD: denúncias recebidas
        {
          key: "denunciasRecebidas",
          title: "Denúncias Recebidas",
          icon: "bi-exclamation-triangle-fill",
          color: "warning",
          value: denunciasRecebidas,
        },
      ];
    }

    // 🧍 Painel para CONTRATANTE
    return [
      {
        key: "recebidas",
        title: "Propostas Recebidas",
        icon: "bi-inbox",
        color: "primary",
        value: resumo?.recebidas ?? 0,
      },
      {
        key: "pendentes",
        title: "Propostas Pendentes",
        icon: "bi-clock",
        color: "warning",
        value: resumo?.pendentes ?? 0,
      },
      {
        key: "aceitas",
        title: "Propostas Aceitas",
        icon: "bi-check-circle",
        color: "success",
        value: resumo?.aceitas ?? 0,
      },
      {
        key: "avaliacao",
        title: tituloAvaliacoes(totalAvaliacoes),
        icon: "bi-star",
        color: "secondary",
        value: totalAvaliacoes > 0 ? totalAvaliacoes : "—",
      },
      // 🔸 NOVOS CARDS DE DENÚNCIAS
      {
        key: "denunciasEnviadas",
        title: "Denúncias Enviadas",
        icon: "bi-flag-fill",
        color: "danger",
        value: denunciasEnviadas,
      },
      {
        key: "denunciasRecebidas",
        title: "Denúncias Recebidas",
        icon: "bi-exclamation-triangle-fill",
        color: "warning",
        value: denunciasRecebidas,
      },
    ];
  };

  // 🔹 Tela de carregamento
  if (carregando) {
    return (
      <div className="dashboard-page page-container">
        <div className="dashboard-loading">
          <div className="loading-icon"></div>
          <h3 style={{ color: "var(--cor-texto-light)" }}>Carregando seu painel...</h3>
          <p style={{ color: "var(--cor-texto-light)", textAlign: "center" }}>
            Buscando suas estatísticas mais recentes
          </p>
        </div>
      </div>
    );
  }

  // 🔹 Caso não esteja autenticado
  if (!usuarioLogado) {
    return (
      <div className="dashboard-page page-container">
        <div className="dashboard-error">
          <div className="error-icon">⚠️</div>
          <h3 className="error-title">Acesso Negado</h3>
          <p className="error-message">
            Você precisa estar autenticado para ver seu painel.
          </p>
        </div>
      </div>
    );
  }

  // 🔹 Gera os cards com base no tipo de usuário
  const statsConfig = getStatsConfig();

  return (
    <div className="dashboard-page page-container fade-in">
      {/* Cabeçalho */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">
          <div className="dashboard-title-icon">
            <i className="bi bi-speedometer2"></i>
          </div>
          Meu Painel
        </h1>
        <p className="dashboard-subtitle">
          Acompanhe seu desempenho e gerencie suas atividades na plataforma
        </p>
      </div>

      {/* Erro ao carregar dados */}
      {erro && (
        <div className="dashboard-error">
          <div className="error-icon">❌</div>
          <h3 className="error-title">Erro ao Carregar Dados</h3>
          <p className="error-message">{erro}</p>
          <button
            className="btn gradient-btn"
            onClick={() => window.location.reload()}
          >
            <i className="bi bi-arrow-clockwise"></i>
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Cards de estatísticas */}
      <div className="stats-grid">
        {statsConfig.map((stat) => (
          <div key={stat.key} className={`stat-card ${stat.color}`}>
            <div className="stat-header">
              <div className="stat-icon">
                <i className={`bi ${stat.icon}`}></i>
              </div>
              <div className="stat-content">
                <div className="stat-number">{stat.value}</div>
                <p className="stat-label">{stat.title}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
