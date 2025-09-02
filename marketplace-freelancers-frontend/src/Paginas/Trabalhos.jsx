import React, { useEffect, useState, useContext } from "react";
import api from "../Servicos/Api";
import { useNavigate } from "react-router-dom";
import { UsuarioContext } from "../Contextos/UsuarioContext";

const BASE_URL = "http://localhost:8000";

export default function Trabalhos() {
  const [trabalhos, setTrabalhos] = useState([]);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [habilidade, setHabilidade] = useState("");
  const [todasHabilidades, setTodasHabilidades] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [numPages, setNumPages] = useState(1);
  const navigate = useNavigate();

  const { usuarioLogado, carregando } = useContext(UsuarioContext);

  useEffect(() => {
    // 🔹 Buscar todas as habilidades no backend
    api.get("/habilidades/")
      .then(res => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          const habilidadesOrdenadas = res.data.sort((a, b) => a.nome.localeCompare(b.nome));
          setTodasHabilidades(habilidadesOrdenadas);
        } else {
          setTodasHabilidades([]);
        }
      })
      .catch(() => setTodasHabilidades([]));

    buscarTrabalhos({ page: 1 });
    // eslint-disable-next-line
  }, []);

  function buscarTrabalhos(filtros = {}) {
    let url = "/trabalhos/";
    let params = [];
    if (filtros.busca !== undefined && filtros.busca.trim() !== "")
      params.push(`busca=${encodeURIComponent(filtros.busca)}`);
    if (filtros.habilidade !== undefined && filtros.habilidade)
      params.push(`habilidade=${encodeURIComponent(filtros.habilidade)}`);
    params.push(`page=${filtros.page || page}`);
    params.push(`page_size=${pageSize}`);
    if (params.length > 0) url += `?${params.join("&")}`;

    api.get(url)
      .then((response) => {
        setTrabalhos(response.data.results || []);
        setPage(response.data.page || 1);
        setNumPages(response.data.num_pages || 1);
      })
      .catch(() => setErro("❌ Erro ao buscar trabalhos."));
  }

  function formatarData(dataStr) {
    if (!dataStr) return "";
    const [ano, mes, dia] = dataStr.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  function filtrar(e) {
    e.preventDefault();
    setPage(1);
    buscarTrabalhos({ busca, habilidade, page: 1 });
  }

  function limpar() {
    setBusca("");
    setHabilidade("");
    setPage(1);
    buscarTrabalhos({ page: 1 });
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
    return <div className="main-center"><div className="main-box">🔄 Carregando trabalhos...</div></div>;
  }

  if (!usuarioLogado) {
    return <div className="main-center"><div className="main-box error-msg">⚠️ Usuário não autenticado!</div></div>;
  }

  return (
    <div className="main-center">
      <div className="main-box" style={{ maxWidth: 900 }}>
        <h2>🛠️ Trabalhos Disponíveis</h2>

        {/* Filtros */}
        <form className="form-filtro" onSubmit={filtrar} style={{ marginBottom: 24 }}>
          <input
            type="text"
            placeholder="Buscar por título, descrição, etc."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{ minWidth: 190 }}
          />
          <select value={habilidade} onChange={e => setHabilidade(e.target.value)}>
            <option value="">Todas Habilidades</option>
            {todasHabilidades.length > 0 ? (
              todasHabilidades.map(hab => (
                <option key={hab.id} value={hab.nome}>
                  {hab.nome}
                </option>
              ))
            ) : (
              <option disabled>Nenhuma habilidade cadastrada</option>
            )}
          </select>
          <div className="btn-group-vertical">
            <button type="submit">Filtrar</button>
            <button type="button" onClick={limpar}>Limpar</button>
          </div>
        </form>

        {/* Criar trabalho */}
        {(usuarioLogado.tipo === "cliente" || usuarioLogado.is_superuser) && (
          <button
            className="btn-novo-trabalho"
            style={{ marginBottom: 24 }}
            onClick={() => navigate("/trabalhos/novo")}
          >
            ➕ Novo Trabalho
          </button>
        )}

        {erro && <div className="error-msg" style={{ marginBottom: 12 }}>{erro}</div>}

        {/* Lista */}
        {trabalhos.length === 0 ? (
          <div style={{ color: "#666", marginTop: 20 }}>Nenhum trabalho encontrado.</div>
        ) : (
          <ul className="lista-trabalhos">
            {trabalhos.map((trabalho) => (
              <li key={trabalho.id} className="trabalho-card">
                <div className="trabalho-card-conteudo">
                  <div className="trabalho-card-header">
                    <strong>{trabalho.titulo}</strong>
                  </div>
                  <div className="trabalho-card-info">
                    <div><b>Descrição:</b> {trabalho.descricao}</div>
                    <div><b>Prazo:</b> {formatarData(trabalho.prazo)}</div>
                    <div><b>Orçamento:</b> R$ {Number(trabalho.orcamento).toFixed(2)}</div>
                    <div><b>Status:</b> {trabalho.status}</div>
                    <div>
                      <b>Cliente:</b>{" "}
                      <span
                        style={{ color: "#1976d2", textDecoration: "underline", cursor: "pointer" }}
                        onClick={() => navigate(`/perfil/${trabalho.cliente_id}`)}
                      >
                        {trabalho.nome_cliente}
                      </span>
                    </div>
                    {trabalho.habilidades_detalhes?.length > 0 && (
                      <div>
                        <b>Habilidades:</b>{" "}
                        {trabalho.habilidades_detalhes.map(h => h.nome).join(", ")}
                      </div>
                    )}
                    {trabalho.anexo && (
                      <div>
                        <a
                          href={`${BASE_URL}${trabalho.anexo}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#1976d2" }}
                        >
                          📎 Ver Anexo
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Botão único */}
                  <div style={{ marginTop: 12 }}>
                    <button
                      className="btn-detalhes"
                      onClick={() => navigate(`/trabalhos/detalhes/${trabalho.id}`)}
                    >
                      Ver Detalhes
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Paginação */}
        {numPages > 1 && (
          <div className="pagination" style={{ marginTop: 18 }}>
            <button disabled={page <= 1} onClick={anterior}>⬅️ Anterior</button>
            <span style={{ margin: "0 14px" }}>Página {page} de {numPages}</span>
            <button disabled={page >= numPages} onClick={proxima}>Próxima ➡️</button>
          </div>
        )}
      </div>
    </div>
  );
}
