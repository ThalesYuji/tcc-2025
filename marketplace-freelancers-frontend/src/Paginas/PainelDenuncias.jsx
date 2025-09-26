// src/Paginas/PainelDenuncias.jsx - Redesign Aprimorado
import React, { useEffect, useState } from "react";
import api from "../Servicos/Api";
import ModalRespostaDenuncia from "../Componentes/ModalRespostaDenuncia";
import "../styles/PainelDenuncias.css";

function Badge({ status }) {
  const map = {
    Pendente: "badge-warning",
    Analisando: "badge-primary", 
    Resolvida: "badge-success",
  };
  const cls = map[status] ?? "badge-secondary";
  
  const icons = {
    Pendente: "bi bi-clock",
    Analisando: "bi bi-search",
    Resolvida: "bi bi-check-circle"
  };
  const icon = icons[status] ?? "bi bi-question-circle";
  
  return (
    <span className={`badge ${cls}`}>
      <i className={icon}></i>
      {status}
    </span>
  );
}

function FilterTabs({ filtroAtivo, onFiltroChange, estatisticas }) {
  const filtros = [
    { key: "Todos", label: "Todos", count: estatisticas.total },
    { key: "Pendente", label: "Pendentes", count: estatisticas.pendentes },
    { key: "Analisando", label: "Analisando", count: estatisticas.analisando },
    { key: "Resolvida", label: "Resolvidas", count: estatisticas.resolvidas }
  ];

  return (
    <div className="filtros-tabs">
      {filtros.map((filtro) => (
        <button
          key={filtro.key}
          className={`filtro-tab ${filtroAtivo === filtro.key ? 'ativo' : ''}`}
          onClick={() => onFiltroChange(filtro.key)}
        >
          <span className="filtro-label">{filtro.label}</span>
          <span className="filtro-count">{filtro.count}</span>
        </button>
      ))}
    </div>
  );
}

function SearchBar({ searchTerm, onSearchChange, placeholder = "Buscar por contrato, usuário..." }) {
  return (
    <div className="search-bar">
      <i className="bi bi-search search-icon"></i>
      <input
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="search-input"
      />
      {searchTerm && (
        <button
          className="search-clear"
          onClick={() => onSearchChange('')}
        >
          <i className="bi bi-x"></i>
        </button>
      )}
    </div>
  );
}

function ActionButtons({ onRefresh, carregando }) {
  return (
    <div className="action-buttons">
      <button
        className="btn-action btn-refresh"
        onClick={onRefresh}
        disabled={carregando}
        title="Atualizar dados"
      >
        <i className={`bi bi-arrow-clockwise ${carregando ? 'rotating' : ''}`}></i>
        Atualizar
      </button>
    </div>
  );
}

