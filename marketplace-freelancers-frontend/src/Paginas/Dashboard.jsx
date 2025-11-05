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

  // 🔹 Configuração REORGANIZADA dos cards
  const getStatsConfig = () => {
    const avaliacoesEnviadas = resumo?.avaliacoesEnviadas ?? 0;
    const avaliacoesRecebidas = resumo?.avaliacoesRecebidas ?? 0;
    const denunciasEnviadas = resumo?.denunciasEnviadas ?? 0;
    const denunciasRecebidas = resumo?.denunciasRecebidas ?? 0;

    // 🧑‍💻 Painel para FREELANCER
    if (usuarioLogado?.tipo === "freelancer") {
      return {
        propostas: [
          {
            key: "enviadas",
            title: "Enviadas",
            icon: "bi-send-fill",
            color: "primary",
            value: resumo?.enviadas ?? 0,
          },
          {
            key: "aceitas",
            title: "Aceitas",
            icon: "bi-check-circle-fill",
            color: "success",
            value: resumo?.aceitas ?? 0,
          },
          {
            key: "recusadas",
            title: "Recusadas",
            icon: "bi-x-circle-fill",
            color: "danger",
            value: resumo?.recusadas ?? 0,
          },
        ],
        avaliacoes: [
          {
            key: "avaliacoesEnviadas",
            title: "Enviadas",
            icon: "bi-pencil-square",
            color: "info",
            value: avaliacoesEnviadas,
          },
          {
            key: "avaliacoesRecebidas",
            title: "Recebidas",
            icon: "bi-star-fill",
            color: "warning",
            value: avaliacoesRecebidas,
          },
        ],
        denuncias: [
          {
            key: "denunciasEnviadas",
            title: "Enviadas",
            icon: "bi-flag-fill",
            color: "danger",
            value: denunciasEnviadas,
          },
          {
            key: "denunciasRecebidas",
            title: "Recebidas",
            icon: "bi-exclamation-triangle-fill",
            color: "warning",
            value: denunciasRecebidas,
          },
        ],
      };
    }

    // 🧍 Painel para CONTRATANTE
    return {
      propostas: [
        {
          key: "recebidas",
          title: "Recebidas",
          icon: "bi-inbox-fill",
          color: "primary",
          value: resumo?.recebidas ?? 0,
        },
        {
          key: "pendentes",
          title: "Pendentes",
          icon: "bi-clock-fill",
          color: "warning",
          value: resumo?.pendentes ?? 0,
        },
        {
          key: "aceitas",
          title: "Aceitas",
          icon: "bi-check-circle-fill",
          color: "success",
          value: resumo?.aceitas ?? 0,
        },
      ],
      avaliacoes: [
        {
          key: "avaliacoesEnviadas",
          title: "Enviadas",
          icon: "bi-pencil-square",
          color: "info",
          value: avaliacoesEnviadas,
        },
        {
          key: "avaliacoesRecebidas",
          title: "Recebidas",
          icon: "bi-star-fill",
          color: "warning",
          value: avaliacoesRecebidas,
        },
      ],
      denuncias: [
        {
          key: "denunciasEnviadas",
          title: "Enviadas",
          icon: "bi-flag-fill",
          color: "danger",
          value: denunciasEnviadas,
        },
        {
          key: "denunciasRecebidas",
          title: "Recebidas",
          icon: "bi-exclamation-triangle-fill",
          color: "warning",
          value: denunciasRecebidas,
        },
      ],
    };
  };

  if (carregando) {
    return (
      <div className="dashboard-page page-container">
        <div className="dashboard-loading">
          <div className="loading-icon"></div>
          <h3>Carregando seu painel...</h3>
          <p>Buscando suas estatísticas mais recentes</p>
        </div>
      </div>
    );
  }

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

  const statsConfig = getStatsConfig();

  return (
    <div className="dashboard-page page-container fade-in">
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

      {/* SEÇÃO DE PROPOSTAS */}
      <div className="stats-section">
        <div className="section-header">
          <div className="section-icon">
            <i className="bi bi-briefcase-fill"></i>
          </div>
          <h2 className="section-title">Propostas</h2>
        </div>
        <div className="stats-grid">
          {statsConfig.propostas.map((stat) => (
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

      {/* SEÇÃO DE AVALIAÇÕES */}
      <div className="stats-section">
        <div className="section-header">
          <div className="section-icon">
            <i className="bi bi-star-fill"></i>
          </div>
          <h2 className="section-title">Avaliações</h2>
        </div>
        <div className="stats-grid stats-grid-2">
          {statsConfig.avaliacoes.map((stat) => (
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

      {/* SEÇÃO DE DENÚNCIAS */}
      <div className="stats-section">
        <div className="section-header">
          <div className="section-icon">
            <i className="bi bi-shield-fill-exclamation"></i>
          </div>
          <h2 className="section-title">Denúncias</h2>
        </div>
        <div className="stats-grid stats-grid-2">
          {statsConfig.denuncias.map((stat) => (
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
    </div>
  );
}