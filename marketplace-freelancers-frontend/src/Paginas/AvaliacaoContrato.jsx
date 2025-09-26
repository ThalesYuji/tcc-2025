// src/Paginas/AvaliacaoContrato.jsx - Header Padronizado
import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../Servicos/Api";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import "../styles/AvaliacaoContrato.css";

export default function AvaliacaoContrato() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuarioLogado } = useContext(UsuarioContext);

  const [contrato, setContrato] = useState(null);
  const [minhaAvaliacao, setMinhaAvaliacao] = useState(null);
  const [avaliacaoOposta, setAvaliacaoOposta] = useState(null);
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [hoveredStar, setHoveredStar] = useState(0);

  useEffect(() => {
    async function buscarDados() {
      try {
        setCarregando(true);
        const contratoResp = await api.get(`/contratos/${id}/`);
        setContrato(contratoResp.data);

        const respFeitas = await api.get("/avaliacoes/feitas/");
        const respRecebidas = await api.get("/avaliacoes/recebidas/");

        const minha = respFeitas.data.find((a) => a.contrato === parseInt(id));
        const outra = respRecebidas.data.find((a) => a.contrato === parseInt(id));

        setMinhaAvaliacao(minha || null);
        setAvaliacaoOposta(outra || null);
      } catch {
        setErro("Erro ao buscar avaliações ou contrato.");
      } finally {
        setCarregando(false);
      }
    }
    if (usuarioLogado) buscarDados();
  }, [id, usuarioLogado]);

  function traduzirErroAvaliacao(msg) {
    if (!msg) return "Erro ao enviar avaliação.";
    if (typeof msg === "string" && (
      msg.toLowerCase().includes("already exists") ||
      msg.toLowerCase().includes("unique") ||
      msg.toLowerCase().includes("duplicada")
    )) return "Você já enviou uma avaliação para este contrato.";
    if (typeof msg === "string" && (
      msg.toLowerCase().includes("permission") ||
      msg.toLowerCase().includes("not allowed") ||
      msg.toLowerCase().includes("unauthorized")
    )) return "Você não tem permissão para avaliar este contrato.";
    if (typeof msg === "string" && msg.toLowerCase().includes("nota"))
      return "Nota inválida. Só é permitido de 1 a 5.";
    return typeof msg === "string" ? msg : "Erro ao enviar avaliação.";
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    setMensagem("");

    try {
      await api.post("/avaliacoes/", {
        contrato: contrato.id,
        nota,
        comentario,
      });

      setMensagem("Avaliação enviada com sucesso!");
      setMinhaAvaliacao({
        contrato: contrato.id,
        avaliador: { id: usuarioLogado.id, nome: usuarioLogado.nome },
        avaliado:
          usuarioLogado.id === contrato.cliente.id
            ? { id: contrato.freelancer.id, nome: contrato.freelancer.nome }
            : { id: contrato.cliente.id, nome: contrato.cliente.nome },
        nota,
        comentario,
        data_avaliacao: new Date().toISOString(),
      });
    } catch (err) {
      let msg = "Erro ao enviar avaliação.";
      if (err.response && err.response.data) {
        if (typeof err.response.data === "string") msg = err.response.data;
        else if (err.response.data.detail) msg = err.response.data.detail;
        else if (err.response.data.non_field_errors)
          msg = err.response.data.non_field_errors.join(" ");
      }
      setErro(traduzirErroAvaliacao(msg));
    }
  };

  const renderStars = (rating, isInteractive = false, size = "1.2rem") => {
    return Array.from({ length: 5 }, (_, i) => (
      <i
        key={i}
        className={`bi ${
          i < rating ? "bi-star-fill" : "bi-star"
        } star-rating ${isInteractive ? "interactive" : ""}`}
        style={{ 
          fontSize: size,
          color: i < rating ? "#F59E0B" : "#CBD5E1",
          cursor: isInteractive ? "pointer" : "default"
        }}
        onMouseEnter={() => isInteractive && setHoveredStar(i + 1)}
        onMouseLeave={() => isInteractive && setHoveredStar(0)}
        onClick={() => isInteractive && setNota(i + 1)}
      />
    ));
  };

  // Loading state
  if (carregando) {
    return (
      <div className="avaliacao-page">
        <div className="page-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <h3>Carregando contrato...</h3>
            <p>Buscando informações detalhadas...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!contrato) {
    return (
      <div className="avaliacao-page">
        <div className="page-container">
          <div className="error-state">
            <i className="bi bi-exclamation-triangle"></i>
            <h3>Contrato não encontrado</h3>
            <p>Não foi possível encontrar o contrato solicitado.</p>
            <button onClick={() => navigate("/contratos")} className="btn gradient-btn">
              <i className="bi bi-arrow-left"></i>
              Voltar aos Contratos
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusColor = {
    'ativo': '#10B981',
    'concluido': '#3B82F6',
    'cancelado': '#EF4444',
    'pausado': '#F59E0B'
  };

  const getStatusIcon = (status) => {
    const icons = {
      'ativo': 'bi-play-circle',
      'concluido': 'bi-check-circle',
      'cancelado': 'bi-x-circle',
      'pausado': 'bi-pause-circle'
    };
    return icons[status] || 'bi-circle';
  };

  return (
    <div className="avaliacao-page">
      <div className="page-container fade-in">
        
        {/* Header Padronizado - IGUAL AO CONTRATOS.JSX */}
        <div className="contratos-header">
          <h1 className="contratos-title">
            <div className="contratos-title-icon">
              <i className="bi bi-star-half"></i>
            </div>
            Sistema de Avaliações
          </h1>
          <p className="contratos-subtitle">
            Gerencie e visualize avaliações do contrato
          </p>
        </div>

        {/* Navegação - Botão de Voltar */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <button onClick={() => navigate("/contratos")} className="btn btn-primary">
            <i className="bi bi-arrow-left"></i>
            Voltar aos Contratos
          </button>
        </div>

        {/* Mensagens Globais */}
        {erro && (
          <div className="alert-error">
            <i className="bi bi-exclamation-triangle"></i>
            {erro}
          </div>
        )}
        
        {mensagem && (
          <div className="alert-success">
            <i className="bi bi-check-circle"></i>
            {mensagem}
          </div>
        )}

        {/* Layout Principal - Duas Colunas */}
        <div className="main-layout">
          
          {/* Coluna Esquerda - Informações */}
          <div className="left-column">
            
            {/* Card do Contrato */}
            <div className="contract-overview">
              <div className="card-header">
                <div className="header-info">
                  <div className="contract-icon">
                    <i className="bi bi-file-earmark-text"></i>
                  </div>
                  <div className="header-text">
                    <h3>Informações do Contrato</h3>
                    <span className="contract-id">ID #{contrato.id}</span>
                  </div>
                </div>
                <div className="contract-status" style={{ backgroundColor: statusColor[contrato.status] }}>
                  <i className={`bi ${getStatusIcon(contrato.status)}`}></i>
                  <span>{contrato.status.charAt(0).toUpperCase() + contrato.status.slice(1)}</span>
                </div>
              </div>
              
              <div className="contract-details">
                <div className="detail-row primary">
                  <div className="detail-icon">
                    <i className="bi bi-briefcase"></i>
                  </div>
                  <div className="detail-content">
                    <label>Trabalho</label>
                    <span>{contrato.trabalho.titulo}</span>
                  </div>
                </div>
                
                <div className="details-grid">
                  <div className="detail-item">
                    <div className="detail-icon mini">
                      <i className="bi bi-person"></i>
                    </div>
                    <div className="detail-content">
                      <label>Cliente</label>
                      <span>{contrato.cliente.nome}</span>
                    </div>
                  </div>
                  
                  <div className="detail-item">
                    <div className="detail-icon mini">
                      <i className="bi bi-person-workspace"></i>
                    </div>
                    <div className="detail-content">
                      <label>Freelancer</label>
                      <span>{contrato.freelancer.nome}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status de Avaliações */}
            <div className="evaluation-status">
              <div className="status-header">
                <h4>
                  <i className="bi bi-clipboard-data"></i>
                  Status das Avaliações
                </h4>
              </div>
              
              <div className="status-grid">
                <div className={`status-item ${minhaAvaliacao ? 'completed' : 'pending'}`}>
                  <div className="status-icon">
                    <i className={`bi ${minhaAvaliacao ? 'bi-check-circle-fill' : 'bi-clock'}`}></i>
                  </div>
                  <div className="status-text">
                    <span className="status-label">Sua Avaliação</span>
                    <span className="status-value">
                      {minhaAvaliacao ? 'Enviada' : 'Pendente'}
                    </span>
                  </div>
                </div>
                
                <div className={`status-item ${avaliacaoOposta ? 'completed' : 'pending'}`}>
                  <div className="status-icon">
                    <i className={`bi ${avaliacaoOposta ? 'bi-check-circle-fill' : 'bi-clock'}`}></i>
                  </div>
                  <div className="status-text">
                    <span className="status-label">Avaliação Recebida</span>
                    <span className="status-value">
                      {avaliacaoOposta ? 'Recebida' : 'Pendente'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Informativo sobre avaliações */}
            {contrato.status !== "concluido" && !minhaAvaliacao && (
              <div className="info-banner">
                <div className="banner-icon">
                  <i className="bi bi-info-circle"></i>
                </div>
                <div className="banner-content">
                  <strong>Avaliações Bloqueadas</strong>
                  <p>As avaliações só ficam disponíveis após a conclusão do contrato.</p>
                </div>
              </div>
            )}
          </div>

          {/* Coluna Direita - Avaliações */}
          <div className="right-column">
            
            {/* Formulário de Nova Avaliação */}
            {!minhaAvaliacao && contrato.status === "concluido" && (
              <div className="evaluation-form-card">
                <div className="form-header">
                  <div className="form-icon">
                    <i className="bi bi-star"></i>
                  </div>
                  <div className="form-title">
                    <h3>Enviar Avaliação</h3>
                    <p>Compartilhe sua experiência neste contrato</p>
                  </div>
                </div>
                
                <form onSubmit={handleSubmit} className="evaluation-form">
                  {/* Rating com Estrelas Interativas */}
                  <div className="rating-section">
                    <label className="rating-label">
                      <i className="bi bi-star-half"></i>
                      Como você avalia este trabalho?
                    </label>
                    <div className="star-rating-container">
                      <div className="stars-wrapper">
                        {renderStars(hoveredStar || nota, true, "2rem")}
                      </div>
                      <span className="rating-text">
                        {nota === 5 && "Excelente"}
                        {nota === 4 && "Muito Bom"}
                        {nota === 3 && "Regular"}
                        {nota === 2 && "Ruim"}
                        {nota === 1 && "Péssimo"}
                      </span>
                    </div>
                  </div>

                  {/* Comentário */}
                  <div className="comment-section">
                    <label className="comment-label">
                      <i className="bi bi-chat-text"></i>
                      Comentário (opcional)
                    </label>
                    <div className="textarea-wrapper">
                      <textarea
                        value={comentario}
                        onChange={(e) => setComentario(e.target.value)}
                        placeholder="Conte como foi sua experiência. Isso ajuda outros usuários da plataforma..."
                        rows="5"
                        className="comment-textarea"
                      />
                      <div className="textarea-footer">
                        <span className="char-count">{comentario.length}/500</span>
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="submit-btn">
                    <i className="bi bi-send"></i>
                    Enviar Avaliação
                  </button>
                </form>
              </div>
            )}

            {/* Avaliação Enviada */}
            {minhaAvaliacao && (
              <div className="evaluation-card sent">
                <div className="eval-header">
                  <div className="eval-type">
                    <div className="type-icon sent">
                      <i className="bi bi-arrow-up-circle"></i>
                    </div>
                    <div className="type-info">
                      <h4>Avaliação Enviada</h4>
                      <span>Para: {minhaAvaliacao.avaliado?.nome}</span>
                    </div>
                  </div>
                  <div className="eval-date">
                    {new Date(minhaAvaliacao.data_avaliacao).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                
                <div className="eval-content">
                  <div className="eval-rating">
                    {renderStars(minhaAvaliacao.nota, false, "1.5rem")}
                    <span className="rating-value">{minhaAvaliacao.nota}/5</span>
                  </div>
                  {minhaAvaliacao.comentario && (
                    <div className="eval-comment">
                      <p>"{minhaAvaliacao.comentario}"</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Avaliação Recebida */}
            {avaliacaoOposta && (
              <div className="evaluation-card received">
                <div className="eval-header">
                  <div className="eval-type">
                    <div className="type-icon received">
                      <i className="bi bi-arrow-down-circle"></i>
                    </div>
                    <div className="type-info">
                      <h4>Avaliação Recebida</h4>
                      <span>De: {avaliacaoOposta.avaliador?.nome}</span>
                    </div>
                  </div>
                  <div className="eval-date">
                    {new Date(avaliacaoOposta.data_avaliacao).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                
                <div className="eval-content">
                  <div className="eval-rating">
                    {renderStars(avaliacaoOposta.nota, false, "1.5rem")}
                    <span className="rating-value">{avaliacaoOposta.nota}/5</span>
                  </div>
                  {avaliacaoOposta.comentario && (
                    <div className="eval-comment">
                      <p>"{avaliacaoOposta.comentario}"</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Placeholder quando não há avaliações */}
            {!minhaAvaliacao && !avaliacaoOposta && contrato.status === "concluido" && (
              <div className="empty-evaluations">
                <div className="empty-icon">
                  <i className="bi bi-star"></i>
                </div>
                <h3>Nenhuma avaliação ainda</h3>
                <p>Seja o primeiro a avaliar este contrato!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}