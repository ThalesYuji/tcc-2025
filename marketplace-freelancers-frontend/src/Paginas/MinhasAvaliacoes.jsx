import React, { useEffect, useState, useContext, useMemo } from "react";
import api from "../Servicos/Api";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import { useNavigate } from "react-router-dom";
import "../styles/MinhasAvaliacoes.css";

export default function MinhasAvaliacoes() {
  const { usuarioLogado } = useContext(UsuarioContext);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [minhasAvaliacoes, setMinhasAvaliacoes] = useState([]);
  const [avaliacoesRecebidas, setAvaliacoesRecebidas] = useState([]);
  const [erro, setErro] = useState("");
  const [abaAtiva, setAbaAtiva] = useState("feitas");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function fetchAvaliacoes() {
      try {
        setCarregando(true);
        const [feitasResp, recebidasResp] = await Promise.all([
          api.get("/avaliacoes/feitas/", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          api.get("/avaliacoes/recebidas/", {
            headers: { Authorization: `Bearer ${token}` },
          })
        ]);
        
        setMinhasAvaliacoes(feitasResp.data);
        setAvaliacoesRecebidas(recebidasResp.data);
      } catch {
        setErro("Erro ao carregar suas avaliações. Tente novamente mais tarde.");
      } finally {
        setCarregando(false);
      }
    }

    if (usuarioLogado) fetchAvaliacoes();
  }, [usuarioLogado, token]);

  // Cálculos das estatísticas
  const estatisticas = useMemo(() => {
    const recebidas = avaliacoesRecebidas;
    const mediaGeral = recebidas.length > 0 
      ? (recebidas.reduce((acc, av) => acc + av.nota, 0) / recebidas.length).toFixed(1)
      : 0;
    
    return {
      totalFeitas: minhasAvaliacoes.length,
      totalRecebidas: recebidas.length,
      mediaGeral: parseFloat(mediaGeral)
    };
  }, [minhasAvaliacoes, avaliacoesRecebidas]);

  // Renderização de estrelas
  const renderEstrelas = (nota) => (
    <div className="avaliacoes-estrelas">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < nota ? "estrela cheia" : "estrela vazia"}>
          ★
        </span>
      ))}
    </div>
  );

  // Função para obter iniciais do nome
  const getIniciais = (nome) => {
    return nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
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

  const avaliacoesAtivas = abaAtiva === "feitas" ? minhasAvaliacoes : avaliacoesRecebidas;

  if (carregando) {
    return (
      <div className="avaliacoes-container">
        <div className="avaliacoes-main">
          <div className="avaliacoes-content">
            <div className="avaliacoes-vazio">
              <div className="loading-spinner"></div>
              <h3>Carregando avaliações</h3>
              <p>Buscando suas avaliações...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="avaliacoes-container">
      <div className="avaliacoes-main">
        
        {/* Header */}
        <div className="avaliacoes-header">
          <h1 className="avaliacoes-title">
            <div className="avaliacoes-icon">
              <i className="bi bi-star"></i>
            </div>
            Minhas Avaliações
          </h1>
          <p className="avaliacoes-subtitle">
            Veja todas as avaliações feitas e recebidas em seus projetos
          </p>
        </div>

        {/* Mensagens de erro */}
        {erro && (
          <div className="avaliacoes-msg erro">
            <i className="bi bi-exclamation-circle"></i>
            {erro}
          </div>
        )}

        {/* Sistema de Abas */}
        <div className="avaliacoes-tabs-container">
          <div className="avaliacoes-tabs">
            <button
              onClick={() => setAbaAtiva("feitas")}
              className={`avaliacoes-tab ${abaAtiva === "feitas" ? "active" : ""}`}
            >
              <i className="bi bi-pencil-square tab-icon"></i>
              Avaliações Feitas
              {estatisticas.totalFeitas > 0 && (
                <span className="tab-badge">{estatisticas.totalFeitas}</span>
              )}
            </button>
            <button
              onClick={() => setAbaAtiva("recebidas")}
              className={`avaliacoes-tab ${abaAtiva === "recebidas" ? "active" : ""}`}
            >
              <i className="bi bi-inbox tab-icon"></i>
              Avaliações Recebidas
              {estatisticas.totalRecebidas > 0 && (
                <span className="tab-badge">{estatisticas.totalRecebidas}</span>
              )}
            </button>
          </div>
        </div>

        {/* Área de Conteúdo */}
        <div className="avaliacoes-content">
          
          {/* Header da Lista com Estatísticas */}
          {avaliacoesAtivas.length > 0 && (
            <div className="avaliacoes-header-list">
              <div className="avaliacoes-stats">
                <div className="stat-item">
                  <i className="bi bi-list-ul"></i>
                  <span>Total: <span className="stat-value">{avaliacoesAtivas.length}</span></span>
                </div>
                {abaAtiva === "recebidas" && estatisticas.mediaGeral > 0 && (
                  <div className="media-geral">
                    <i className="bi bi-star-fill" style={{color: '#FCD34D'}}></i>
                    <span className="media-numero">{estatisticas.mediaGeral}</span>
                    <span>Média Geral</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Lista de Avaliações */}
          {avaliacoesAtivas.length === 0 ? (
            <div className="avaliacoes-vazio">
              <i className={`bi ${abaAtiva === "feitas" ? "bi-pencil-square" : "bi-inbox"}`}></i>
              <h3>Nenhuma avaliação encontrada</h3>
              <p>
                {abaAtiva === "feitas"
                  ? "Você ainda não avaliou ninguém. Complete alguns projetos para deixar suas avaliações!"
                  : "Você ainda não recebeu nenhuma avaliação. Continue trabalhando em projetos para receber feedback!"}
              </p>
            </div>
          ) : (
            <div className="avaliacoes-lista">
              {avaliacoesAtivas.map((avaliacao, index) => {
                const usuario = abaAtiva === "feitas" ? avaliacao.avaliado : avaliacao.avaliador;
                const iniciais = getIniciais(usuario.nome);
                
                return (
                  <div key={avaliacao.id} className="avaliacao-item">
                    
                    {/* Avatar */}
                    <div className="avaliacao-avatar">
                      {iniciais}
                    </div>

                    {/* Informações Principais */}
                    <div className="avaliacao-info">
                      <button
                        className="avaliacao-usuario"
                        onClick={() => navigate(`/perfil/${usuario.id}`)}
                      >
                        {usuario.nome}
                      </button>
                      
                      {abaAtiva === "feitas" && avaliacao.titulo_trabalho && (
                        <div className="avaliacao-trabalho">
                          <i className="bi bi-briefcase"></i>
                          {avaliacao.titulo_trabalho}
                        </div>
                      )}
                      
                      <p className={`avaliacao-comentario ${!avaliacao.comentario ? 'vazio' : ''}`}>
                        {avaliacao.comentario || "Sem comentário adicional"}
                      </p>
                    </div>

                    {/* Avaliação */}
                    <div className="avaliacao-nota">
                      {renderEstrelas(avaliacao.nota)}
                      <div className="nota-numero">{avaliacao.nota}/5</div>
                    </div>

                    {/* Data */}
                    <div className="avaliacao-data">
                      <div className="data-principal">
                        {new Date(avaliacao.data_avaliacao).toLocaleDateString("pt-BR")}
                      </div>
                      <div className="data-relativa">
                        {formatarDataRelativa(avaliacao.data_avaliacao)}
                      </div>
                    </div>

                    {/* Tipo */}
                    <div className={`avaliacao-tipo ${abaAtiva}`}>
                      {abaAtiva === "feitas" ? "Feita" : "Recebida"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}