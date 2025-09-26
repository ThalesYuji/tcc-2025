// src/Paginas/PerfilPublico.jsx - Redesign Moderno
import React, { useEffect, useState, useContext } from "react";
import api from "../Servicos/Api";
import { useParams, useNavigate } from "react-router-dom";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import "../styles/PerfilPublico.css";

function StarRating({ rating, size = "md" }) {
  const sizes = {
    sm: "0.875rem",
    md: "1rem", 
    lg: "1.25rem"
  };

  return (
    <div className="star-rating" style={{ fontSize: sizes[size] }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <i
          key={star}
          className={`bi ${star <= Math.round(rating) ? 'bi-star-fill' : 'bi-star'}`}
          style={{ color: star <= Math.round(rating) ? '#fbbf24' : '#d1d5db' }}
        />
      ))}
    </div>
  );
}

function Badge({ type, children }) {
  const badgeClasses = {
    top: "badge-top",
    verified: "badge-verified",
    new: "badge-new"
  };

  return (
    <div className={`user-badge ${badgeClasses[type] || ''}`}>
      {children}
    </div>
  );
}

function StatCard({ icon, label, value, color = "primary" }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-icon">
        <i className={icon}></i>
      </div>
      <div className="stat-content">
        <span className="stat-value">{value}</span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  );
}

function formatarDataBR(dataStr) {
  if (!dataStr) return "";
  return new Date(dataStr).toLocaleDateString("pt-BR");
}

