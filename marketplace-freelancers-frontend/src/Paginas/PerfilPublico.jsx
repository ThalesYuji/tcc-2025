// src/Paginas/PerfilPublico.jsx
import React, { useEffect, useState, useContext } from "react";
import api from "../Servicos/Api";
import { useParams, useNavigate } from "react-router-dom";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import Navbar from "../Componentes/Navbar";
import "../styles/PerfilPublico.css";

function StarRating({ rating, className = "stars-container" }) {
  return (
    <div className={className}>
      {[1, 2, 3, 4, 5].map((star) => (
        <i
          key={star}
          className={`bi ${star <= Math.round(rating) ? "bi-star-fill" : "bi-star"}`}
        />
      ))}
    </div>
  );
}

function formatarDataBR(dataStr) {
  if (!dataStr) return "";
  return new Date(dataStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatarNumero(num) {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "k";
  }
  return (num ?? 0).toString();
}

export default function PerfilPublico() {
  // 🔹 Suporta /perfil/:id e /perfil/me
  const { id: idParam } = useParams();
  const navigate = useNavigate();
  const { usuarioLogado } = useContext(UsuarioContext);

  // Estados
  const [usuario, setUsuario] = useState(null);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [notaMedia, setNotaMedia] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [activeTab, setActiveTab] = useState("sobre");
  const [mostrarAlerta, setMostrarAlerta] = useState(false);

  const [paginaAtual, setPaginaAtual] = useState(1);
  const avaliacoesPorPagina = 4;

  // 🔹 Busca dados com fallback e suporte a /me
  useEffect(() => {
    async function buscarDados() {
      try {
        setCarregando(true);
        setErro("");

        // 1) Resolver o alvo (id real)
        let idAlvo = idParam;

        // Se for /perfil/me, busca /usuarios/me/ e redireciona para /perfil/{id}
        if (idParam === "me") {
          const me = await api.get("/usuarios/me/");
          idAlvo = me?.data?.id;
          if (idAlvo) {
            if (String(idAlvo) !== String(idParam)) {
              navigate(`/perfil/${idAlvo}`, { replace: true });
              return; // encerra aqui; o próximo efeito roda com o id real
            }
          } else {
            setErro("Não foi possível resolver o usuário atual.");
            return;
          }
        }

        // 2) Perfil público e avaliações
        const resp = await api.get(`/usuarios/${idAlvo}/perfil_publico/`);
        setUsuario(resp.data);
        setNotaMedia(resp.data.nota_media || null);

        const avs = await api.get(`/usuarios/${idAlvo}/avaliacoes_publicas/`);
        setAvaliacoes(avs.data);
      } catch (err) {
        const status = err?.response?.status;
        if (status === 404) {
          setErro("Perfil não encontrado.");
        } else {
          setErro("Erro ao carregar o perfil.");
        }
      } finally {
        setCarregando(false);
      }
    }

    if (idParam) buscarDados();
  }, [idParam, navigate]);

  const handleCompartilhar = () => {
    if (navigator.share) {
      navigator.share({
        title: `Perfil de ${usuario?.nome || "Usuário"}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      setMostrarAlerta(true);
      setTimeout(() => setMostrarAlerta(false), 3000);
    }
  };

  const totalPaginas = Math.ceil(avaliacoes.length / avaliacoesPorPagina) || 1;
  const indiceInicial = (paginaAtual - 1) * avaliacoesPorPagina;
  const indiceFinal = indiceInicial + avaliacoesPorPagina;
  const avaliacoesPaginadas = avaliacoes.slice(indiceInicial, indiceFinal);

  const proximaPagina = () => {
    if (paginaAtual < totalPaginas) setPaginaAtual(paginaAtual + 1);
  };
  const paginaAnterior = () => {
    if (paginaAtual > 1) setPaginaAtual(paginaAtual - 1);
  };

  // ================== ESTADOS DE CARREGAMENTO / ERRO ==================
  if (carregando) {
    return (
      <>
        <Navbar />
        <div className="perfil-redesign-container">
          <div className="page-container">
            <div className="loading-modern">
              <div className="loading-spinner-modern"></div>
              <h3>Carregando perfil</h3>
              <p>Aguarde um momento...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (erro || !usuario) {
    return (
      <>
        <Navbar />
        <div className="perfil-redesign-container">
          <div className="page-container">
            <div className="error-modern">
              <i className="bi bi-person-x"></i>
              <h3>Perfil não encontrado</h3>
              <p>{erro || "O usuário que você está procurando não foi encontrado."}</p>
              <button className="action-btn primary" onClick={() => navigate("/home")}>
                <i className="bi bi-house"></i>
                Voltar ao início
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ================== CONTEÚDO PRINCIPAL ==================
  const fotoPerfil = usuario?.foto_perfil || "/icone-usuario.png";
  const isTopUser = usuario.tipo === "freelancer" && notaMedia && notaMedia >= 4.5;
  const isNewUser =
    new Date() - new Date(usuario.date_joined || usuario.created_at) <
    30 * 24 * 60 * 60 * 1000;

  return (
    <>
      <Navbar />

      <div className="perfil-redesign-container">
        {mostrarAlerta && (
          <div className="toast-alert success">
            <div className="toast-icon">
              <i className="bi bi-check-circle-fill"></i>
            </div>
            <div className="toast-content">
              <div className="toast-title">Link copiado!</div>
              <div className="toast-message">
                O link do perfil foi copiado para a área de transferência
              </div>
            </div>
            <button className="toast-close" onClick={() => setMostrarAlerta(false)}>
              <i className="bi bi-x"></i>
            </button>
          </div>
        )}

        <div className="page-container fade-in">
          <div className="perfil-header-section">
            <h1 className="perfil-title">
              <div className="perfil-title-icon">
                <i className="bi bi-person-circle"></i>
              </div>
              Perfil do Usuário
            </h1>
            <p className="perfil-subtitle">
              Visualize informações profissionais e avaliações
            </p>
          </div>

          <div className="perfil-card-main">
            <div className="avatar-section">
              <div className="avatar-container">
                <img src={fotoPerfil} alt={usuario.nome} className="perfil-avatar-img" />

                {isTopUser && (
                  <div className="badge-top-profile">
                    <i className="bi bi-award-fill"></i>
                    TOP
                  </div>
                )}

                {isNewUser && (
                  <div className="badge-new-profile">
                    <i className="bi bi-star-fill"></i>
                    NOVO
                  </div>
                )}
              </div>
            </div>

            <div className="info-section">
              <h2 className="perfil-name">{usuario.nome}</h2>

              <div className="perfil-user-type">
                <i
                  className={`bi ${
                    usuario.tipo === "freelancer" ? "bi-briefcase" : "bi-building"
                  }`}
                ></i>
                {usuario.tipo === "freelancer" ? "Freelancer" : "Contratante"}
              </div>

              {notaMedia && (
                <div className="rating-display">
                  <StarRating rating={notaMedia} />
                  <span className="rating-number">{notaMedia.toFixed(1)}</span>
                  <span className="rating-count-text">({avaliacoes.length} avaliações)</span>
                </div>
              )}

              <div className="stats-mini-grid">
                {usuario.tipo === "freelancer" && (
                  <div className="stat-mini-item">
                    <span className="stat-mini-value">
                      {formatarNumero(usuario.trabalhos_concluidos ?? 0)}
                    </span>
                    <span className="stat-mini-label">Concluídos</span>
                  </div>
                )}
                {usuario.tipo === "contratante" && (
                  <div className="stat-mini-item">
                    <span className="stat-mini-value">
                      {formatarNumero(usuario.trabalhos_publicados ?? 0)}
                    </span>
                    <span className="stat-mini-label">Publicados</span>
                  </div>
                )}
                <div className="stat-mini-item">
                  <span className="stat-mini-value">
                    {formatarNumero(avaliacoes.length)}
                  </span>
                  <span className="stat-mini-label">Avaliações</span>
                </div>
                {notaMedia && (
                  <div className="stat-mini-item">
                    <span className="stat-mini-value">{notaMedia.toFixed(1)}</span>
                    <span className="stat-mini-label">Estrelas</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="main-content-layout">
            <div className="content-left">
              <div className="tabs-nav">
                <button
                  className={`tab-button ${activeTab === "sobre" ? "active" : ""}`}
                  onClick={() => setActiveTab("sobre")}
                >
                  <i className="bi bi-person-lines-fill"></i>
                  Sobre
                </button>
                <button
                  className={`tab-button ${activeTab === "avaliacoes" ? "active" : ""}`}
                  onClick={() => setActiveTab("avaliacoes")}
                >
                  <i className="bi bi-star-fill"></i>
                  Avaliações
                </button>
                <button
                  className={`tab-button ${activeTab === "estatisticas" ? "active" : ""}`}
                  onClick={() => setActiveTab("estatisticas")}
                >
                  <i className="bi bi-graph-up"></i>
                  Estatísticas
                </button>
              </div>

              {/* === ABA ESTATÍSTICAS === */}
              {activeTab === "estatisticas" && (
                <div className="fade-in">
                  {(usuario.tipo === "freelancer" || usuario.tipo === "contratante") && (
                    <div className="stats-section-profile">
                      <div className="section-header-profile">
                        <div className="section-icon-profile primary">
                          <i className="bi bi-briefcase-fill"></i>
                        </div>
                        <h2 className="section-title-profile">Trabalhos</h2>
                      </div>
                      <div className="stats-detailed-grid">
                        {usuario.tipo === "contratante" && (
                          <div className="stat-detail-card">
                            <div className="stat-detail-icon primary">
                              <i className="bi bi-briefcase-fill"></i>
                            </div>
                            <div className="stat-detail-info">
                              <span className="stat-detail-value">
                                {formatarNumero(usuario.trabalhos_publicados ?? 0)}
                              </span>
                              <span className="stat-detail-label">Publicados</span>
                            </div>
                          </div>
                        )}

                        {usuario.tipo === "freelancer" && (
                          <div className="stat-detail-card">
                            <div className="stat-detail-icon success">
                              <i className="bi bi-check-circle-fill"></i>
                            </div>
                            <div className="stat-detail-info">
                              <span className="stat-detail-value">
                                {formatarNumero(usuario.trabalhos_concluidos ?? 0)}
                              </span>
                              <span className="stat-detail-label">Concluídos</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* AVALIAÇÕES */}
                  <div className="stats-section-profile">
                    <div className="section-header-profile">
                      <div className="section-icon-profile warning">
                        <i className="bi bi-star-fill"></i>
                      </div>
                      <h2 className="section-title-profile">Avaliações</h2>
                    </div>
                    <div className="stats-detailed-grid">
                      <div className="stat-detail-card">
                        <div className="stat-detail-icon info">
                          <i className="bi bi-pencil-square"></i>
                        </div>
                        <div className="stat-detail-info">
                          <span className="stat-detail-value">
                            {formatarNumero(usuario.avaliacoes_enviadas ?? 0)}
                          </span>
                          <span className="stat-detail-label">Enviadas</span>
                        </div>
                      </div>

                      <div className="stat-detail-card">
                        <div className="stat-detail-icon warning">
                          <i className="bi bi-star-fill"></i>
                        </div>
                        <div className="stat-detail-info">
                          <span className="stat-detail-value">
                            {formatarNumero(usuario.avaliacoes_recebidas ?? 0)}
                          </span>
                          <span className="stat-detail-label">Recebidas</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DENÚNCIAS */}
                  <div className="stats-section-profile">
                    <div className="section-header-profile">
                      <div className="section-icon-profile danger">
                        <i className="bi bi-shield-fill-exclamation"></i>
                      </div>
                      <h2 className="section-title-profile">Denúncias</h2>
                    </div>
                    <div className="stats-detailed-grid">
                      <div className="stat-detail-card">
                        <div className="stat-detail-icon danger">
                          <i className="bi bi-flag-fill"></i>
                        </div>
                        <div className="stat-detail-info">
                          <span className="stat-detail-value">
                            {formatarNumero(usuario.denuncias_enviadas ?? 0)}
                          </span>
                          <span className="stat-detail-label">Enviadas</span>
                        </div>
                      </div>

                      <div className="stat-detail-card">
                        <div className="stat-detail-icon warning">
                          <i className="bi bi-exclamation-triangle-fill"></i>
                        </div>
                        <div className="stat-detail-info">
                          <span className="stat-detail-value">
                            {formatarNumero(usuario.denuncias_recebidas ?? 0)}
                          </span>
                          <span className="stat-detail-label">Recebidas</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {avaliacoes.length > 0 && (
                    <div className="standard-card">
                      <div className="card-header-std">
                        <i className="bi bi-pie-chart-fill header-icon-std"></i>
                        <h3>Distribuição de Avaliações</h3>
                      </div>
                      <div className="card-body-std">
                        <div className="distribution-chart">
                          {[5, 4, 3, 2, 1].map((nota) => {
                            const count = avaliacoes.filter(
                              (av) => Math.round(av.nota) === nota
                            ).length;
                            const percentual =
                              avaliacoes.length > 0
                                ? (count / avaliacoes.length) * 100
                                : 0;
                            return (
                              <div key={nota} className="distribution-row">
                                <div className="distribution-label">
                                  {nota} <i className="bi bi-star-fill"></i>
                                </div>
                                <div className="distribution-bar-container">
                                  <div
                                    className="distribution-bar-fill"
                                    style={{ width: `${percentual}%` }}
                                  ></div>
                                </div>
                                <div className="distribution-count">{count}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* === ABA SOBRE === */}
              {activeTab === "sobre" && (
                <div className="standard-card fade-in">
                  <div className="card-header-std">
                    <i className="bi bi-chat-left-quote-fill header-icon-std"></i>
                    <h3>Sobre Mim</h3>
                  </div>
                  <div className="card-body-std">
                    {usuario.bio ? (
                      <p className="bio-text">{usuario.bio}</p>
                    ) : (
                      <div className="empty-state">
                        <i className="bi bi-info-circle"></i>
                        <p>Este usuário ainda não adicionou uma biografia.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* === ABA AVALIAÇÕES === */}
              {activeTab === "avaliacoes" && (
                <div className="fade-in">
                  {avaliacoes.length === 0 ? (
                    <div className="standard-card">
                      <div className="card-body-std">
                        <div className="empty-state">
                          <i className="bi bi-star"></i>
                          <h3>Nenhuma avaliação</h3>
                          <p>Este usuário ainda não recebeu avaliações.</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="reviews-list">
                        {avaliacoesPaginadas.map((av) => (
                          <div key={av.id} className="review-item">
                            <div className="review-header">
                              <div className="reviewer-info">
                                <div className="reviewer-avatar">
                                  {av.avaliador?.nome?.charAt(0)?.toUpperCase() || "?"}
                                </div>
                                <div className="reviewer-details">
                                  <span className="reviewer-name">
                                    {av.avaliador?.nome || "Usuário Anônimo"}
                                  </span>
                                  <span className="review-date">
                                    {formatarDataBR(av.data_avaliacao)}
                                  </span>
                                </div>
                              </div>
                              <div className="review-rating">
                                <StarRating rating={av.nota} className="review-stars" />
                                <span className="review-value">{av.nota.toFixed(1)}</span>
                              </div>
                            </div>
                            {av.comentario && (
                              <div className="review-comment">
                                <p>{av.comentario}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {totalPaginas > 1 && (
                        <div className="pagination-container">
                          <div className="pagination-info">
                            Página {paginaAtual} de {totalPaginas} • {avaliacoes.length} avaliações
                          </div>
                          <div className="pagination-controls">
                            <button
                              className="pagination-btn"
                              onClick={paginaAnterior}
                              disabled={paginaAtual === 1}
                            >
                              <i className="bi bi-chevron-left"></i>
                            </button>
                            <button
                              className="pagination-btn"
                              onClick={proximaPagina}
                              disabled={paginaAtual === totalPaginas}
                            >
                              <i className="bi bi-chevron-right"></i>
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* === SIDEBAR DIREITA === */}
            <div className="content-right">
              {usuarioLogado && usuarioLogado.id !== usuario.id && (
                <div className="standard-card">
                  <div className="card-header-std">
                    <i className="bi bi-lightning-charge-fill header-icon-std"></i>
                    <h3>Ações Rápidas</h3>
                  </div>
                  <div className="card-body-std">
                    <div className="actions-list">
                      {usuario.tipo === "freelancer" &&
                        usuarioLogado.tipo === "contratante" && (
                          <button
                            className="action-btn primary"
                            onClick={() =>
                              navigate(`/trabalhos/novo?freelancer=${usuario.id}`)
                            }
                          >
                            <i className="bi bi-person-check-fill"></i>
                            Contratar
                          </button>
                        )}
                      <button
                        className="action-btn danger"
                        onClick={() =>
                          navigate("/denuncias/cadastrar", {
                            state: { denunciado: usuario.id },
                          })
                        }
                      >
                        <i className="bi bi-flag-fill"></i>
                        Denunciar
                      </button>
                      <button className="action-btn ghost" onClick={handleCompartilhar}>
                        <i className="bi bi-share-fill"></i>
                        Compartilhar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="standard-card">
                <div className="card-header-std">
                  <i className="bi bi-info-circle-fill header-icon-std"></i>
                  <h3>Informações</h3>
                </div>
                <div className="card-body-std">
                  <div className="info-list">
                    <div className="info-item">
                      <i className="bi bi-person-badge info-icon"></i>
                      <div className="info-content">
                        <div className="info-label">Tipo</div>
                        <div className="info-value">
                          <span className={`badge-type ${usuario.tipo}`}>
                            {usuario.tipo === "freelancer" ? "Freelancer" : "Contratante"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {notaMedia && (
                      <div className="info-item">
                        <i className="bi bi-trophy info-icon"></i>
                        <div className="info-content">
                          <div className="info-label">Reputação</div>
                          <div className="info-value">
                            {notaMedia >= 4.5
                              ? "Excelente"
                              : notaMedia >= 4.0
                              ? "Muito Boa"
                              : notaMedia >= 3.0
                              ? "Boa"
                              : "Regular"}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="info-item">
                      <i className="bi bi-activity info-icon"></i>
                      <div className="info-content">
                        <div className="info-label">Status</div>
                        <div className="info-value">
                          <span className="status-badge">Ativo</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
