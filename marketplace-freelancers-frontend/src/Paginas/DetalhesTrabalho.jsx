// src/Paginas/DetalhesTrabalho.jsx
import React, { useEffect, useState } from "react";
import api from "../Servicos/Api";
import { getUsuarioLogado } from "../Servicos/Auth";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/DetalhesTrabalho.css";

const BASE_URL = "http://localhost:8000";

// Função para classe do status
function getStatusClass(status) {
  switch (status?.toLowerCase()) {
    case "aberto": return "status-aberto";
    case "em_andamento": return "status-em-andamento";
    case "concluido": 
    case "concluído": return "status-concluido";
    case "cancelado": return "status-cancelado";
    case "recusado": return "status-recusado";
    default: return "status-default";
  }
}

function getStatusIcon(status) {
  switch (status?.toLowerCase()) {
    case "aberto": return "bi-unlock";
    case "em_andamento": return "bi-clock";
    case "concluido": 
    case "concluído": return "bi-check-circle";
    case "cancelado": return "bi-x-circle";
    case "recusado": return "bi-x-circle";
    default: return "bi-question-circle";
  }
}

export default function DetalhesTrabalho() {
  const { id } = useParams();
  const [trabalho, setTrabalho] = useState(null);
  const [erro, setErro] = useState("");
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ descricao: "", valor: "", prazo_estimado: "" });
  const [formErro, setFormErro] = useState("");
  const [formSucesso, setFormSucesso] = useState("");
  const [alerta, setAlerta] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [enviandoProposta, setEnviandoProposta] = useState(false);
  const navigate = useNavigate();

  // Buscar dados
  useEffect(() => {
    Promise.all([
      api.get(`/trabalhos/${id}/`),
      getUsuarioLogado().catch(() => null)
    ])
      .then(([trabalhoResponse, usuario]) => {
        setTrabalho(trabalhoResponse.data);
        setUsuarioLogado(usuario);
        setCarregando(false);
      })
      .catch(() => {
        setErro("Erro ao buscar o trabalho.");
        setCarregando(false);
      });
  }, [id]);

  // Utilidades de data
  function formatarData(dataStr) {
    if (!dataStr) return "Não definido";
    const [ano, mes, dia] = dataStr.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  function formatarDataHora(dataStr) {
    if (!dataStr) return "";
    const d = new Date(dataStr);
    return d.toLocaleString("pt-BR");
  }

  function formatarOrcamento(valor) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  // Alerta central
  function mostrarAlerta(tipo, texto, destino = null) {
    setAlerta({ tipo, texto });
    setTimeout(() => {
      setAlerta(null);
      if (destino) navigate(destino);
    }, 2500);
  }

  // Permissões
  const podeEditarOuExcluir = () =>
    usuarioLogado &&
    trabalho &&
    (usuarioLogado.id === trabalho.contratante_id || usuarioLogado.is_superuser);

  const podeEnviarProposta =
    usuarioLogado &&
    usuarioLogado.tipo === "freelancer" &&
    trabalho &&
    trabalho.status === "aberto" &&
    !trabalho.is_privado;

  const podeAceitarOuRecusar =
    usuarioLogado &&
    trabalho &&
    trabalho.is_privado &&
    trabalho.freelancer === usuarioLogado.id &&
    trabalho.status === "aberto";

  // Excluir trabalho
  const handleDelete = async () => {
    if (!window.confirm("Tem certeza que deseja excluir este trabalho?")) return;
    try {
      await api.delete(`/trabalhos/${trabalho.id}/`);
      mostrarAlerta("sucesso", "Trabalho excluído com sucesso!", "/trabalhos");
    } catch {
      mostrarAlerta("erro", "Erro ao excluir trabalho.");
    }
  };

  // Formulário proposta
  const abrirFormProposta = () => {
    setForm({ descricao: "", valor: "", prazo_estimado: "" });
    setFormErro("");
    setFormSucesso("");
    setShowForm(true);
  };

  const enviarProposta = async (e) => {
    e.preventDefault();
    setFormErro("");
    setFormSucesso("");

    if (!form.descricao || !form.valor || !form.prazo_estimado) {
      setFormErro("Por favor, preencha todos os campos da proposta.");
      return;
    }

    setEnviandoProposta(true);

    try {
      await api.post("/propostas/", {
        trabalho: trabalho.id,
        freelancer: usuarioLogado.id,
        descricao: form.descricao,
        valor: form.valor,
        prazo_estimado: form.prazo_estimado,
      });
      
      setFormSucesso("✅ Proposta enviada com sucesso!");
      setShowForm(false);
      mostrarAlerta("sucesso", "Proposta enviada com sucesso! O contratante será notificado.");
      setTimeout(() => setFormSucesso(""), 3000);
    } catch (err) {
      const mensagem =
        err.response?.data?.erro ||
        err.response?.data?.detail ||
        "Erro ao enviar proposta. Tente novamente.";
      setFormErro(mensagem);
    } finally {
      setEnviandoProposta(false);
    }
  };

  // Aceitar / Recusar
  const aceitarTrabalho = async () => {
    try {
      await api.post(`/trabalhos/${trabalho.id}/aceitar/`);
      mostrarAlerta("sucesso", "Trabalho aceito e contrato criado!", "/contratos");
    } catch {
      mostrarAlerta("erro", "Erro ao aceitar o trabalho.");
    }
  };

  const recusarTrabalho = async () => {
    try {
      await api.post(`/trabalhos/${trabalho.id}/recusar/`);
      mostrarAlerta("info", "Você recusou o trabalho.", "/trabalhos");
    } catch {
      mostrarAlerta("erro", "Erro ao recusar o trabalho.");
    }
  };

  // Estados de loading e erro
  if (carregando) {
    return (
      <div className="detalhes-trabalho-page page-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h3>Carregando detalhes...</h3>
          <p>Buscando informações do trabalho</p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="detalhes-trabalho-page page-container">
        <div className="dashboard-error">
          <div className="error-icon">⚠️</div>
          <h3 className="error-title">Erro ao Carregar</h3>
          <p className="error-message">{erro}</p>
          <button 
            className="btn btn-primary"
            onClick={() => navigate("/trabalhos")}
          >
            <i className="bi bi-arrow-left"></i>
            Voltar para Trabalhos
          </button>
        </div>
      </div>
    );
  }

  if (!trabalho) {
    return (
      <div className="detalhes-trabalho-page page-container">
        <div className="dashboard-error">
          <div className="error-icon">🔍</div>
          <h3 className="error-title">Trabalho Não Encontrado</h3>
          <p className="error-message">O trabalho solicitado não foi encontrado.</p>
          <button 
            className="btn btn-primary"
            onClick={() => navigate("/trabalhos")}
          >
            <i className="bi bi-arrow-left"></i>
            Voltar para Trabalhos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="detalhes-trabalho-page page-container fade-in">
      {/* Alerta Overlay */}
      {alerta && (
        <div className="alerta-overlay">
          <div className={`alerta-box alerta-${alerta.tipo}`}>
            <i className={`bi ${
              alerta.tipo === 'sucesso' ? 'bi-check-circle-fill' : 
              alerta.tipo === 'erro' ? 'bi-x-circle-fill' : 'bi-info-circle-fill'
            }`}></i>
            <span>{alerta.texto}</span>
          </div>
        </div>
      )}

      {/* Modal de Proposta */}
      {showForm && (
        <div className="proposta-modal-overlay">
          <div className="proposta-modal-content">
            <div className="proposta-modal-header">
              <h4>
                <i className="bi bi-send-fill"></i>
                Enviar Nova Proposta
              </h4>
              <button 
                className="modal-close-btn"
                onClick={() => setShowForm(false)}
                type="button"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            
            <form onSubmit={enviarProposta} className="proposta-form">
              <div className="form-group">
                <label>
                  <i className="bi bi-chat-text"></i>
                  Mensagem para o Contratante
                </label>
                <textarea
                  placeholder="Descreva sua proposta, experiência relevante e por que você é a melhor escolha para este projeto..."
                  value={form.descricao}
                  onChange={e => setForm({ ...form, descricao: e.target.value })}
                  rows={5}
                  className="form-control"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    <i className="bi bi-currency-dollar"></i>
                    Valor Proposto
                  </label>
                  <input
                    type="number"
                    placeholder="R$ 0,00"
                    value={form.valor}
                    onChange={e => setForm({ ...form, valor: e.target.value })}
                    className="form-control"
                    min="1"
                    step="0.01"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    <i className="bi bi-calendar-check"></i>
                    Prazo Estimado
                  </label>
                  <input
                    type="date"
                    value={form.prazo_estimado}
                    onChange={e => setForm({ ...form, prazo_estimado: e.target.value })}
                    className="form-control"
                    required
                  />
                </div>
              </div>

              {formErro && (
                <div className="error-message">
                  <i className="bi bi-exclamation-circle-fill"></i>
                  {formErro}
                </div>
              )}

              <div className="form-actions">
                <button 
                  type="submit" 
                  className="btn-action btn-primary-action"
                  disabled={enviandoProposta}
                >
                  {enviandoProposta ? (
                    <>
                      <span className="spinner-border spinner-border-sm"></span>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send-fill"></i>
                      Enviar Proposta
                    </>
                  )}
                </button>
                <button 
                  type="button" 
                  className="btn-action btn-secondary-action"
                  onClick={() => setShowForm(false)}
                  disabled={enviandoProposta}
                >
                  <i className="bi bi-x"></i>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="detalhes-header">
        <div className="detalhes-nav">
        </div>
        
        <div className="detalhes-title-section">
          <div className="title-with-status">
            <h1 className="detalhes-title">
              <i className="bi bi-briefcase"></i>
              {trabalho.titulo}
            </h1>
            <div className={`trabalho-status-badge ${getStatusClass(trabalho.status)}`}>
              <i className={`bi ${getStatusIcon(trabalho.status)}`}></i>
              {trabalho.status}
            </div>
          </div>
          <p className="detalhes-subtitle">
            Publicado por {trabalho.nome_contratante} em {formatarDataHora(trabalho.criado_em)}
          </p>
        </div>
      </div>

        {/* Navegação - Botão de Voltar */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <button onClick={() => navigate("/trabalhos")} className="btn btn-primary">
            <i className="bi bi-arrow-left"></i>
            Voltar aos Trabalhos
          </button>
        </div>

      {/* Conteúdo Principal */}
      <div className="detalhes-content">
        {/* Card Principal */}
        <div className="detalhes-main-card modern-card">
          <div className="detalhes-card-header">
            <h2>
              <i className="bi bi-file-text"></i>
              Descrição do Projeto
            </h2>
          </div>
          
          <div className="detalhes-card-body">
            <div className="trabalho-descricao-completa">
              {trabalho.descricao || "Nenhuma descrição fornecida."}
            </div>

            {/* Informações em Grid */}
            <div className="trabalho-info-grid">
              <div className="info-item">
                <div className="info-icon">
                  <i className="bi bi-currency-dollar"></i>
                </div>
                <div className="info-content">
                  <span className="info-label">Orçamento</span>
                  <span className="info-value trabalho-orcamento">
                    {formatarOrcamento(trabalho.orcamento)}
                  </span>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon">
                  <i className="bi bi-calendar-event"></i>
                </div>
                <div className="info-content">
                  <span className="info-label">Prazo</span>
                  <span className="info-value">
                    {formatarData(trabalho.prazo)}
                  </span>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon">
                  <i className="bi bi-person"></i>
                </div>
                <div className="info-content">
                  <span className="info-label">Contratante</span>
                  <span 
                    className="info-value cliente-link"
                    onClick={() => navigate(`/perfil/${trabalho.contratante_id}`)}
                  >
                    {trabalho.nome_contratante}
                  </span>
                </div>
              </div>

              {trabalho.is_privado && (
                <div className="info-item">
                  <div className="info-icon">
                    <i className="bi bi-lock"></i>
                  </div>
                  <div className="info-content">
                    <span className="info-label">Tipo</span>
                    <span className="info-value">
                      <span className="badge-privado">Trabalho Privado</span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Habilidades */}
            {trabalho.habilidades_detalhes?.length > 0 && (
              <div className="trabalho-habilidades-section">
                <h3>
                  <i className="bi bi-tools"></i>
                  Habilidades Necessárias
                </h3>
                <div className="habilidades-list">
                  {trabalho.habilidades_detalhes.map((hab, index) => (
                    <span key={index} className="habilidade-tag">
                      {hab.nome}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Anexo */}
            {trabalho.anexo && (
              <div className="trabalho-anexo-section">
                <h3>
                  <i className="bi bi-paperclip"></i>
                  Arquivo Anexo
                </h3>
                <a
                  href={`${BASE_URL}${trabalho.anexo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="anexo-link"
                >
                  <i className="bi bi-download"></i>
                  Baixar Arquivo
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Card de Ações */}
        <div className="detalhes-actions-card modern-card">
          <div className="detalhes-card-header">
            <h2>
              <i className="bi bi-gear"></i>
              Ações Disponíveis
            </h2>
          </div>
          
          <div className="detalhes-card-body">
            {/* Mensagem de Sucesso Global */}
            {formSucesso && !showForm && (
              <div className="success-message-global">
                <i className="bi bi-check-circle-fill"></i>
                {formSucesso}
              </div>
            )}

            {/* Botões de Gerenciamento */}
            {podeEditarOuExcluir() && (
              <div className="action-group">
                <h4>Gerenciar Trabalho</h4>
                <div className="btn-group-actions">
                  <button 
                    className="btn-action btn-primary-action"
                    onClick={() => navigate(`/trabalhos/editar/${trabalho.id}`)}
                  >
                    <i className="bi bi-pencil"></i>
                    Editar
                  </button>
                  <button 
                    className="btn-action btn-danger-action" 
                    onClick={handleDelete}
                  >
                    <i className="bi bi-trash"></i>
                    Excluir
                  </button>
                </div>
              </div>
            )}

            {/* Proposta */}
            {podeEnviarProposta && (
              <div className="action-group">
                <h4>Interessado no Projeto?</h4>
                <button 
                  className="btn-action btn-success-action full-width"
                  onClick={abrirFormProposta}
                >
                  <i className="bi bi-send"></i>
                  Enviar Proposta
                </button>
              </div>
            )}

            {/* Aceitar / Recusar */}
            {podeAceitarOuRecusar && (
              <div className="action-group">
                <h4>Trabalho Privado</h4>
                <p className="action-description">
                  Este é um trabalho privado direcionado a você. Escolha sua ação:
                </p>
                <div className="btn-group-actions">
                  <button 
                    className="btn-action btn-success-action"
                    onClick={aceitarTrabalho}
                  >
                    <i className="bi bi-check-circle"></i>
                    Aceitar Trabalho
                  </button>
                  <button 
                    className="btn-action btn-danger-action"
                    onClick={recusarTrabalho}
                  >
                    <i className="bi bi-x-circle"></i>
                    Recusar Trabalho
                  </button>
                </div>
              </div>
            )}

            {/* Estado quando não há ações disponíveis */}
            {!podeEditarOuExcluir() && !podeEnviarProposta && !podeAceitarOuRecusar && (
              <div className="no-actions">
                <div className="no-actions-icon">
                  <i className="bi bi-info-circle"></i>
                </div>
                <h4>Nenhuma Ação Disponível</h4>
                <p>Você não tem permissões para realizar ações neste trabalho.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}