export default function PerfilPublico() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuarioLogado } = useContext(UsuarioContext);

  const [usuario, setUsuario] = useState(null);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [notaMedia, setNotaMedia] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

  useEffect(() => {
    async function buscarDados() {
      try {
        setCarregando(true);
        setErro("");

        // Dados do usuário (perfil público)
        const resp = await api.get(`/usuarios/${id}/perfil_publico/`);

        if (resp.data && resp.data.id) {
          setUsuario(resp.data);
          setNotaMedia(resp.data.nota_media || null);
        } else {
          setErro("Perfil não encontrado");
          return;
        }

        // Avaliações públicas recebidas
        const avs = await api.get(`/usuarios/${id}/avaliacoes_publicas/`);
        setAvaliacoes(avs.data);
      } catch (err) {
        console.error("Erro ao buscar perfil:", err);
        setErro("Erro ao carregar o perfil. Tente novamente.");
      } finally {
        setCarregando(false);
      }
    }
    
    if (id) {
      buscarDados();
    }
  }, [id]);

  // Loading state
  if (carregando) {
    return (
      <div className="perfil-container">
        <div className="perfil-main">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <h3>Carregando perfil</h3>
            <p>Buscando informações do usuário...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (erro || !usuario) {
    return (
      <div className="perfil-container">
        <div className="perfil-main">
          <div className="error-state">
            <i className="bi bi-person-x"></i>
            <h3>Perfil não encontrado</h3>
            <p>{erro || "O usuário que você está procurando não foi encontrado."}</p>
            <button className="btn btn-primary" onClick={() => navigate("/home")}>
              <i className="bi bi-house"></i>
              Voltar ao início
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Avatar com tratamento de URL
  const fotoPerfil = usuario.foto_perfil
    ? usuario.foto_perfil.startsWith("http")
      ? usuario.foto_perfil
      : `${BASE_URL}${usuario.foto_perfil}`
    : "/icone-usuario.png";

  // Verificar se é usuário top (freelancer com nota >= 4.5)
  const isTopUser = usuario.tipo === "freelancer" && notaMedia && notaMedia >= 4.5;
  const isNewUser = new Date() - new Date(usuario.date_joined || usuario.created_at) < 30 * 24 * 60 * 60 * 1000; // Menos de 30 dias

  return (
    <div className="perfil-container">
      <div className="perfil-main">
        
        {/* Header com navegação */}
        <div className="perfil-header">
          <button className="btn-back" onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left"></i>
            Voltar
          </button>
          <h1 className="perfil-title">Perfil Público</h1>
          <div className="header-spacer"></div>
        </div>

        <div className="perfil-content">
          
          {/* Card Principal - Informações do Usuário */}
          <div className="perfil-card main-card">
            <div className="profile-header">
              <div className="profile-avatar-section">
                <div className="avatar-wrapper">
                  <img src={fotoPerfil} alt="Foto de perfil" className="profile-avatar-large" />
                  {isTopUser && (
                    <Badge type="top">
                      <i className="bi bi-star-fill"></i>
                      TOP
                    </Badge>
                  )}
                  {isNewUser && (
                    <Badge type="new">
                      <i className="bi bi-person-plus"></i>
                      NOVO
                    </Badge>
                  )}
                </div>
                <div className="profile-info">
                  <h2 className="profile-name">{usuario.nome}</h2>
                  <div className="profile-type">
                    <i className={`bi ${usuario.tipo === 'freelancer' ? 'bi-person-workspace' : 'bi-building'}`}></i>
                    {usuario.tipo === "freelancer" ? "Freelancer" : "Cliente"}
                  </div>
                  {notaMedia && (
                    <div className="profile-rating">
                      <StarRating rating={notaMedia} size="lg" />
                      <span className="rating-value">{notaMedia.toFixed(1)}</span>
                      <span className="rating-count">({avaliacoes.length} avaliações)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bio */}
              {usuario.bio && (
                <div className="profile-bio">
                  <p>{usuario.bio}</p>
                </div>
              )}
            </div>
          </div>

          {/* Estatísticas */}
          <div className="perfil-card stats-card">
            <div className="card-header">
              <h3>
                <i className="bi bi-graph-up"></i>
                Estatísticas
              </h3>
            </div>
            <div className="stats-grid">
              {usuario.tipo === "cliente" && (
                <StatCard
                  icon="bi bi-briefcase"
                  label="Trabalhos Publicados"
                  value={usuario.trabalhos_publicados ?? 0}
                  color="primary"
                />
              )}
              {usuario.tipo === "freelancer" && (
                <StatCard
                  icon="bi bi-check-circle"
                  label="Trabalhos Concluídos"
                  value={usuario.trabalhos_concluidos ?? 0}
                  color="success"
                />
              )}
              <StatCard
                icon="bi bi-star"
                label="Avaliações"
                value={avaliacoes.length}
                color="warning"
              />
              {notaMedia && (
                <StatCard
                  icon="bi bi-award"
                  label="Nota Média"
                  value={`${notaMedia.toFixed(1)}/5`}
                  color="info"
                />
              )}
            </div>
          </div>

          {/* Avaliações Recebidas */}
          <div className="perfil-card avaliacoes-card">
            <div className="card-header">
              <h3>
                <i className="bi bi-chat-quote"></i>
                Avaliações Recebidas
              </h3>
              {avaliacoes.length > 0 && (
                <span className="avaliacoes-count">{avaliacoes.length}</span>
              )}
            </div>
            <div className="card-body">
              {avaliacoes.length === 0 ? (
                <div className="empty-state">
                  <i className="bi bi-star"></i>
                  <h4>Nenhuma avaliação ainda</h4>
                  <p>Este usuário ainda não recebeu avaliações.</p>
                </div>
              ) : (
                <div className="avaliacoes-list">
                  {avaliacoes.map((av) => (
                    <div key={av.id} className="avaliacao-item">
                      <div className="avaliacao-header">
                        <div className="avaliador-info">
                          <span className="avaliador-nome">{av.avaliador?.nome || "Usuário"}</span>
                          <span className="avaliacao-data">{formatarDataBR(av.data_avaliacao)}</span>
                        </div>
                        <div className="avaliacao-rating">
                          <StarRating rating={av.nota} size="sm" />
                          <span className="nota-texto">{av.nota}/5</span>
                        </div>
                      </div>
                      {av.comentario && (
                        <div className="avaliacao-comentario">
                          <p>"{av.comentario}"</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Ações do Perfil */}
          {usuarioLogado && usuarioLogado.id !== usuario.id && (
            <div className="perfil-card actions-card">
              <div className="card-header">
                <h3>
                  <i className="bi bi-gear"></i>
                  Ações
                </h3>
              </div>
              <div className="card-body">
                <div className="profile-actions">
                  {usuario.tipo === "freelancer" && usuarioLogado.tipo === "cliente" && (
                    <button
                      className="btn btn-success action-btn"
                      onClick={() => navigate(`/trabalhos/novo?freelancer=${usuario.id}`)}
                    >
                      <i className="bi bi-person-check"></i>
                      Contratar Freelancer
                    </button>
                  )}
                  <button
                    className="btn btn-outline-danger action-btn"
                    onClick={() => navigate("/denuncias/cadastrar", {
                      state: { denunciado: usuario.id }
                    })}
                  >
                    <i className="bi bi-flag"></i>
                    Denunciar Perfil
                  </button>
                  <button
                    className="btn btn-ghost action-btn"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: `Perfil de ${usuario.nome}`,
                          text: `Confira o perfil de ${usuario.nome}`,
                          url: window.location.href,
                        });
                      } else {
                        navigator.clipboard.writeText(window.location.href);
                        // Aqui você poderia adicionar um toast de feedback
                        alert("Link copiado para a área de transferência!");
                      }
                    }}
                  >
                    <i className="bi bi-share"></i>
                    Compartilhar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Card de Informações Adicionais */}
          <div className="perfil-card info-card">
            <div className="card-header">
              <h3>
                <i className="bi bi-info-circle"></i>
                Informações
              </h3>
            </div>
            <div className="card-body">
              <div className="info-list">
                <div className="info-item">
                  <span className="info-label">Tipo de usuário</span>
                  <span className="info-value">
                    <span className={`user-type-badge ${usuario.tipo}`}>
                      {usuario.tipo === "freelancer" ? "Freelancer" : "Cliente"}
                    </span>
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Membro desde</span>
                  <span className="info-value">
                    {formatarDataBR(usuario.date_joined || usuario.created_at)}
                  </span>
                </div>
                {notaMedia && (
                  <div className="info-item">
                    <span className="info-label">Reputação</span>
                    <span className="info-value">
                      {notaMedia >= 4.5 ? "Excelente" : 
                       notaMedia >= 4.0 ? "Muito Boa" :
                       notaMedia >= 3.0 ? "Boa" : "Regular"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}