export default function PainelDenuncias() {
  const [denuncias, setDenuncias] = useState([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [denunciaSelecionada, setDenunciaSelecionada] = useState(null);
  
  // Novos estados para filtros e busca
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [searchTerm, setSearchTerm] = useState("");

  // Paginação - Padrão do projeto
  const [page, setPage] = useState(1);
  const [pageSize] = useState(6);
  const [numPages, setNumPages] = useState(1);

  async function carregarDenuncias(pageNum = 1) {
    setCarregando(true);
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/denuncias/", {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: pageNum,
          page_size: pageSize,
        },
      });

      const data = res.data;

      if (Array.isArray(data)) {
        setDenuncias(data);
        setPage(1);
        setNumPages(1);
      } else {
        setDenuncias(data.results || []);
        setPage(pageNum);
        setNumPages(Math.ceil(data.count / pageSize));
      }

      setErro("");
    } catch (e) {
      console.error("Erro ao carregar denúncias:", e);
      setErro("Erro ao carregar denúncias. Tente novamente mais tarde.");
      setDenuncias([]);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDenuncias();
  }, []);

  const abrirModal = (denuncia) => {
    setDenunciaSelecionada(denuncia);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setDenunciaSelecionada(null);
  };

  const atualizarDenuncia = (denunciaAtualizada) => {
    setDenuncias((prev) =>
      prev.map((d) => (d.id === denunciaAtualizada.id ? denunciaAtualizada : d))
    );
  };

  // Funções de paginação
  const anterior = () => {
    if (page > 1) {
      carregarDenuncias(page - 1);
    }
  };

  const proxima = () => {
    if (page < numPages) {
      carregarDenuncias(page + 1);
    }
  };

  // Filtros e busca
  const denunciasFiltradas = denuncias.filter((denuncia) => {
    const matchStatus = filtroStatus === "Todos" || denuncia.status === filtroStatus;
    const matchSearch = !searchTerm || 
      denuncia.contrato_titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      denuncia.denunciante?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      denuncia.denunciado_detalhes?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      denuncia.motivo?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchStatus && matchSearch;
  });

  // Estatísticas
  const estatisticas = {
    total: denuncias.length,
    pendentes: denuncias.filter((d) => d.status === "Pendente").length,
    analisando: denuncias.filter((d) => d.status === "Analisando").length,
    resolvidas: denuncias.filter((d) => d.status === "Resolvida").length,
  };

  // Função para obter classe do card baseada no status
  const getCardStatusClass = (status) => {
    return status.toLowerCase().replace(' ', '-');
  };

  // Loading state
  if (carregando) {
    return (
      <div className="denuncias-container">
        <div className="denuncias-main">
          <div className="denuncias-content">
            <div className="denuncias-loading">
              <div className="loading-spinner"></div>
              <h3>Carregando denúncias</h3>
              <p>Buscando denúncias do sistema...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="denuncias-container admin-denuncias">
      <div className="denuncias-main">
        
        {/* Header */}
        <div className="denuncias-header">
          <h1 className="denuncias-title">
            <div className="denuncias-icon">
              <i className="bi bi-shield-exclamation"></i>
            </div>
            Painel de Denúncias
          </h1>
          <p className="denuncias-subtitle">
            Gerencie e responda às denúncias reportadas pelos usuários
          </p>
        </div>

        {/* Mensagens de erro */}
        {erro && (
          <div className="erro-msg">
            <i className="bi bi-exclamation-circle"></i>
            {erro}
          </div>
        )}

        {/* Estatísticas Dashboard */}
        <div className="estatisticas-denuncias">
          <div className="estatistica-card total">
            <div className="card-icon">
              <i className="bi bi-list-ul"></i>
            </div>
            <strong>{estatisticas.total}</strong>
            <span>Total</span>
          </div>
          <div className="estatistica-card pendentes">
            <div className="card-icon">
              <i className="bi bi-clock"></i>
            </div>
            <strong>{estatisticas.pendentes}</strong>
            <span>Pendentes</span>
          </div>
          <div className="estatistica-card analisando">
            <div className="card-icon">
              <i className="bi bi-search"></i>
            </div>
            <strong>{estatisticas.analisando}</strong>
            <span>Analisando</span>
          </div>
          <div className="estatistica-card resolvidas">
            <div className="card-icon">
              <i className="bi bi-check-circle"></i>
            </div>
            <strong>{estatisticas.resolvidas}</strong>
            <span>Resolvidas</span>
          </div>
        </div>

        {/* Controles e Filtros */}
        <div className="controles-denuncias">
          <div className="controles-left">
            <FilterTabs
              filtroAtivo={filtroStatus}
              onFiltroChange={setFiltroStatus}
              estatisticas={estatisticas}
            />
          </div>
          <div className="controles-right">
            <SearchBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />
            <ActionButtons
              onRefresh={() => carregarDenuncias(page)}
              carregando={carregando}
            />
          </div>
        </div>

        {/* Resultados da busca/filtro */}
        {(searchTerm || filtroStatus !== "Todos") && (
          <div className="filtro-resultado">
            <p>
              <strong>{denunciasFiltradas.length}</strong> de <strong>{denuncias.length}</strong> denúncias
              {searchTerm && <span> • Busca: "{searchTerm}"</span>}
              {filtroStatus !== "Todos" && <span> • Status: {filtroStatus}</span>}
            </p>
            {(searchTerm || filtroStatus !== "Todos") && (
              <button
                className="btn-limpar-filtros"
                onClick={() => {
                  setSearchTerm("");
                  setFiltroStatus("Todos");
                }}
              >
                <i className="bi bi-x"></i>
                Limpar filtros
              </button>
            )}
          </div>
        )}

        {/* Área de Conteúdo */}
        <div className="denuncias-content">
          {denunciasFiltradas.length === 0 ? (
            <div className="empty-state">
              {searchTerm || filtroStatus !== "Todos" ? (
                <>
                  <i className="bi bi-search"></i>
                  <h3>Nenhuma denúncia encontrada</h3>
                  <p>Não encontramos denúncias que correspondam aos seus filtros.</p>
                  <button
                    className="btn-limpar-filtros-empty"
                    onClick={() => {
                      setSearchTerm("");
                      setFiltroStatus("Todos");
                    }}
                  >
                    Limpar filtros e ver todas
                  </button>
                </>
              ) : (
                <>
                  <i className="bi bi-shield-check"></i>
                  <h3>Nenhuma denúncia encontrada</h3>
                  <p>Quando usuários fizerem denúncias, elas aparecerão aqui.</p>
                  <p>Um painel vazio significa que o sistema está funcionando bem!</p>
                </>
              )}
            </div>
          ) : (
            <div className="denuncias-grid">
              {denunciasFiltradas.map((denuncia) => {
                const data = denuncia.data_criacao
                  ? new Date(denuncia.data_criacao).toLocaleDateString("pt-BR")
                  : "—";
                
                const statusClass = getCardStatusClass(denuncia.status);

                return (
                  <div key={denuncia.id} className={`denuncia-card-admin ${statusClass}`}>
                    
                    {/* Header do Card */}
                    <div className="denuncia-header">
                      <h4>
                        <i className="bi bi-exclamation-triangle"></i>
                        Denúncia #{denuncia.id}
                      </h4>
                      <Badge status={denuncia.status} />
                    </div>

                    {/* Informações da Denúncia */}
                    <div className="denuncia-info">
                      <p>
                        <strong>Contrato</strong>
                        {denuncia.contrato_titulo || denuncia.contrato?.titulo || "Não especificado"}
                      </p>
                      
                      <p>
                        <strong>Data da Denúncia</strong>
                        {data}
                      </p>
                      
                      <p>
                        <strong>Denunciante</strong>
                        <span className="user-name denunciante">
                          {denuncia.denunciante?.nome || "Usuário não identificado"}
                        </span>
                      </p>
                      
                      <p>
                        <strong>Denunciado</strong>
                        <span className="user-name denunciado">
                          {denuncia.denunciado_detalhes?.nome || 
                           denuncia.denunciado?.nome || 
                           "Usuário não identificado"}
                        </span>
                      </p>
                      
                      <p>
                        <strong>Motivo</strong>
                        {denuncia.motivo?.trim() || "Motivo não especificado"}
                      </p>

                      {/* Provas */}
                      {denuncia.provas && denuncia.provas.length > 0 && (
                        <div className="denuncia-provas">
                          <strong>Provas Anexadas ({denuncia.provas.length})</strong>
                          <ul>
                            {denuncia.provas.map((prova, index) => (
                              <li key={prova.id}>
                                <a
                                  href={prova.arquivo}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Arquivo {index + 1}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Resposta do Admin */}
                      {denuncia.resposta_admin && (
                        <div className="resposta-admin">
                          <strong>Resposta da Administração</strong>
                          <p>{denuncia.resposta_admin}</p>
                        </div>
                      )}
                    </div>

                    {/* Botões de Ação */}
                    <div className="denuncia-actions">
                      <button
                        className="btn-responder"
                        onClick={() => abrirModal(denuncia)}
                      >
                        <i className={denuncia.resposta_admin ? "bi bi-pencil" : "bi bi-chat-dots"}></i>
                        {denuncia.resposta_admin ? "Editar Resposta" : "Responder Denúncia"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Paginação */}
        {numPages > 1 && (
          <div className="trabalhos-pagination">
            <button
              className="pagination-btn"
              disabled={page <= 1}
              onClick={anterior}
            >
              <i className="bi bi-chevron-left"></i>
              Anterior
            </button>
           
            <div className="pagination-info">
              Página <strong>{page}</strong> de <strong>{numPages}</strong>
            </div>
           
            <button
              className="pagination-btn"
              disabled={page >= numPages}
              onClick={proxima}
            >
              Próxima
              <i className="bi bi-chevron-right"></i>
            </button>
          </div>
        )}

        {/* Modal de Resposta */}
        {modalAberto && denunciaSelecionada && (
          <ModalRespostaDenuncia
            denuncia={denunciaSelecionada}
            onClose={fecharModal}
            onAtualizar={atualizarDenuncia}
          />
        )}
      </div>
    </div>
  );
}