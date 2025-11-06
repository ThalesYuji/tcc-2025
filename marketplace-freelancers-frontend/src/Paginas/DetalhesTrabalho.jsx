// src/Paginas/DetalhesTrabalho.jsx - VERSÃO COMPLETA COM REENVIO (até 3 envios)
import React, { useEffect, useState, useMemo } from "react";
import api from "../Servicos/Api";
import { getUsuarioLogado } from "../Servicos/Auth";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/DetalhesTrabalho.css";

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
  const navigate = useNavigate();

  // =================== STATES PRINCIPAIS ===================
  const [trabalho, setTrabalho] = useState(null);
  const [erro, setErro] = useState("");
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [carregando, setCarregando] = useState(true);

  // Modais/ações
  const [showForm, setShowForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [enviandoProposta, setEnviandoProposta] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  // Form proposta
  const [form, setForm] = useState({ descricao: "", valor: "", prazo_estimado: "" });
  const [motivoRevisao, setMotivoRevisao] = useState("");
  const [formErro, setFormErro] = useState("");

  // Alerta central
  const [alerta, setAlerta] = useState(null);

  // Propostas do usuário para ESTE trabalho
  const [minhasPropostas, setMinhasPropostas] = useState([]);
  const MAX_ENVIOS = 3; // 1 original + até 2 reenvios (total 3)

  // =================== BUSCAS INICIAIS ===================
  useEffect(() => {
    (async () => {
      try {
        const [trabalhoResp, user] = await Promise.all([
          api.get(`/trabalhos/${id}/`),
          getUsuarioLogado().catch(() => null),
        ]);
        setTrabalho(trabalhoResp.data);
        setUsuarioLogado(user);

        // Busca propostas do usuário e filtra por este trabalho
        if (user) {
          // Preferir filtro server-side (?trabalho=ID)
          const propsResp = await api
            .get(`/propostas/`, { params: { trabalho: id } })
            .catch(async () => {
              // fallback: pega todas e filtra no front
              const all = await api.get(`/propostas/`);
              return { data: all.data };
            });

          const data = propsResp.data;
          const lista = Array.isArray(data) ? data : (data?.results || []);
          const somenteEsteTrabalho = lista.filter(
            (p) => p.trabalho === Number(id) || p.trabalho?.id === Number(id)
          );

          // Ordena por data_envio desc
          somenteEsteTrabalho.sort(
            (a, b) => new Date(b.data_envio) - new Date(a.data_envio)
          );

          setMinhasPropostas(somenteEsteTrabalho);
        }
      } catch (e) {
        setErro("Erro ao buscar o trabalho.");
      } finally {
        setCarregando(false);
      }
    })();
  }, [id]);

  // =================== DERIVADOS / REGRAS DE NEGÓCIO ===================
  const {
    totalEnvios,
    ultimaProposta,
    existePendenteOuAceita,
    tentativasRestantes,
    isReenvioElegivel
  } = useMemo(() => {
    const total = minhasPropostas.length;
    const ultima = total > 0 ? minhasPropostas[0] : null;
    const existeAtiva = minhasPropostas.some(p => p.status === "pendente" || p.status === "aceita");
    const restantes = Math.max(0, MAX_ENVIOS - total);
    const reenvioOk = !!ultima && ultima.status === "recusada" && restantes > 0;
    return {
      totalEnvios: total,
      ultimaProposta: ultima,
      existePendenteOuAceita: existeAtiva,
      tentativasRestantes: restantes,
      isReenvioElegivel: reenvioOk
    };
  }, [minhasPropostas]);

  // Permissões de ação do usuário
  const podeEditarOuExcluir = () =>
    usuarioLogado &&
    trabalho &&
    (usuarioLogado.id === trabalho.contratante_id || usuarioLogado.is_superuser);

  // Regra de enviar proposta com limite + status do trabalho
  const podeEnviarProposta = useMemo(() => {
    if (!usuarioLogado || usuarioLogado.tipo !== "freelancer") return false;
    if (!trabalho || trabalho.status !== "aberto" || trabalho.is_privado) return false;
    if (existePendenteOuAceita) return false;
    // Primeira proposta:
    if (totalEnvios === 0) return true;
    // Reenvio: só se última foi recusada e sobrar tentativa
    return isReenvioElegivel;
  }, [usuarioLogado, trabalho, existePendenteOuAceita, totalEnvios, isReenvioElegivel]);

  const isReenvio = useMemo(() => totalEnvios >= 1 && isReenvioElegivel, [totalEnvios, isReenvioElegivel]);

  // =================== UTILIDADES ===================
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
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
  }

  function mostrarAlerta(tipo, texto, destino = null) {
    setAlerta({ tipo, texto });
    setTimeout(() => {
      setAlerta(null);
      if (destino) navigate(destino);
    }, 2500);
  }

  // =================== AÇÕES ===================
  // Excluir trabalho
  const handleDelete = async () => {
    setExcluindo(true);
    try {
      await api.delete(`/trabalhos/${trabalho.id}/`);
      setShowDeleteModal(false);
      mostrarAlerta("sucesso", "Trabalho excluído com sucesso!", "/trabalhos");
    } catch {
      setExcluindo(false);
      setShowDeleteModal(false);
      mostrarAlerta("erro", "Erro ao excluir trabalho.");
    }
  };

  // Abrir modal de proposta
  const abrirFormProposta = () => {
    setForm({ descricao: "", valor: "", prazo_estimado: "" });
    setMotivoRevisao("");
    setFormErro("");
    setShowForm(true);
  };

  // Enviar proposta (com suporte a reenvio e motivo_revisao)
  const enviarProposta = async (e) => {
    e.preventDefault();
    setFormErro("");

    if (!form.descricao || !form.valor || !form.prazo_estimado) {
      setFormErro("Por favor, preencha todos os campos da proposta.");
      return;
    }
    if (isReenvio && !motivoRevisao.trim()) {
      setFormErro("Informe o motivo da revisão: o que mudou nesta nova proposta?");
      return;
    }

    setEnviandoProposta(true);
    try {
      const payload = {
        trabalho: trabalho.id,
        descricao: form.descricao,
        valor: form.valor,
        prazo_estimado: form.prazo_estimado,
        ...(isReenvio ? { motivo_revisao: motivoRevisao.trim() } : {}),
      };

      await api.post("/propostas/", payload);

      setShowForm(false);
      const textoSucesso = isReenvio
        ? `Proposta revisada enviada! Restam ${Math.max(0, tentativasRestantes - 1)} tentativa(s).`
        : "Proposta enviada! Redirecionando para suas propostas...";
      mostrarAlerta("sucesso", textoSucesso, "/propostas");
    } catch (err) {
      const data = err.response?.data;
      let mensagem = "Erro ao enviar proposta. Tente novamente.";
      if (typeof data === "string") mensagem = data;
      else if (Array.isArray(data)) mensagem = data.join(" ");
      else if (data && typeof data === "object") {
        const flat = Object.values(data).flat().join(" ");
        if (flat) mensagem = flat;
      }
      setFormErro(mensagem);
    } finally {
      setEnviandoProposta(false);
    }
  };

  // Aceitar / Recusar (trabalhos privados)
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

  // =================== ESTADOS DE TELA ===================
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
          <button className="btn btn-primary" onClick={() => navigate("/trabalhos")}>
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
          <button className="btn btn-primary" onClick={() => navigate("/trabalhos")}>
            <i className="bi bi-arrow-left"></i>
            Voltar para Trabalhos
          </button>
        </div>
      </div>
    );
  }

  // Ícone do alerta
  const getAlertaIcon = () => {
    if (!alerta) return "bi-info-circle-fill";
    if (alerta.tipo === "sucesso") return "bi-check-circle-fill";
    if (alerta.tipo === "erro") return "bi-x-circle-fill";
    return "bi-info-circle-fill";
  };

  return (
    <div className="detalhes-trabalho-page page-container fade-in">
      {/* ALERTA CENTRAL */}
      {alerta && (
        <div className="alerta-overlay">
          <div className={`alerta-box alerta-${alerta.tipo}`}>
            <i className={`bi ${getAlertaIcon()}`}></i>
            <span>{alerta.texto}</span>
          </div>
        </div>
      )}

      {/* MODAL DE EXCLUSÃO */}
      {showDeleteModal && (
        <div className="delete-modal-overlay">
          <div className="delete-modal-content zoom-in">
            <div className="delete-modal-icon">
              <i className="bi bi-exclamation-triangle-fill"></i>
            </div>
            <h3 className="delete-modal-title">Confirmar Exclusão</h3>
            <p className="delete-modal-message">
              Tem certeza que deseja excluir o trabalho <strong>{trabalho.titulo}</strong>?
            </p>
            <p className="delete-modal-warning">
              <i className="bi bi-info-circle"></i>
              Esta ação não pode ser desfeita.
            </p>

            <div className="delete-modal-actions">
              <button
                className="btn-modal btn-cancel"
                onClick={() => setShowDeleteModal(false)}
                disabled={excluindo}
              >
                <i className="bi bi-x-circle"></i>
                Cancelar
              </button>
              <button
                className="btn-modal btn-confirm-delete"
                onClick={handleDelete}
                disabled={excluindo}
              >
                {excluindo ? (
                  <>
                    <span className="spinner-border spinner-border-sm"></span>
                    Excluindo...
                  </>
                ) : (
                  <>
                    <i className="bi bi-trash-fill"></i>
                    Sim, Excluir
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PROPOSTA (com motivo de revisão em reenvio) */}
      {showForm && (
        <div className="delete-modal-overlay">
          <div className="delete-modal-content zoom-in">
            <div className="delete-modal-icon" style={{ backgroundColor: '#10b981' }}>
              <i className="bi bi-send-fill"></i>
            </div>
            <h3 className="delete-modal-title">
              {isReenvio ? "Enviar Nova Proposta (Revisada)" : "Enviar Proposta"}
            </h3>
            <p className="delete-modal-message">
              {isReenvio ? (
                <>
                  Você já enviou {totalEnvios} proposta(s) para <strong>{trabalho.titulo}</strong>.
                  Restam <strong>{tentativasRestantes}</strong> tentativa(s).
                </>
              ) : (
                <>Preencha os detalhes da sua proposta para <strong>{trabalho.titulo}</strong></>
              )}
            </p>

            {formErro && (
              <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                <i className="bi bi-exclamation-circle"></i> {formErro}
              </div>
            )}

            <form onSubmit={enviarProposta} style={{ textAlign: 'left' }}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="descricao" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Descrição da Proposta *
                </label>
                <textarea
                  id="descricao"
                  className="form-control"
                  rows="4"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Descreva como você pode ajudar neste projeto..."
                  required
                  disabled={enviandoProposta}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #ddd' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="valor" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Valor Proposto (R$) *
                </label>
                <input
                  type="number"
                  id="valor"
                  className="form-control"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  placeholder="Ex: 1500.00"
                  step="0.01"
                  min="0"
                  required
                  disabled={enviandoProposta}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #ddd' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="prazo" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Prazo Estimado *
                </label>
                <input
                  type="date"
                  id="prazo"
                  className="form-control"
                  value={form.prazo_estimado}
                  onChange={(e) => setForm({ ...form, prazo_estimado: e.target.value })}
                  required
                  disabled={enviandoProposta}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #ddd' }}
                />
              </div>

              {isReenvio && (
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="motivo_revisao" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    O que mudou na sua nova proposta? (Motivo da revisão) *
                  </label>
                  <textarea
                    id="motivo_revisao"
                    className="form-control"
                    rows="3"
                    value={motivoRevisao}
                    onChange={(e) => setMotivoRevisao(e.target.value)}
                    placeholder="Ex.: Ajustei o escopo/valor/prazo com base no feedback."
                    required={isReenvio}
                    disabled={enviandoProposta}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #ddd' }}
                  />
                </div>
              )}

              <div className="delete-modal-actions">
                <button
                  type="button"
                  className="btn-modal btn-cancel"
                  onClick={() => setShowForm(false)}
                  disabled={enviandoProposta}
                >
                  <i className="bi bi-x-circle"></i>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-modal btn-confirm-delete"
                  disabled={enviandoProposta}
                  style={{ backgroundColor: '#10b981' }}
                >
                  {enviandoProposta ? (
                    <>
                      <span className="spinner-border spinner-border-sm"></span>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send-fill"></i>
                      {isReenvio ? "Enviar Nova Proposta" : "Enviar Proposta"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="detalhes-header">
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

      <div style={{ marginBottom: "var(--space-xl)" }}>
        <button onClick={() => navigate("/trabalhos")} className="btn btn-primary">
          <i className="bi bi-arrow-left"></i>
          Voltar aos Trabalhos
        </button>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="detalhes-content">
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
                  <span className="info-value">{formatarData(trabalho.prazo)}</span>
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

            {/* HABILIDADES */}
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

            {/* ARQUIVO ANEXO */}
            {trabalho.anexo_url && (
              <div className="trabalho-anexo-section">
                <h3>
                  <i className="bi bi-paperclip"></i>
                  Arquivo Anexo
                </h3>
                <a
                  href={trabalho.anexo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="anexo-link"
                  onClick={(e) => {
                    if (!trabalho.anexo_url || trabalho.anexo_url === 'null') {
                      e.preventDefault();
                      alert('Arquivo não disponível');
                    }
                  }}
                >
                  <i className="bi bi-download"></i>
                  Baixar Arquivo
                </a>
              </div>
            )}
          </div>
        </div>

        {/* AÇÕES */}
        <div className="detalhes-actions-card modern-card">
          <div className="detalhes-card-header">
            <h2>
              <i className="bi bi-gear"></i>
              Ações Disponíveis
            </h2>
          </div>

          <div className="detalhes-card-body">
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
                    onClick={() => setShowDeleteModal(true)}
                  >
                    <i className="bi bi-trash"></i>
                    Excluir
                  </button>
                </div>
              </div>
            )}

            {podeEnviarProposta && (
              <div className="action-group">
                <h4>Interessado no Projeto?</h4>
                <button
                  className="btn-action btn-success-action full-width"
                  onClick={abrirFormProposta}
                >
                  <i className="bi bi-send"></i>
                  {isReenvio
                    ? `Enviar nova proposta (restam ${tentativasRestantes})`
                    : "Enviar Proposta"}
                </button>
              </div>
            )}

            {usuarioLogado && usuarioLogado.tipo === "freelancer" && !podeEnviarProposta && (
              <div className="action-group">
                <h4>Envios para este trabalho</h4>
                <div className="text-muted small">
                  {existePendenteOuAceita && "Você já possui uma proposta pendente/aceita para este trabalho."}
                  {!existePendenteOuAceita && totalEnvios > 0 && ultimaProposta?.status !== "recusada" &&
                    "Aguarde a decisão do contratante para enviar uma nova proposta."}
                  {!existePendenteOuAceita && totalEnvios >= MAX_ENVIOS &&
                    "Limite de envios atingido para este trabalho."}
                  {!existePendenteOuAceita && trabalho.status !== "aberto" &&
                    "Este trabalho não está aberto para novas propostas."}
                </div>
              </div>
            )}

            {usuarioLogado && trabalho?.is_privado &&
              trabalho.freelancer === usuarioLogado.id &&
              trabalho.status === "aberto" && (
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

            {!podeEditarOuExcluir() &&
              !podeEnviarProposta &&
              !(usuarioLogado && trabalho?.is_privado && trabalho.freelancer === usuarioLogado.id && trabalho.status === "aberto") && (
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
