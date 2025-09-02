// src/Paginas/HomeInicial.jsx
import React, { useContext, useEffect, useState } from "react";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import api from "../Servicos/Api";
import { Link } from "react-router-dom";
import "../App.css";

export default function HomeInicial() {
  const { usuarioLogado } = useContext(UsuarioContext);
  const [oportunidades, setOportunidades] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        if (usuarioLogado?.tipo === "freelancer") {
          const res = await api.get("/trabalhos/?page=1&page_size=6");
          setOportunidades(res.data.results || []);
        } else if (usuarioLogado?.tipo === "cliente") {
          const res = await api.get("/usuarios/?tipo=freelancer&page_size=6");
          setOportunidades(res.data.results || []);
        }
      } catch (err) {
        setErro("Erro ao carregar oportunidades.");
      } finally {
        setCarregando(false);
      }
    }

    if (usuarioLogado) fetchData();
  }, [usuarioLogado]);

  if (carregando) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status"></div>
        <span className="ms-2">Carregando...</span>
      </div>
    );
  }

  if (!usuarioLogado) {
    return (
      <div className="container text-center mt-5">
        <p className="alert alert-danger">⚠️ Usuário não autenticado!</p>
      </div>
    );
  }

  return (
    <div className="home-wrapper container py-5">
      {/* 🔹 Banner de boas-vindas */}
      <div className="welcome-banner text-white mb-5 rounded shadow-sm p-4 text-center">
        <h2 className="fw-bold">
          👋 Bem-vindo, {usuarioLogado.nome || usuarioLogado.username}!
        </h2>
        <p className="lead mb-0">
          {usuarioLogado.tipo === "freelancer"
            ? "Explore novos trabalhos e oportunidades personalizadas para você."
            : "Encontre freelancers ideais para os seus projetos."}
        </p>
      </div>

      {/* 🔹 Atalhos principais */}
      <div className="row g-4 mb-5">
        {usuarioLogado.tipo === "cliente" && (
          <div className="col-md-3 col-6">
            <Link to="/trabalhos/novo" className="shortcut-tile bg-primary">
              <i className="bi bi-megaphone"></i>
              <span>Publicar</span>
            </Link>
          </div>
        )}
        {usuarioLogado.tipo === "freelancer" && (
          <div className="col-md-3 col-6">
            <Link to="/trabalhos" className="shortcut-tile bg-success">
              <i className="bi bi-search"></i>
              <span>Trabalhos</span>
            </Link>
          </div>
        )}
        <div className="col-md-3 col-6">
          <Link to="/propostas" className="shortcut-tile bg-warning text-dark">
            <i className="bi bi-file-earmark-text"></i>
            <span>Propostas</span>
          </Link>
        </div>
        <div className="col-md-3 col-6">
          <Link to="/contratos" className="shortcut-tile bg-info text-dark">
            <i className="bi bi-file-earmark-check"></i>
            <span>Contratos</span>
          </Link>
        </div>
        <div className="col-md-3 col-6">
          <Link to="/notificacoes" className="shortcut-tile bg-dark">
            <i className="bi bi-bell"></i>
            <span>Notificações</span>
          </Link>
        </div>
      </div>

      {/* 🔹 Oportunidades */}
      <div>
        <h4 className="fw-semibold mb-4">
          {usuarioLogado.tipo === "freelancer"
            ? "✨ Trabalhos Recentes"
            : "✨ Freelancers Recomendados"}
        </h4>

        {erro && <p className="text-danger">{erro}</p>}

        {oportunidades.length === 0 ? (
          <p className="text-muted">Nenhuma oportunidade encontrada.</p>
        ) : (
          <div className="row g-4">
            {usuarioLogado.tipo === "freelancer"
              ? oportunidades.map((t) => (
                  <div key={t.id} className="col-md-4">
                    <div className="card opp-card h-100">
                      <div className="card-body d-flex flex-column">
                        <h5 className="card-title">{t.titulo}</h5>
                        <p className="card-text flex-grow-1">
                          {t.descricao?.length > 100
                            ? t.descricao.slice(0, 100) + "..."
                            : t.descricao}
                        </p>
                        <Link
                          to={`/trabalhos/detalhes/${t.id}`}
                          className="btn btn-primary mt-auto"
                        >
                          Ver Detalhes
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              : oportunidades.map((f) => (
                  <div key={f.id} className="col-md-4">
                    <div className="card opp-card h-100 text-center">
                      <div className="card-body d-flex flex-column">
                        <i className="bi bi-person-circle fs-1 text-secondary mb-3"></i>
                        <h5 className="card-title">{f.nome || f.username}</h5>
                        <p className="card-text flex-grow-1">
                          {f.habilidades?.map((h) => h.nome).join(", ") ||
                            "Sem habilidades cadastradas"}
                        </p>
                        <Link
                          to={`/perfil/${f.id}`}
                          className="btn btn-success mt-auto"
                        >
                          Ver Perfil
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
          </div>
        )}
      </div>
    </div>
  );
}
