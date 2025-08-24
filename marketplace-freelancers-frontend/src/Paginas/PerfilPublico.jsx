import React, { useEffect, useState, useContext } from "react";
import api from "../Servicos/Api";
import { useParams, useNavigate } from "react-router-dom";
import { UsuarioContext } from "../Contextos/UsuarioContext";

// Função para desenhar estrelas
function renderEstrelas(nota) {
  const estrelas = [];
  for (let i = 1; i <= 5; i++) {
    estrelas.push(
      <span key={i} style={{ color: i <= nota ? "#ffce3d" : "#e0e0e0", fontSize: 18, marginRight: 1 }}>
        ★
      </span>
    );
  }
  return estrelas;
}

function formatarDataBR(dataStr) {
  if (!dataStr) return "";
  const d = new Date(dataStr);
  return d.toLocaleDateString("pt-BR");
}

export default function PerfilPublico() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuarioLogado } = useContext(UsuarioContext);

  const [usuario, setUsuario] = useState(null);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [notaMedia, setNotaMedia] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [trabalhosPublicados, setTrabalhosPublicados] = useState([]);
  const [carregandoTrabalhos, setCarregandoTrabalhos] = useState(false);
  const [habilidades, setHabilidades] = useState([]);
  const [carregandoHabilidades, setCarregandoHabilidades] = useState(false);
  const [portfolio, setPortfolio] = useState([]);
  const [carregandoPortfolio, setCarregandoPortfolio] = useState(false);

  useEffect(() => {
    async function buscarDados() {
      try {
        const resp = await api.get(`/usuarios/${id}/`);
        setUsuario(resp.data);

        const avs = await api.get("/avaliacoes/");
        const recebidas = avs.data.filter((a) => String(a.avaliado.id) === String(id));
        setAvaliacoes(recebidas);
        if (recebidas.length > 0) {
          const media = recebidas.reduce((soma, a) => soma + a.nota, 0) / recebidas.length;
          setNotaMedia(media);
        }
      } catch {
        setUsuario(null);
      }
      setCarregando(false);
    }
    buscarDados();
  }, [id]);

  useEffect(() => {
    if (usuario && usuario.tipo === "cliente") {
      setCarregandoTrabalhos(true);
      api.get("/trabalhos/")
        .then(res => {
          const lista = res.data.results || res.data;
          const meusTrabalhos = lista.filter(t => String(t.cliente_id) === String(usuario.id));
          setTrabalhosPublicados(meusTrabalhos);
        })
        .catch(() => setTrabalhosPublicados([]))
        .finally(() => setCarregandoTrabalhos(false));
    }
  }, [usuario]);

  useEffect(() => {
    async function buscarHabilidades() {
      if (usuario && usuario.tipo === "freelancer") {
        setCarregandoHabilidades(true);
        try {
          const resp = await api.get("/trabalhos/");
          const lista = resp.data.results || resp.data;
          const trabalhosDoFreela = lista.filter(t => String(t.freelancer) === String(usuario.id));
          let todas = [];
          trabalhosDoFreela.forEach(t => {
            if (Array.isArray(t.habilidades_detalhes)) {
              todas = todas.concat(t.habilidades_detalhes.map(h => h.nome));
            }
          });
          const unicas = [...new Set(todas)];
          setHabilidades(unicas);
        } catch {
          setHabilidades([]);
        }
        setCarregandoHabilidades(false);
      }
    }
    buscarHabilidades();
  }, [usuario]);

  useEffect(() => {
    async function buscarPortfolio() {
      if (usuario && usuario.tipo === "freelancer") {
        setCarregandoPortfolio(true);
        try {
          const resp = await api.get("/trabalhos/");
          const lista = resp.data.results || resp.data;
          const concluidos = lista.filter(
            t => String(t.freelancer) === String(usuario.id) && t.status === "concluido"
          );
          setPortfolio(concluidos);
        } catch {
          setPortfolio([]);
        }
        setCarregandoPortfolio(false);
      }
    }
    buscarPortfolio();
  }, [usuario]);

  if (carregando) return <div style={{ textAlign: "center", marginTop: 60 }}>Carregando perfil...</div>;
  if (!usuario) return <div style={{ textAlign: "center", marginTop: 60 }}>Perfil não encontrado.</div>;

  const fotoPerfil =
    usuario.foto_perfil
      ? usuario.foto_perfil.startsWith("http")
        ? usuario.foto_perfil
        : `http://localhost:8000${usuario.foto_perfil}`
      : "/icone-usuario.png";

  const mostrarBadge = usuario.tipo === "freelancer" && notaMedia && notaMedia >= 4.5;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(120deg,#e8f0fa 0%,#f7fafd 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      paddingTop: 60
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 20,
        boxShadow: "0 4px 18px #0f377226",
        width: 410,
        maxWidth: "98vw",
        marginTop: 20,
        padding: "52px 34px 30px 34px",
        position: "relative",
        textAlign: "center"
      }}>
        {/* Avatar e badge */}
        <div style={{
          position: "absolute",
          top: -64,
          left: "50%",
          transform: "translateX(-50%)",
          width: 110,
          height: 110,
          borderRadius: "50%",
          background: "#eaf4fd",
          border: "5px solid #fff",
          boxShadow: "0 4px 18px #1976d238",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10
        }}>
          <img
            src={fotoPerfil}
            alt="Foto de perfil"
            style={{
              width: 90,
              height: 90,
              objectFit: "cover",
              borderRadius: "50%",
              border: "2px solid #1976d2",
              background: "#f2f5f9"
            }}
          />
          {mostrarBadge && (
            <div style={{
              position: "absolute",
              right: -12,
              bottom: -6,
              background: "#ffce3d",
              color: "#223146",
              fontWeight: 900,
              padding: "5px 12px",
              borderRadius: 14,
              fontSize: 15,
              boxShadow: "0 1px 4px #f9e9a0"
            }}>
              TOP ★
            </div>
          )}
        </div>

        {/* BOTÃO DASHBOARD CENTRALIZADO E ABAIXO DO AVATAR */}
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            marginTop: 68,
            marginBottom: 16,
            background: "#eaf4fd",
            border: "1.2px solid #1976d2",
            color: "#1976d2",
            borderRadius: 9,
            padding: "10px 34px",
            fontWeight: 700,
            fontSize: "1.08rem",
            cursor: "pointer",
            boxShadow: "0 1px 6px #ddeaf6",
            outline: "none"
          }}
        >
          ← Dashboard
        </button>

        <h2 style={{ margin: "0 0 8px 0", color: "#1976d2", fontWeight: 800 }}>
          {usuario.nome}
        </h2>
        <div style={{ marginBottom: 5, fontWeight: 600, color: "#223146", fontSize: 17 }}>
          {usuario.tipo === "freelancer" ? "Freelancer" : "Cliente"}
        </div>
        {typeof notaMedia !== "undefined" && (
          <div style={{ marginBottom: 8, color: "#1976d2", fontWeight: 700 }}>
            Média de avaliação: {notaMedia ? notaMedia.toFixed(2) + " / 5" : "Sem avaliações"}
          </div>
        )}

        {/* Habilidades */}
        {usuario.tipo === "freelancer" && (
          <div style={{ margin: "14px 0" }}>
            <div style={{ color: "#223146", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Habilidades</div>
            {carregandoHabilidades ? (
              <div style={{ color: "#888" }}>Carregando habilidades...</div>
            ) : habilidades.length === 0 ? (
              <div style={{ color: "#888", fontStyle: "italic" }}>Nenhuma habilidade encontrada ainda.</div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center" }}>
                {habilidades.map((hab, i) => (
                  <span key={hab + i}
                    style={{
                      background: "#1976d2",
                      color: "#fff",
                      borderRadius: 16,
                      padding: "4px 14px",
                      fontWeight: 600,
                      fontSize: 14,
                      boxShadow: "0 1px 4px #dde4ef"
                    }}>
                    {hab}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Trabalhos publicados (cliente) */}
        {usuario.tipo === "cliente" && (
          <div style={{ marginTop: 22, marginBottom: 18, textAlign: "center" }}>
            <h4 style={{ color: "#223146", fontWeight: 700, marginBottom: 8 }}>Trabalhos Publicados</h4>
            {carregandoTrabalhos ? (
              <div style={{ color: "#888" }}>Carregando trabalhos...</div>
            ) : trabalhosPublicados.length === 0 ? (
              <div style={{ color: "#888", fontStyle: "italic" }}>Nenhum trabalho publicado ainda.</div>
            ) : (
              <ul style={{ paddingLeft: 0, listStyle: "none", margin: 0 }}>
                {trabalhosPublicados.map(trab => (
                  <li key={trab.id} style={{
                    marginBottom: 10, background: "#f8fafb", borderRadius: 8, padding: "7px 12px", boxShadow: "0 1px 3px #eee"
                  }}>
                    <span style={{ fontWeight: 600 }}>{trab.titulo}</span>{" "}
                    <span style={{
                      color:
                        trab.status === "aberto" ? "green" :
                          trab.status === "concluido" ? "blue" :
                            trab.status === "cancelado" ? "red" : "#888"
                    }}>
                      [{trab.status}]
                    </span>
                    <button
                      style={{
                        marginLeft: 12,
                        padding: "4px 10px",
                        borderRadius: 5,
                        background: "#1976d2",
                        color: "#fff",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 14
                      }}
                      onClick={() => navigate(`/trabalhos/${trab.id}`)}
                    >Ver detalhes</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Portfólio de trabalhos concluídos (freelancer) */}
        {usuario.tipo === "freelancer" && (
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <h4 style={{ color: "#223146", fontWeight: 700, marginBottom: 8 }}>
              Portfólio: Trabalhos Concluídos
            </h4>
            {carregandoPortfolio ? (
              <div style={{ color: "#888" }}>Carregando portfólio...</div>
            ) : portfolio.length === 0 ? (
              <div style={{ color: "#888", fontStyle: "italic" }}>Nenhum trabalho concluído ainda.</div>
            ) : (
              <ul style={{ paddingLeft: 0, listStyle: "none", margin: 0 }}>
                {portfolio.map(trab => (
                  <li key={trab.id} style={{
                    marginBottom: 10, background: "#f0f5fa", borderRadius: 8, padding: "7px 12px", boxShadow: "0 1px 3px #e6eaf1"
                  }}>
                    <span style={{ fontWeight: 600 }}>{trab.titulo}</span>
                    <span style={{ color: "#1976d2", fontSize: 13, marginLeft: 7 }}>
                      [Concluído]
                    </span>
                    <div style={{ fontSize: 13, marginTop: 2 }}>{trab.descricao}</div>
                    <div style={{ fontSize: 12, color: "#999" }}>
                      Orçamento: R$ {Number(trab.orcamento).toFixed(2)}
                    </div>
                    <button
                      style={{
                        marginTop: 6,
                        padding: "3px 10px",
                        borderRadius: 5,
                        background: "#1976d2",
                        color: "#fff",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 13
                      }}
                      onClick={() => navigate(`/trabalhos/${trab.id}`)}
                    >Ver detalhes</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Avaliações recebidas */}
        <div style={{ marginTop: 22 }}>
          <h4 style={{ color: "#223146", fontWeight: 700 }}>Avaliações Recebidas</h4>
          {avaliacoes.length === 0 && (
            <div style={{ color: "#888", fontStyle: "italic" }}>
              Nenhuma avaliação recebida ainda.
            </div>
          )}
          {avaliacoes.map((av) => (
            <div key={av.id} style={{
              padding: "10px 0",
              borderBottom: "1px solid #f0f0f0",
              fontSize: "1rem",
              textAlign: "left"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                {renderEstrelas(av.nota)}
                <span style={{ color: "#1976d2", fontWeight: 700 }}>{av.nota} / 5</span>
              </div>
              <div style={{ margin: "2px 0", fontStyle: "italic", color: "#555" }}>
                “{av.comentario || "Sem comentário"}”
              </div>
              <div style={{ fontSize: 14, color: "#777", marginTop: 2 }}>
                <span><strong>De:</strong> {av.avaliador?.nome || "Usuário"}</span>
                <span style={{ marginLeft: 8 }}>|</span>
                <span style={{ marginLeft: 8 }}><strong>Data:</strong> {formatarDataBR(av.data_avaliacao)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* BOTÕES FINAIS - AGRUPADOS CENTRALIZADOS */}
        {(usuarioLogado && usuarioLogado.id !== usuario.id && (
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 12,
            marginTop: 26,
            flexWrap: "wrap"
          }}>
            {/* Botão Contratar Freelancer */}
            {usuario.tipo === "freelancer" && usuarioLogado.tipo === "cliente" && (
              <button
                style={{
                  background: "#43a047",
                  color: "#fff",
                  border: "none",
                  borderRadius: 7,
                  padding: "10px 22px",
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: "pointer",
                  boxShadow: "0 2px 6px #dbeee2"
                }}
                onClick={() => navigate("/trabalhos/cadastrar")}
              >
                Contratar Freelancer
              </button>
            )}
            {/* Botão Denunciar Perfil */}
            <button
              style={{
                background: "#e53935",
                color: "#fff",
                border: "none",
                borderRadius: 7,
                padding: "10px 22px",
                fontWeight: 700,
                fontSize: 16,
                cursor: "pointer",
                boxShadow: "0 2px 6px #fde3e4"
              }}
              onClick={() =>
                navigate("/denuncias/cadastrar", { state: { denunciado: usuario.id } })
              }
            >
              Denunciar Perfil
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
