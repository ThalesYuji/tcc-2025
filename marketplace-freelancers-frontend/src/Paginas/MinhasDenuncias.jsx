import React, { useEffect, useState, useContext, useCallback, useMemo } from "react";
import api from "../Servicos/Api";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import { useNavigate } from "react-router-dom";
import "../styles/MinhasDenuncias.css";

export default function MinhasDenuncias() {
  const { usuarioLogado } = useContext(UsuarioContext);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [enviadas, setEnviadas] = useState([]);
  const [recebidas, setRecebidas] = useState([]);
  const [erro, setErro] = useState("");
  const [abaAtiva, setAbaAtiva] = useState("feitas");
  const [carregando, setCarregando] = useState(true);

  // Paginação
  const [nextEnviadas, setNextEnviadas] = useState(null);
  const [prevEnviadas, setPrevEnviadas] = useState(null);
  const [nextRecebidas, setNextRecebidas] = useState(null);
  const [prevRecebidas, setPrevRecebidas] = useState(null);

  const carregarEnviadas = useCallback(
    async (url = "/denuncias/?tipo=enviadas") => {
      const res = await api.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data;
      if (Array.isArray(data)) {
        setEnviadas(data);
        setNextEnviadas(null);
        setPrevEnviadas(null);
      } else {
        setEnviadas(data.results || []);
        setNextEnviadas(data.next);
        setPrevEnviadas(data.previous);
      }
    },
    [token]
  );

  const carregarRecebidas = useCallback(
    async (url = "/denuncias/?tipo=recebidas") => {
      const res = await api.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data;
      if (Array.isArray(data)) {
        setRecebidas(data);
        setNextRecebidas(null);
        setPrevRecebidas(null);
      } else {
        setRecebidas(data.results || []);
        setNextRecebidas(data.next);
        setPrevRecebidas(data.previous);
      }
    },
    [token]
  );

  useEffect(() => {
    async function fetchDenuncias() {
      try {
        setCarregando(true);
        setErro("");
        await Promise.all([carregarEnviadas(), carregarRecebidas()]);
      } catch (err) {
        console.error(err);
        setErro("Erro ao carregar suas denúncias. Tente novamente mais tarde.");
      } finally {
        setCarregando(false);
      }
    }

    if (usuarioLogado) {
      fetchDenuncias();
    }
  }, [usuarioLogado, carregarEnviadas, carregarRecebidas]);

  // Cálculos das estatísticas
  const estatisticas = useMemo(() => {
    return {
      totalEnviadas: enviadas.length,
      totalRecebidas: recebidas.length,
      pendentesEnviadas: enviadas.filter(d => d.status === "Pendente").length,
      pendentesRecebidas: recebidas.filter(d => d.status === "Pendente").length,
    };
  }, [enviadas, recebidas]);

  // Função para obter ícone do status
  const getStatusIcon = (status) => {
    const icons = {
      Pendente: "bi bi-clock",
      Analisando: "bi bi-search",
      Resolvida: "bi bi-check-circle"
    };
    return icons[status] || "bi bi-question-circle";
  };

  // Função para obter classe CSS do status
  const getStatusClass = (status) => {
    const classes = {
      Pendente: "warning",
      Analisando: "primary",
      Resolvida: "success"
    };
    return classes[status] || "secondary";
  };

  // Função para formatar data relativa
  const formatarDataRelativa = (dataString) => {
    const data = new Date(dataString);
    const agora = new Date();
    const diffDias = Math.floor((agora - data) / (1000 * 60 * 60 * 24));
    
    if (diffDias === 0) return 'Hoje';
    if (diffDias === 1) return 'Ontem';
    if (diffDias < 30) return `${diffDias} dias atrás`;
    if (diffDias < 365) return `${Math.floor(diffDias / 30)} meses atrás`;
    return `${Math.floor(diffDias / 365)} anos atrás`;
  };

  // Componente Badge
  const Badge = ({ status }) => {
    const cssClass = getStatusClass(status);
    return <span className={`denuncias-badge ${cssClass}`}>{status}</span>;
  };

  const denunciasAtivas = abaAtiva === "feitas" ? enviadas : recebidas;
  const nextPage = abaAtiva === "feitas" ? nextEnviadas : nextRecebidas;
  const prevPage = abaAtiva === "feitas" ? prevEnviadas : prevRecebidas;
  const carregarMais = abaAtiva === "feitas" ? carregarEnviadas : carregarRecebidas;

  if (carregando) {
    return (
      <div className="denuncias-container">
        <div className="denuncias-main">
          <div className="denuncias-content">
            <div className="denuncias-loading">
              <div className="loading-spinner"></div>
              <h3>Carregando denúncias</h3>
              <p>Buscando suas denúncias...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="denuncias-container">
      <div className="denuncias-main">
        
        {/* Header */}
        <div className="denuncias-header">
          <h1 className="denuncias-title">
            <div className="denuncias-icon">
              <i className="bi bi-shield-exclamation"></i>
            </div>
            Minhas Denúncias
          </h1>
          <p className="denuncias-subtitle">
            Acompanhe o status das denúncias feitas e recebidas
          </p>
        </div>

        {/* Mensagens de erro */}
        {erro && (
          <div className="denuncias-msg erro">
            <i className="bi bi-exclamation-circle"></i>
            {erro}
          </div>
        )}

        {/* Sistema de Abas */}
        <div className="denuncias-tabs-container">
          <div className="denuncias-tabs">
            <button
              onClick={() => setAbaAtiva("feitas")}
              className={`denuncias-tab ${abaAtiva === "feitas" ? "active" : ""}`}
            >
              <i className="bi bi-send tab-icon"></i>
              Denúncias Feitas
              {estatisticas.totalEnviadas > 0 && (
                <span className="tab-badge">{estatisticas.totalEnviadas}</span>
              )}
            </button>
            <button
              onClick={() => setAbaAtiva("recebidas")}
              className={`denuncias-tab ${abaAtiva === "recebidas" ? "active" : ""}`}
            >
              <i className="bi bi-inbox tab-icon"></i>
              Denúncias Recebidas
              {estatisticas.totalRecebidas > 0 && (
                <span className="tab-badge">{estatisticas.totalRecebidas}</span>
              )}
            </button>
          </div>
        </div>

        {/* Área de Conteúdo */}
        <div className="denuncias-content">
          
          {/* Header da Lista com Estatísticas */}
          {denunciasAtivas.length > 0 && (
            <div className="denuncias-header-list">
              <div className="denuncias-stats">
                <div className="stat-item">
                  <i className="bi bi-list-ul"></i>
                  <span>Total: <span className="stat-value">{denunciasAtivas.length}</span></span>
                </div>
                <div className="stat-item">
                  <i className="bi bi-clock"></i>
                  <span>Pendentes: <span className="stat-value">
                    {abaAtiva === "feitas" ? estatisticas.pendentesEnviadas : estatisticas.pendentesRecebidas}
                  </span></span>
                </div>
              </div>
            </div>
          )}

          {/* Lista de Denúncias */}
          {denunciasAtivas.length === 0 ? (
            <div className="denuncias-vazio">
              <i className={`bi ${abaAtiva === "feitas" ? "bi-send" : "bi-inbox"}`}></i>
              <h3>Nenhuma denúncia encontrada</h3>
              <p>
                {abaAtiva === "feitas"
                  ? "Você ainda não fez nenhuma denúncia. Se encontrar algum comportamento inadequado, não hesite em reportar."
                  : "Você ainda não recebeu nenhuma denúncia. Continue mantendo um comportamento profissional em seus projetos."}
              </p>
            </div>
          ) : (
            <>
              <div className="denuncias-lista">
                {denunciasAtivas.map((denuncia, index) => {
                  const usuario = abaAtiva === "feitas" 
                    ? denuncia.denunciado_detalhes
                    : denuncia.denunciante;
                  
                  const statusClass = getStatusClass(denuncia.status);
                  const statusIcon = getStatusIcon(denuncia.status);
                  
                  return (
                    <div key={denuncia.id} className="denuncia-item">
                      
                      {/* Ícone de Status */}
                      <div className={`denuncia-icone ${statusClass}`}>
                        <i className={statusIcon}></i>
                      </div>

                      {/* Informações Principais */}
                      <div className="denuncia-info">
                        <div 
                          className="denuncia-contrato"
                          title={denuncia.contrato_titulo || denuncia.contrato?.titulo}
                        >
                          {denuncia.contrato_titulo || denuncia.contrato?.titulo || "Contrato não especificado"}
                        </div>
                        
                        {usuario && (
                          <button
                            className="denuncia-usuario"
                            onClick={() => navigate(`/perfil/${usuario.id}`)}
                          >
                            <i className="bi bi-person"></i>
                            {usuario.nome}
                          </button>
                        )}
                        
                        <p className="denuncia-motivo">
                          {denuncia.motivo?.trim() || "Motivo não especificado"}
                        </p>
                        
                        {/* Resposta do Admin */}
                        <div className={`denuncia-resposta ${!denuncia.resposta_admin ? 'vazia' : ''}`}>
                          {denuncia.resposta_admin ? (
                            <>
                              <strong>Resposta da administração:</strong><br />
                              {denuncia.resposta_admin}
                            </>
                          ) : (
                            "Aguardando resposta da administração"
                          )}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="denuncia-status">
                        <Badge status={denuncia.status} />
                      </div>

                      {/* Data */}
                      <div className="denuncia-data">
                        <div className="data-principal">
                          {denuncia.data_criacao
                            ? new Date(denuncia.data_criacao).toLocaleDateString("pt-BR")
                            : "—"}
                        </div>
                        <div className="data-relativa">
                          {denuncia.data_criacao && formatarDataRelativa(denuncia.data_criacao)}
                        </div>
                      </div>

                      {/* Tipo */}
                      <div className={`denuncia-tipo ${abaAtiva}`}>
                        {abaAtiva === "feitas" ? "Feita" : "Recebida"}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Paginação */}
              {(prevPage || nextPage) && (
                <div className="paginacao">
                  {prevPage && (
                    <button
                      onClick={() => carregarMais(prevPage)}
                      className="btn-paginacao"
                    >
                      <i className="bi bi-chevron-left"></i>
                      Anterior
                    </button>
                  )}
                  {nextPage && (
                    <button
                      onClick={() => carregarMais(nextPage)}
                      className="btn-paginacao"
                    >
                      Próxima
                      <i className="bi bi-chevron-right"></i>
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}