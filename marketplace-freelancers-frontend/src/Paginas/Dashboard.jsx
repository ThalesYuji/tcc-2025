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

  // Configuração dos cards baseada no tipo de usuário
  const getStatsConfig = () => {
    if (usuarioLogado?.tipo === "freelancer") {
      return [
        {
          key: "enviadas",
          title: "Propostas Enviadas",
          icon: "bi-send",
          color: "primary",
          value: resumo?.enviadas ?? 0,
          trend: "+12%",
          period: "este mês"
        },
        {
          key: "aceitas",
          title: "Propostas Aceitas",
          icon: "bi-check-circle",
          color: "success",
          value: resumo?.aceitas ?? 0,
          trend: "+8%",
          period: "este mês"
        },
        {
          key: "recusadas",
          title: "Propostas Recusadas",
          icon: "bi-x-circle",
          color: "danger",
          value: resumo?.recusadas ?? 0,
          trend: "-5%",
          period: "este mês"
        },
        {
          key: "avaliacao",
          title: resumo?.totalAvaliacoes > 0 ? `${resumo.totalAvaliacoes} Avaliações` : "Sem Avaliações",
          icon: "bi-star",
          color: "secondary",
          value: resumo?.totalAvaliacoes > 0 ? (resumo.mediaAvaliacao ?? 0).toFixed(1) : "—",
          trend: resumo?.totalAvaliacoes > 0 ? "Avaliado" : "Aguardando",
          period: "média geral"
        }
      ];
    } else {
      return [
        {
          key: "recebidas",
          title: "Propostas Recebidas",
          icon: "bi-inbox",
          color: "primary",
          value: resumo?.recebidas ?? 0,
          trend: "+15%",
          period: "este mês"
        },
        {
          key: "pendentes",
          title: "Propostas Pendentes",
          icon: "bi-clock",
          color: "warning",
          value: resumo?.pendentes ?? 0,
          trend: "Aguardando",
          period: "análise"
        },
        {
          key: "aceitas",
          title: "Propostas Aceitas",
          icon: "bi-check-circle",
          color: "success",
          value: resumo?.aceitas ?? 0,
          trend: "+10%",
          period: "este mês"
        },
        {
          key: "avaliacao",
          title: resumo?.totalAvaliacoes > 0 ? `${resumo.totalAvaliacoes} Avaliações` : "Sem Avaliações",
          icon: "bi-star",
          color: "secondary",
          value: resumo?.totalAvaliacoes > 0 ? (resumo.mediaAvaliacao ?? 0).toFixed(1) : "—",
          trend: resumo?.totalAvaliacoes > 0 ? "Avaliado" : "Aguardando",
          period: "média geral"
        }
      ];
    }
  };

  // Estados de loading e erro
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
      {/* Header do Dashboard */}
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

      {/* Mensagem de Erro */}
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

      {/* Grid de Estatísticas */}
      <div className="stats-grid">
        {statsConfig.map((stat, index) => (
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
            <div className="stat-footer">
              <span className={`stat-trend ${
                stat.trend.includes('+') ? 'trend-positive' : 
                stat.trend.includes('-') ? 'trend-negative' : 'trend-neutral'
              }`}>
                {stat.trend.includes('+') && <i className="bi bi-trend-up"></i>}
                {stat.trend.includes('-') && <i className="bi bi-trend-down"></i>}
                {!stat.trend.includes('+') && !stat.trend.includes('-') && <i className="bi bi-dash-circle"></i>}
                {stat.trend}
              </span>
              <span className="stat-period">{stat.period}</span>
            </div>
          </div>
        ))}
      </div>


    </div>
  );
}