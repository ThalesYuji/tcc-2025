// src/Paginas/HomeInicial.jsx
import React, { useContext, useEffect, useState } from "react";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import api from "../Servicos/Api";
import { Link } from "react-router-dom";
import "../styles/HomeInicial.css";

export default function HomeInicial() {
  const { usuarioLogado } = useContext(UsuarioContext);
  const [oportunidades, setOportunidades] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [pagina, setPagina] = useState(1);
  const [temMais, setTemMais] = useState(false);
  const [totalPaginas, setTotalPaginas] = useState(1);

  useEffect(() => {
    async function fetchData() {
      try {
        let res = null;

        // 🔹 Carrega trabalhos ou freelancers conforme tipo
        if (usuarioLogado?.tipo === "freelancer") {
          res = await api.get(`/trabalhos/?page=${pagina}&page_size=6`);
        } else if (usuarioLogado?.tipo === "contratante") {
          res = await api.get(`/usuarios/?tipo=freelancer&page=${pagina}&page_size=6`);
        } else {
          console.warn("Tipo de usuário não reconhecido:", usuarioLogado?.tipo);
          setErro("Tipo de usuário não reconhecido. Verifique seu cadastro.");
          setCarregando(false);
          return;
        }

        // 🔹 Proteção contra resposta vazia
        if (!res || !res.data) {
          console.error("Resposta inválida da API:", res);
          setErro("Erro ao carregar oportunidades. Resposta inválida do servidor.");
          setCarregando(false);
          return;
        }

        // 🔹 Trata resultados paginados ou diretos
        if (res.data.results) {
          setOportunidades(res.data.results);
          setTemMais(!!res.data.next);
          setTotalPaginas(Math.ceil(res.data.count / 6));
        } else {
          setOportunidades(res.data);
          setTemMais(false);
          setTotalPaginas(1);
        }

        setErro("");
      } catch (err) {
        console.error("Erro ao carregar oportunidades:", err);
        setErro("Erro ao carregar oportunidades. Tente novamente mais tarde.");
      } finally {
        setCarregando(false);
      }
    }

    if (usuarioLogado) fetchData();
  }, [usuarioLogado, pagina]);

  // 🔹 Estado de carregamento
  if (carregando) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <span className="loading-text">Carregando...</span>
        </div>
      </div>
    );
  }

  // 🔹 Usuário não logado
  if (!usuarioLogado) {
    return (
      <div className="page-container">
        <div className="error-container">
          <div className="empty-icon">⚠️</div>
          <h3 className="empty-title">Acesso Negado</h3>
          <p className="empty-description">Usuário não autenticado!</p>
        </div>
      </div>
    );
  }

  // 🔹 Atalhos rápidos do painel
  const getShortcuts = () => {
    const baseShortcuts = [
      { path: "/propostas", icon: "bi-file-earmark-text", label: "Propostas", color: "bg-primary" },
      { path: "/contratos", icon: "bi-file-earmark-check", label: "Contratos", color: "bg-success" },
      { path: "/notificacoes", icon: "bi-bell", label: "Notificações", color: "bg-warning" }
    ];

    if (usuarioLogado.tipo === "contratante") {
      return [
        ...baseShortcuts,
        { path: "/trabalhos/novo", icon: "bi-megaphone", label: "Publicar", color: "bg-danger" }
      ];
    } else {
      return [
        ...baseShortcuts,
        { path: "/trabalhos", icon: "bi-search", label: "Trabalhos", color: "bg-secondary" }
      ];
    }
  };

  return (
    <div className="home-wrapper page-container fade-in">
      {/* 🏠 Hero Section */}
      <section className="hero-section">
        <div className="welcome-text">
          <span className="wave-emoji">👋</span>
          <span>Bem-vindo de volta!</span>
        </div>

        <h1 className="user-greeting">
          Olá, {usuarioLogado.nome || usuarioLogado.username}!
        </h1>

        <p className="hero-description">
          {usuarioLogado.tipo === "freelancer"
            ? "Descubra projetos incríveis e impulsione sua carreira para o próximo nível 🚀"
            : "Conecte-se com talentos extraordinários e transforme suas ideias em realidade 💡"}
        </p>

        {usuarioLogado.tipo === "contratante" ? (
          <Link to="/trabalhos/novo" className="hero-cta">
            <i className="bi bi-plus-circle"></i> Publicar Novo Trabalho
          </Link>
        ) : (
          <Link to="/trabalhos" className="hero-cta">
            <i className="bi bi-search"></i> Explorar Oportunidades
          </Link>
        )}
      </section>

      {/* ⚡ Atalhos Rápidos */}
      <section className="shortcuts-section section-spacing">
        <h2 className="section-title">Atalhos Rápidos</h2>
        <div className="shortcuts-grid">
          {getShortcuts().map((shortcut) => (
            <Link key={shortcut.path} to={shortcut.path} className="shortcut-card stagger-item">
              <div className={`shortcut-icon ${shortcut.color}`}>
                <i className={`bi ${shortcut.icon}`}></i>
              </div>
              <h4 className="shortcut-label">{shortcut.label}</h4>
            </Link>
          ))}
        </div>
      </section>

      {/* 💼 Oportunidades */}
      <section className="opportunities-section section-spacing">
        <div className="opportunities-header">
          <h2 className="section-title">
            {usuarioLogado.tipo === "freelancer" ? "Trabalhos em Destaque" : "Talentos Recomendados"}
          </h2>
        </div>

        {/* Mensagem de erro */}
        {erro && (
          <div className="error-container">
            <div className="empty-icon">❌</div>
            <h3 className="empty-title">Ops! Algo deu errado</h3>
            <p className="empty-description">{erro}</p>
          </div>
        )}

        {/* Nenhum resultado */}
        {!erro && oportunidades.length === 0 && (
          <div className="empty-opportunities">
            <div className="empty-icon">
              {usuarioLogado.tipo === "freelancer" ? "💼" : "👥"}
            </div>
            <h3 className="empty-title">Nenhuma oportunidade encontrada</h3>
            <p className="empty-description">
              {usuarioLogado.tipo === "freelancer"
                ? "Não há trabalhos disponíveis no momento. Volte em breve!"
                : "Não há freelancers disponíveis no momento. Que tal publicar um trabalho?"}
            </p>
            {usuarioLogado.tipo === "contratante" && (
              <Link to="/trabalhos/novo" className="btn gradient-btn">
                <i className="bi bi-plus-circle"></i> Publicar Trabalho
              </Link>
            )}
          </div>
        )}

        {/* Listagem */}
        {!erro && oportunidades.length > 0 && (
          <>
            <div className="opportunities-grid">
              {usuarioLogado.tipo === "freelancer"
                ? oportunidades.map((trabalho) => (
                    <div key={trabalho.id} className="job-card modern-card">
                      <div className="job-card-body">
                        <h3 className="job-title">{trabalho.titulo}</h3>
                        <p className="job-description">
                          {trabalho.descricao?.length > 150
                            ? trabalho.descricao.slice(0, 150) + "..."
                            : trabalho.descricao || "Sem descrição disponível."}
                        </p>
                        <div className="job-actions">
                          <Link to={`/trabalhos/detalhes/${trabalho.id}`} className="btn gradient-btn">
                            <i className="bi bi-eye"></i> Ver Detalhes
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
                : oportunidades.map((freelancer) => (
                    <div key={freelancer.id} className="freelancer-card modern-card">
                      <div className="freelancer-card-body">
                        {freelancer.foto_perfil ? (
                          <img
                            src={
                              freelancer.foto_perfil.startsWith("http")
                                ? freelancer.foto_perfil
                                : `http://localhost:8000${freelancer.foto_perfil}`
                            }
                            alt={freelancer.nome}
                            className="freelancer-avatar"
                          />
                        ) : (
                          <div
                            className="freelancer-avatar"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: "var(--superficie-hover)",
                              color: "var(--cor-texto-light)",
                              fontSize: "2rem"
                            }}
                          >
                            <i className="bi bi-person-circle"></i>
                          </div>
                        )}

                        <h3 className="freelancer-name">
                          {freelancer.nome || freelancer.username}
                        </h3>

                        <div className="skills-container">
                          {freelancer.habilidades?.length > 0 ? (
                            <>
                              {freelancer.habilidades.slice(0, 3).map((habilidade, idx) => (
                                <span key={idx} className="skill-badge">
                                  {habilidade.nome}
                                </span>
                              ))}
                              {freelancer.habilidades.length > 3 && (
                                <span className="skill-badge" style={{ background: "var(--cor-neutro)" }}>
                                  +{freelancer.habilidades.length - 3}
                                </span>
                              )}
                            </>
                          ) : (
                            <div className="no-skills-message">
                              <i className="bi bi-tools"></i>
                              <span>Habilidades em desenvolvimento</span>
                            </div>
                          )}
                        </div>

                        {freelancer.nota_media ? (
                          <div className="rating-display">
                            <span className="rating-stars">⭐</span>
                            <span>{freelancer.nota_media.toFixed(1)}</span>
                            <span className="rating-text">• Avaliado</span>
                          </div>
                        ) : (
                          <div className="rating-display">
                            <span>🆕 Novo talento</span>
                          </div>
                        )}

                        <div className="freelancer-actions">
                          <Link to={`/perfil/${freelancer.id}`} className="btn gradient-btn">
                            <i className="bi bi-person"></i> Ver Perfil
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
            </div>
          </>
        )}
      </section>

      {/* ⚙️ Rodapé */}
      <footer className="home-footer">
        <div className="footer-content">
          <i className="bi bi-rocket-takeoff"></i>
          <span>Continue construindo sua carreira com</span>
          <span className="footer-logo">ProFreelaBR</span>
          <span>• Segurança e qualidade em cada projeto</span>
        </div>
      </footer>
    </div>
  );
}
