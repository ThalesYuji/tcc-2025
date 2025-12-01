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
  const [totalPaginas, setTotalPaginas] = useState(1);

  useEffect(() => {
    async function fetchData() {
      // não executa sem usuário logado
      if (!usuarioLogado) {
        setCarregando(false);
        return;
      }

      try {
        setCarregando(true);
        setErro("");

        let endpoint = "";
        
        // Define endpoint baseado no tipo de usuário
        if (usuarioLogado.tipo === "freelancer") {
          endpoint = `/trabalhos/?page=${pagina}&page_size=6`;
        } else if (usuarioLogado.tipo === "contratante") {
          endpoint = `/usuarios/?tipo=freelancer&page=${pagina}&page_size=6`;
        } else {
          console.warn("Tipo de usuário não reconhecido:", usuarioLogado.tipo);
          setErro("Tipo de usuário não reconhecido. Verifique seu cadastro.");
          setCarregando(false);
          return;
        }

        console.log("🔍 Buscando:", endpoint);

        // Faz requisição
        const res = await api.get(endpoint);

        console.log("✅ Resposta recebida:", res.data);

        // Valida resposta
        if (!res || !res.data) {
          throw new Error("Resposta inválida da API");
        }

        // Trata paginação do DRF 
        if (res.data.results !== undefined) {
          // Formato DRF
          setOportunidades(res.data.results || []);
          
          const pageSize = 6;
          const totalItens = res.data.count || 0;
          setTotalPaginas(Math.ceil(totalItens / pageSize));
        } 
        // Resposta customizada do backend
        else if (res.data.total !== undefined) {
          // Formato
          setOportunidades(res.data.results || []);
          setTotalPaginas(res.data.num_pages || 1);
        }
        // Array direto
        else if (Array.isArray(res.data)) {
          setOportunidades(res.data);
          setTotalPaginas(1);
        }
        // Formato desconhecido
        else {
          console.error("Formato de resposta desconhecido:", res.data);
          setOportunidades([]);
          setTotalPaginas(1);
        }

      } catch (err) {
        console.error("❌ Erro ao carregar oportunidades:", err);
        
        // Mensagens de erro mais específicas
        if (err.response) {
          setErro(
            `Erro ${err.response.status}: ${
              err.response.data?.detail || 
              err.response.data?.message || 
              "Erro ao carregar dados do servidor"
            }`
          );
        } else if (err.request) {
          setErro("Não foi possível conectar ao servidor. Verifique sua conexão.");
        } else {
          setErro(err.message || "Erro desconhecido ao carregar oportunidades.");
        }
        
        setOportunidades([]);
      } finally {
        setCarregando(false);
      }
    }

    fetchData();
  }, [usuarioLogado, pagina]);

  // Estado de carregamento
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

  // Usuário não logado
  if (!usuarioLogado) {
    return (
      <div className="page-container">
        <div className="error-container">
          <div className="empty-icon">⚠️</div>
          <h3 className="empty-title">Acesso Negado</h3>
          <p className="empty-description">Você precisa estar logado para acessar esta página.</p>
          <Link to="/login" className="btn gradient-btn">
            <i className="bi bi-box-arrow-in-right"></i> Fazer Login
          </Link>
        </div>
      </div>
    );
  }

  // Atalhos rápidos do painel
  const getShortcuts = () => {
    if (usuarioLogado.tipo === "contratante") {
      return [
        { path: "/trabalhos/novo", icon: "bi-megaphone", label: "Publicar", color: "bg-danger" },
        { path: "/propostas", icon: "bi-file-earmark-text", label: "Propostas", color: "bg-primary" },
        { path: "/contratos", icon: "bi-file-earmark-check", label: "Contratos", color: "bg-success" },
        { path: "/notificacoes", icon: "bi-bell", label: "Notificações", color: "bg-warning" }
      ];
    } else {
      return [
        { path: "/trabalhos", icon: "bi-search", label: "Trabalhos", color: "bg-danger" },
        { path: "/propostas", icon: "bi-file-earmark-text", label: "Propostas", color: "bg-primary" },
        { path: "/contratos", icon: "bi-file-earmark-check", label: "Contratos", color: "bg-success" },
        { path: "/notificacoes", icon: "bi-bell", label: "Notificações", color: "bg-warning" }
      ];
    }
  };

  return (
    <div className="home-wrapper page-container fade-in">
      {/* Hero Section */}
      <section className="hero-section">
        <h1 className="user-greeting">
          Olá, {usuarioLogado.nome || usuarioLogado.username || "Usuário"}!
        </h1>

        <p className="hero-description">
          {usuarioLogado.tipo === "freelancer"
            ? "Descubra projetos incríveis e impulsione sua carreira para o próximo nível"
            : "Conecte-se com talentos extraordinários e transforme suas ideias em realidade"}
        </p>
      </section>

      {/* Atalhos Rápidos */}
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

      {/* Oportunidades */}
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
            <button 
              onClick={() => window.location.reload()} 
              className="btn gradient-btn"
            >
              <i className="bi bi-arrow-clockwise"></i> Tentar Novamente
            </button>
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
                        <h3 className="job-title">{trabalho.titulo || "Sem título"}</h3>
                        <p className="job-description">
                          {trabalho.descricao && trabalho.descricao.length > 150
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
                                : `${import.meta.env.VITE_API_URL || "http://localhost:8000"}${freelancer.foto_perfil}`
                            }
                            alt={freelancer.nome || "Avatar"}
                            className="freelancer-avatar"
                            onError={(e) => {
                              e.target.style.display = "none";
                              e.target.nextSibling.style.display = "flex";
                            }}
                          />
                        ) : null}
                        
                        <div
                          className="freelancer-avatar"
                          style={{
                            display: freelancer.foto_perfil ? "none" : "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "var(--superficie-hover)",
                            color: "var(--cor-texto-light)",
                            fontSize: "2rem"
                          }}
                        >
                          <i className="bi bi-person-circle"></i>
                        </div>

                        <h3 className="freelancer-name">
                          {freelancer.nome || freelancer.username || "Freelancer"}
                        </h3>

                        <div className="skills-container">
                          {freelancer.habilidades && freelancer.habilidades.length > 0 ? (
                            <>
                              {freelancer.habilidades.slice(0, 3).map((habilidade, idx) => (
                                <span key={idx} className="skill-badge">
                                  {habilidade.nome || habilidade}
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
                            <span>{Number(freelancer.nota_media).toFixed(1)}</span>
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

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className="pagination-container">
                <button
                  className="btn btn-secondary"
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                >
                  <i className="bi bi-chevron-left"></i> Anterior
                </button>
                
                <span className="pagination-info">
                  Página {pagina} de {totalPaginas}
                </span>
                
                <button
                  className="btn btn-secondary"
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={pagina === totalPaginas}
                >
                  Próxima <i className="bi bi-chevron-right"></i>
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Rodapé */}
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