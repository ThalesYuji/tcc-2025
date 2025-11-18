// src/Paginas/Trabalhos.jsx
import React, { useEffect, useState, useContext } from "react";
import api from "../Servicos/Api";
import { useNavigate } from "react-router-dom";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import "../styles/Trabalhos.css";

export default function Trabalhos() {
  const [trabalhos, setTrabalhos] = useState([]);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [habilidade, setHabilidade] = useState("");
  const [todasHabilidades, setTodasHabilidades] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(6);
  const [numPages, setNumPages] = useState(1);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const navigate = useNavigate();

  const { usuarioLogado, carregando } = useContext(UsuarioContext);

  useEffect(() => {
    api
      .get("/habilidades/")
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          const habilidadesOrdenadas = res.data.sort((a, b) =>
            a.nome.localeCompare(b.nome)
          );
          setTodasHabilidades(habilidadesOrdenadas);
        } else {
          setTodasHabilidades([]);
        }
      })
      .catch(() => setTodasHabilidades([]));

    buscarTrabalhos({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buscarTrabalhos(filtros = {}) {
    setLoadingGrid(true);
    let url = "/trabalhos/";
    const params = [];
    if (filtros.busca?.trim())
      params.push(`busca=${encodeURIComponent(filtros.busca)}`);
    if (filtros.habilidade)
      params.push(`habilidade=${encodeURIComponent(filtros.habilidade)}`);
    params.push(`page=${filtros.page || page}`);
    params.push(`page_size=${pageSize}`);
    if (params.length > 0) url += `?${params.join("&")}`;

    api
      .get(url)
      .then((response) => {
        setTrabalhos(response.data.results || []);
        setPage(response.data.page || 1);
        setNumPages(response.data.num_pages || 1);
        setErro("");
      })
      .catch(() => setErro("Erro ao buscar trabalhos."))
      .finally(() => setLoadingGrid(false));
  }

  function formatarData(dataStr) {
    if (!dataStr) return "Não definido";
    // espera "YYYY-MM-DD"
    const [ano, mes, dia] = String(dataStr).split("-");
    if (!ano || !mes || !dia) return dataStr;
    return `${dia}/${mes}/${ano}`;
  }

  function formatarOrcamento(valor) {
    const n = Number(valor || 0);
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(n);
  }

  function getStatusClass(status) {
    switch ((status || "").toLowerCase()) {
      case "concluido":
      case "concluído":
        return "status-concluido"; // verde
      case "cancelado":
      case "recusado":
        return "status-recusado"; // vermelho
      case "aberto":
        return "status-aberto"; // azul
      case "aguardando_aceitacao":
      case "aguardando aceitação":
        return "status-aguardando"; // amarelo
      case "em_andamento":
      case "em andamento":
      case "andamento":
      default:
        return "status-em-andamento"; // laranja
    }
  }

  function getStatusIcon(status) {
    switch ((status || "").toLowerCase()) {
      case "concluido":
      case "concluído":
        return "bi-check-circle-fill";
      case "cancelado":
      case "recusado":
        return "bi-x-circle-fill";
      case "aberto":
        return "bi-circle";
      case "aguardando_aceitacao":
      case "aguardando aceitação":
        return "bi-hourglass-split";
      case "em_andamento":
      case "em andamento":
      case "andamento":
      default:
        return "bi-clock-fill";
    }
  }

  // respeita visibilidade do backend
  function podeVerTrabalhoPrivado(trabalho) {
    if (!trabalho?.is_privado) return true;
    if (!usuarioLogado) return false;
    if (usuarioLogado.is_superuser) return true;
    if (trabalho.contratante_id === usuarioLogado.id) return true;
    if (trabalho.freelancer === usuarioLogado.id) return true; // serializer expõe id no campo "freelancer"
    return false;
  }

  function filtrar(e) {
    e.preventDefault();
    const first = 1;
    setPage(first);
    buscarTrabalhos({ busca, habilidade, page: first });
  }

  function limpar() {
    setBusca("");
    setHabilidade("");
    const first = 1;
    setPage(first);
    buscarTrabalhos({ page: first });
  }

  function anterior() {
    if (page > 1) {
      const newPage = page - 1;
      setPage(newPage);
      buscarTrabalhos({ busca, habilidade, page: newPage });
    }
  }

  function proxima() {
    if (page < numPages) {
      const newPage = page + 1;
      setPage(newPage);
      buscarTrabalhos({ busca, habilidade, page: newPage });
    }
  }

  if (carregando) {
    return (
      <div className="trabalhos-page page-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h3 style={{ color: "var(--cor-texto-light)" }}>
            Carregando trabalhos...
          </h3>
          <p style={{ color: "var(--cor-texto-light)", textAlign: "center" }}>
            Buscando as melhores oportunidades para você
          </p>
        </div>
      </div>
    );
  }

  if (!usuarioLogado) {
    return (
      <div className="trabalhos-page page-container">
        <div className="dashboard-error">
          <div className="error-icon">⚠️</div>
          <h3 className="error-title">Acesso Negado</h3>
          <p className="error-message">
            Você precisa estar autenticado para ver os trabalhos.
          </p>
        </div>
      </div>
    );
  }

  const trabalhosVisiveis = trabalhos.filter(podeVerTrabalhoPrivado);

  return (
    <div className="trabalhos-page page-container fade-in">
      <div className="trabalhos-header">
        <h1 className="trabalhos-title">
          <div className="trabalhos-title-icon">
            <i className="bi bi-briefcase"></i>
          </div>
        Trabalhos Disponíveis
        </h1>
        <p className="trabalhos-subtitle">
          Encontre oportunidades incríveis ou publique novos projetos com
          segurança
        </p>
      </div>

      <div className="filtros-container">
        <form className="filtros-form" onSubmit={filtrar}>
          <div className="filtros-linha-principal">
            <div className="filtro-group filtro-busca">
              <label className="filtro-label">Buscar trabalhos</label>
              <div className="filtro-input-wrapper">
                <i className="bi bi-search filtro-icon"></i>
                <input
                  type="text"
                  className="filtro-input"
                  placeholder="Buscar por título ou descrição..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
            </div>

            <div className="filtro-group filtro-habilidade">
              <label className="filtro-label">Filtrar por habilidade</label>
              <select
                className="filtro-select"
                value={habilidade}
                onChange={(e) => setHabilidade(e.target.value)}
              >
                <option value="">Todas as habilidades</option>
                {todasHabilidades.length > 0 ? (
                  todasHabilidades.map((hab) => (
                    <option key={hab.id} value={hab.nome}>
                      {hab.nome}
                    </option>
                  ))
                ) : (
                  <option disabled>Nenhuma habilidade cadastrada</option>
                )}
              </select>
            </div>
          </div>

          <div className="filtros-botoes">
            <button type="submit" className="btn-filtrar" disabled={loadingGrid}>
              <i className="bi bi-search"></i>
              {loadingGrid ? "Filtrando..." : "Filtrar"}
            </button>

            <button
              type="button"
              className="btn-limpar"
              onClick={limpar}
              disabled={loadingGrid}
            >
              <i className="bi bi-eraser-fill"></i>
              Limpar
            </button>

            {(usuarioLogado.tipo === "contratante" || usuarioLogado.is_superuser) && (
              <button
                type="button"
                className="btn-novo-trabalho"
                onClick={() => navigate("/trabalhos/novo")}
              >
                <i className="bi bi-plus-circle"></i>
                Novo Trabalho
              </button>
            )}
          </div>
        </form>
      </div>

      {erro && (
        <div className="dashboard-error">
          <div className="error-icon">❌</div>
          <h3 className="error-title">Erro ao Carregar</h3>
          <p className="error-message">{erro}</p>
          <button
            className="btn gradient-btn"
            onClick={() => buscarTrabalhos({ busca, habilidade, page })}
          >
            <i className="bi bi-arrow-clockwise"></i>
            Tentar Novamente
          </button>
        </div>
      )}

      {!erro && loadingGrid && (
        <div className="trabalhos-loading-inline">
          <div className="loading-spinner small"></div>
          <span>Atualizando lista…</span>
        </div>
      )}

      {trabalhosVisiveis.length === 0 && !erro && !loadingGrid ? (
        <div className="trabalhos-empty">
          <div className="empty-icon">
            <i className="bi bi-briefcase"></i>
          </div>
          <h3 className="empty-title">Nenhum trabalho encontrado</h3>
          <p className="empty-description">
            {busca || habilidade
              ? "Tente ajustar os filtros para encontrar mais oportunidades."
              : "Não há trabalhos disponíveis no momento. Volte em breve!"}
          </p>
          {(busca || habilidade) && (
            <button className="btn gradient-btn" onClick={limpar}>
              <i className="bi bi-arrow-clockwise"></i>
              Limpar Filtros
            </button>
          )}
        </div>
      ) : (
        <div className="trabalhos-grid">
          {trabalhosVisiveis.map((trabalho) => (
            <div key={trabalho.id} className="trabalho-card modern-card">
              <div className="trabalho-header">
                <div className="trabalho-titulo-container">
                  <h3 className="trabalho-titulo">
                    <i className="bi bi-briefcase"></i>
                    {trabalho.titulo}
                  </h3>
                </div>
                <div className={`trabalho-status ${getStatusClass(trabalho.status)}`}>
                  <i className={`bi ${getStatusIcon(trabalho.status)}`}></i>
                  {trabalho.status}
                </div>
              </div>

              <div className="trabalho-body">
                <p className="trabalho-descricao">
                  {trabalho.descricao || "Sem descrição disponível."}
                </p>

                <div className="trabalho-info-item">
                  <i className="bi bi-calendar-event trabalho-info-icon"></i>
                  <span>Prazo: </span>
                  <span className="trabalho-info-value">
                    {formatarData(trabalho.prazo)}
                  </span>
                </div>

                <div className="trabalho-info-item">
                  <i className="bi bi-currency-dollar trabalho-info-icon"></i>
                  <span>Orçamento: </span>
                  <span className="trabalho-info-value trabalho-orcamento">
                    {formatarOrcamento(trabalho.orcamento)}
                  </span>
                </div>

                <div className="trabalho-info-item">
                  <i className="bi bi-person trabalho-info-icon"></i>
                  <span>Contratante: </span>
                  <span
                    className="trabalho-info-value trabalho-cliente"
                    onClick={() =>
                      trabalho.contratante_id && navigate(`/perfil/${trabalho.contratante_id}`)
                    }
                    role="button"
                  >
                    {trabalho.nome_contratante || "—"}
                  </span>
                </div>

                {trabalho.is_privado && (
                  <div className="badge-privado-card">
                    <i className="bi bi-lock-fill"></i>
                    Trabalho Privado
                  </div>
                )}

                {Array.isArray(trabalho.habilidades_detalhes) &&
                  trabalho.habilidades_detalhes.length > 0 && (
                    <div>
                      <div className="trabalho-info-item">
                        <i className="bi bi-tools trabalho-info-icon"></i>
                        <span>Habilidades necessárias:</span>
                      </div>
                      <div className="trabalho-habilidades">
                        {trabalho.habilidades_detalhes.map((hab) => (
                          <span key={hab.id || hab.nome} className="habilidade-tag">
                            {hab.nome}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                {trabalho.anexo_url && trabalho.anexo_url !== "null" && (
                  <div className="trabalho-info-item">
                    <i className="bi bi-paperclip trabalho-info-icon"></i>
                    <a
                      href={trabalho.anexo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="trabalho-anexo"
                    >
                      <i className="bi bi-download"></i>
                      Ver Anexo
                    </a>
                  </div>
                )}
              </div>

              <div className="trabalho-footer">
                <button
                  className="btn-ver-detalhes"
                  onClick={() => navigate(`/trabalhos/detalhes/${trabalho.id}`)}
                >
                  <i className="bi bi-eye"></i>
                  Ver Detalhes Completos
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {numPages > 1 && (
        <div className="trabalhos-pagination">
          <button className="pagination-btn" disabled={page <= 1} onClick={anterior}>
            <i className="bi bi-chevron-left"></i>
            Anterior
          </button>

          <div className="pagination-info">
            Página <strong>{page}</strong> de <strong>{numPages}</strong>
          </div>

          <button className="pagination-btn" disabled={page >= numPages} onClick={proxima}>
            Próxima
            <i className="bi bi-chevron-right"></i>
          </button>
        </div>
      )}
    </div>
  );
}
