// src/Paginas/PerfilPublico.jsx
import React, { useEffect, useState, useContext } from "react";
import api from "../Servicos/Api";
import { useParams, useNavigate } from "react-router-dom";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import "../styles/PerfilPublico.css";

// 🔹 Função para desenhar estrelas
function renderEstrelas(nota) {
  return Array.from({ length: 5 }, (_, i) => (
    <span
      key={i}
      style={{
        color: i < nota ? "#ffce3d" : "#e0e0e0",
        fontSize: 18,
        marginRight: 1,
      }}
    >
      ★
    </span>
  ));
}

// 🔹 Formata data padrão BR
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

  const [trabalhosPublicados, setTrabalhosPublicados] = useState([]);
  const [carregandoTrabalhos, setCarregandoTrabalhos] = useState(false);

  const [habilidades, setHabilidades] = useState([]);
  const [carregandoHabilidades, setCarregandoHabilidades] = useState(false);

  const [portfolio, setPortfolio] = useState([]);
  const [carregandoPortfolio, setCarregandoPortfolio] = useState(false);

  // 🔹 Carrega dados do usuário e avaliações
  useEffect(() => {
    async function buscarDados() {
      try {
        const resp = await api.get(`/usuarios/${id}/`);
        setUsuario(resp.data);

        const avs = await api.get("/avaliacoes/");
        const recebidas = avs.data.filter(
          (a) => String(a.avaliado.id) === String(id)
        );
        setAvaliacoes(recebidas);

        if (recebidas.length > 0) {
          const media =
            recebidas.reduce((soma, a) => soma + a.nota, 0) /
            recebidas.length;
          setNotaMedia(media);
        }
      } catch {
        setUsuario(null);
      } finally {
        setCarregando(false);
      }
    }
    buscarDados();
  }, [id]);

  // 🔹 Trabalhos do cliente
  useEffect(() => {
    if (usuario?.tipo === "cliente") {
      setCarregandoTrabalhos(true);
      api
        .get("/trabalhos/")
        .then((res) => {
          const lista = res.data.results || res.data;
          const meusTrabalhos = lista.filter(
            (t) => String(t.cliente_id) === String(usuario.id)
          );
          setTrabalhosPublicados(meusTrabalhos);
        })
        .catch(() => setTrabalhosPublicados([]))
        .finally(() => setCarregandoTrabalhos(false));
    }
  }, [usuario]);

  // 🔹 Habilidades do freelancer
  useEffect(() => {
    async function buscarHabilidades() {
      if (usuario?.tipo === "freelancer") {
        setCarregandoHabilidades(true);
        try {
          const resp = await api.get("/trabalhos/");
          const lista = resp.data.results || resp.data;
          const trabalhosDoFreela = lista.filter(
            (t) => String(t.freelancer) === String(usuario.id)
          );

          let todas = [];
          trabalhosDoFreela.forEach((t) => {
            if (Array.isArray(t.habilidades_detalhes)) {
              todas = todas.concat(t.habilidades_detalhes.map((h) => h.nome));
            }
          });

          setHabilidades([...new Set(todas)]);
        } catch {
          setHabilidades([]);
        } finally {
          setCarregandoHabilidades(false);
        }
      }
    }
    buscarHabilidades();
  }, [usuario]);

  // 🔹 Portfólio de freelancer (trabalhos concluídos)
  useEffect(() => {
    async function buscarPortfolio() {
      if (usuario?.tipo === "freelancer") {
        setCarregandoPortfolio(true);
        try {
          const resp = await api.get("/trabalhos/");
          const lista = resp.data.results || resp.data;
          const concluidos = lista.filter(
            (t) =>
              String(t.freelancer) === String(usuario.id) &&
              t.status === "concluido"
          );
          setPortfolio(concluidos);
        } catch {
          setPortfolio([]);
        } finally {
          setCarregandoPortfolio(false);
        }
      }
    }
    buscarPortfolio();
  }, [usuario]);

  if (carregando)
    return (
      <div style={{ textAlign: "center", marginTop: 60 }}>
        Carregando perfil...
      </div>
    );
  if (!usuario)
    return (
      <div style={{ textAlign: "center", marginTop: 60 }}>
        Perfil não encontrado.
      </div>
    );

  // 🔹 Avatar + badge
  const fotoPerfil =
    usuario.foto_perfil && !usuario.foto_perfil.startsWith("http")
      ? `http://localhost:8000${usuario.foto_perfil}`
      : usuario.foto_perfil || "/icone-usuario.png";

  const mostrarBadge =
    usuario.tipo === "freelancer" && notaMedia && notaMedia >= 4.5;

  return (
    <div className="perfil-publico-container">
      <div className="perfil-publico-box">
        {/* Avatar */}
        <div className="perfil-avatar-wrapper">
          <img src={fotoPerfil} alt="Foto de perfil" className="perfil-avatar" />
          {mostrarBadge && <div className="perfil-badge">TOP ★</div>}
        </div>

        {/* Botão dashboard */}
        <button className="btn-voltar" onClick={() => navigate("/dashboard")}>
          ← Dashboard
        </button>

        <h2 className="perfil-nome">{usuario.nome}</h2>
        <div className="perfil-tipo">
          {usuario.tipo === "freelancer" ? "Freelancer" : "Cliente"}
        </div>
        {typeof notaMedia !== "undefined" && (
          <div className="perfil-media">
            Média de avaliação:{" "}
            {notaMedia ? notaMedia.toFixed(2) + " / 5" : "Sem avaliações"}
          </div>
        )}

        {/* Habilidades */}
        {usuario.tipo === "freelancer" && (
          <div className="perfil-bloco">
            <h4>Habilidades</h4>
            {carregandoHabilidades ? (
              <p>Carregando habilidades...</p>
            ) : habilidades.length === 0 ? (
              <p className="perfil-vazio">Nenhuma habilidade encontrada ainda.</p>
            ) : (
              <div className="perfil-habilidades">
                {habilidades.map((hab, i) => (
                  <span key={hab + i} className="habilidade-tag">
                    {hab}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Trabalhos publicados */}
        {usuario.tipo === "cliente" && (
          <div className="perfil-bloco">
            <h4>Trabalhos Publicados</h4>
            {carregandoTrabalhos ? (
              <p>Carregando trabalhos...</p>
            ) : trabalhosPublicados.length === 0 ? (
              <p className="perfil-vazio">Nenhum trabalho publicado ainda.</p>
            ) : (
              <ul className="perfil-trabalhos-lista">
                {trabalhosPublicados.map((trab) => (
                  <li key={trab.id} className="perfil-trabalho-item">
                    <span>{trab.titulo}</span>{" "}
                    <span className={`status-${trab.status}`}>
                      [{trab.status}]
                    </span>
                    <button onClick={() => navigate(`/trabalhos/${trab.id}`)}>
                      Ver detalhes
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Portfólio freelancer */}
        {usuario.tipo === "freelancer" && (
          <div className="perfil-bloco">
            <h4>Portfólio: Trabalhos Concluídos</h4>
            {carregandoPortfolio ? (
              <p>Carregando portfólio...</p>
            ) : portfolio.length === 0 ? (
              <p className="perfil-vazio">Nenhum trabalho concluído ainda.</p>
            ) : (
              <ul className="perfil-portfolio-lista">
                {portfolio.map((trab) => (
                  <li key={trab.id} className="perfil-portfolio-item">
                    <span>{trab.titulo}</span>
                    <span className="status-concluido">[Concluído]</span>
                    <p>{trab.descricao}</p>
                    <small>
                      Orçamento: R$ {Number(trab.orcamento).toFixed(2)}
                    </small>
                    <button onClick={() => navigate(`/trabalhos/${trab.id}`)}>
                      Ver detalhes
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Avaliações */}
        <div className="perfil-bloco">
          <h4>Avaliações Recebidas</h4>
          {avaliacoes.length === 0 && (
            <p className="perfil-vazio">Nenhuma avaliação recebida ainda.</p>
          )}
          {avaliacoes.map((av) => (
            <div key={av.id} className="perfil-avaliacao">
              <div className="perfil-estrelas">
                {renderEstrelas(av.nota)}
                <span>{av.nota} / 5</span>
              </div>
              <p className="perfil-comentario">
                “{av.comentario || "Sem comentário"}”
              </p>
              <small>
                <strong>De:</strong> {av.avaliador?.nome || "Usuário"} |{" "}
                <strong>Data:</strong> {formatarDataBR(av.data_avaliacao)}
              </small>
            </div>
          ))}
        </div>

        {/* Ações finais */}
        {usuarioLogado && usuarioLogado.id !== usuario.id && (
          <div className="perfil-acoes">
            {usuario.tipo === "freelancer" &&
              usuarioLogado.tipo === "cliente" && (
                <button
                  className="btn-contratar"
                  onClick={() =>
                    navigate(`/trabalhos/novo?freelancer=${usuario.id}`)
                  }
                >
                  Contratar Freelancer
                </button>
              )}
            <button
              className="btn-denunciar"
              onClick={() =>
                navigate("/denuncias/cadastrar", {
                  state: { denunciado: usuario.id },
                })
              }
            >
              Denunciar Perfil
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
