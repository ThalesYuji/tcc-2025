// src/Paginas/Trabalhos.jsx
import React, { useEffect, useState, useContext } from "react";
import api from "../Servicos/Api";
import { useNavigate } from "react-router-dom";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import "../styles/Trabalhos.css";

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

  // 🔹 Buscar habilidades e trabalhos na primeira carga
  useEffect(() => {
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

  // 🔹 Buscar trabalhos com filtros
  function buscarTrabalhos(filtros = {}) {
    let url = "/trabalhos/";
    let params = [];
    if (filtros.busca?.trim()) params.push(`busca=${encodeURIComponent(filtros.busca)}`);
    if (filtros.habilidade) params.push(`habilidade=${encodeURIComponent(filtros.habilidade)}`);
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

  // 🔹 Formata data no padrão BR
  function formatarData(dataStr) {
    if (!dataStr) return "";
    const [ano, mes, dia] = dataStr.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  // 🔹 Filtros
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

  // 🔹 Paginação
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

  // 🔹 Renderizações condicionais
  if (carregando) {
    return (
      <div className="main-center">
        <div className="main-box">🔄 Carregando trabalhos...</div>
      </div>
    );
  }

  if (!usuarioLogado) {
    return (
      <div className="main-center">
        <div className="main-box error-msg">⚠️ Usuário não autenticado!</div>
      </div>
    );
  }

  return (
    <div className="main-center">
      <div className="main-box trabalhos-box">
        <h2 className="trabalhos-title">🛠️ Trabalhos Disponíveis</h2>

        {/* Filtros */}
        <form className="form-filtro" onSubmit={filtrar}>
          <input
            type="text"
            placeholder="Buscar por título, descrição, etc."
            value={busca}
            onChange={e => setBusca(e.target.value)}
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
            onClick={() => navigate("/trabalhos/novo")}
          >
            ➕ Novo Trabalho
          </button>
        )}

        {erro && <div className="error-msg">{erro}</div>}

        {/* Lista */}
        {trabalhos.length === 0 ? (
          <div className="nenhum-registro">Nenhum trabalho encontrado.</div>
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
                        className="link-cliente"
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
                          className="link-anexo"
                        >
                          📎 Ver Anexo
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="btn-detalhes-container">
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
          <div className="pagination">
            <button disabled={page <= 1} onClick={anterior}>⬅️ Anterior</button>
            <span>Página {page} de {numPages}</span>
            <button disabled={page >= numPages} onClick={proxima}>Próxima ➡️</button>
          </div>
        )}
      </div>
    </div>
  );
}
