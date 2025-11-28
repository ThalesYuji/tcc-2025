// src/Paginas/DetalhesTrabalho.jsx - VERSÃO COMPLETA E AJUSTADA
import React, { useEffect, useState, useMemo } from "react";
import api from "../Servicos/Api";
import { getUsuarioLogado } from "../Servicos/Auth";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/DetalhesTrabalho.css";

/* =========================
   Helpers de Status (UI)
   ========================= */
function getStatusClass(status) {
  switch ((status || "").toLowerCase()) {
    case "aberto": return "status-aberto";                // azul
    case "aguardando_aceitacao":
    case "aguardando aceitação": return "status-aguardando"; // amarelo
    case "em_andamento":
    case "em andamento": return "status-em-andamento";    // laranja
    case "concluido":
    case "concluído": return "status-concluido";          // verde
    case "cancelado": return "status-cancelado";          // cinza/vermelho
    case "recusado": return "status-recusado";            // vermelho
    default: return "status-default";
  }
}

function getStatusIcon(status) {
  switch ((status || "").toLowerCase()) {
    case "aberto": return "bi-unlock";
    case "aguardando_aceitacao":
    case "aguardando aceitação": return "bi-hourglass-split";
    case "em_andamento":
    case "em andamento": return "bi-clock";
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

  /* =========================
     State principal
     ========================= */
  const [trabalho, setTrabalho] = useState(null);
  const [erro, setErro] = useState("");
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [carregando, setCarregando] = useState(true);

  // Modais/ações
  const [showForm, setShowForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRecusaPrivado, setShowRecusaPrivado] = useState(false);
  const [enviandoProposta, setEnviandoProposta] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [recusando, setRecusando] = useState(false);

  // Form proposta
  const [form, setForm] = useState({ descricao: "", valor: "", prazo_estimado: "" });
  const [motivoRevisao, setMotivoRevisao] = useState("");
  const [formErro, setFormErro] = useState("");

  // Recusa de trabalho privado (motivo opcional — backend aceita)
  const [motivoRecusaPrivado, setMotivoRecusaPrivado] = useState("");

  // Alerta central (toast/overlay)
  const [alerta, setAlerta] = useState(null);

  // Propostas do usuário para ESTE trabalho
  const [minhasPropostas, setMinhasPropostas] = useState([]);
  const MAX_ENVIOS = 3; // 1 original + até 2 reenvios

  /* =========================
     Bootstrapping inicial
     ========================= */
  useEffect(() => {
    (async () => {
      try {
        const [trabalhoResp, user] = await Promise.all([
          api.get(`/trabalhos/${id}/`),
          getUsuarioLogado().catch(() => null),
        ]);
        setTrabalho(trabalhoResp.data);
        setUsuarioLogado(user);

        if (user) {
          // Busca propostas e filtra por este trabalho
          const propsResp = await api
            .get(`/propostas/`, { params: { trabalho: id } })
            .catch(async () => {
              const all = await api.get(`/propostas/`);
              return { data: all.data };
            });

          const data = propsResp.data;
          const lista = Array.isArray(data) ? data : (data?.results || []);
          const somenteEsteTrabalho = lista.filter(
            (p) => p.trabalho === Number(id) || p.trabalho?.id === Number(id)
          );

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

  /* =========================
     Derivados de Propostas
     ========================= */
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

  /* =========================
     Regras de permissão (UI)
     ========================= */
  const podeEditarOuExcluir = () =>
    usuarioLogado &&
    trabalho &&
    (usuarioLogado.id === trabalho.contratante_id || usuarioLogado.is_superuser);

  const podeEnviarProposta = useMemo(() => {
    if (!usuarioLogado || usuarioLogado.tipo !== "freelancer") return false;
    if (!trabalho || (trabalho.status || "").toLowerCase() !== "aberto" || trabalho.is_privado) return false;
    if (existePendenteOuAceita) return false;
    if (totalEnvios === 0) return true;
    return isReenvioElegivel;
  }, [usuarioLogado, trabalho, existePendenteOuAceita, totalEnvios, isReenvioElegivel]);

  const isReenvio = useMemo(() => totalEnvios >= 1 && isReenvioElegivel, [totalEnvios, isReenvioElegivel]);

  /* =========================
     Utils
     ========================= */
  function formatarData(dataStr) {
    if (!dataStr) return "Não definido";
    const [ano, mes, dia] = String(dataStr).split("-");
    if (!ano || !mes || !dia) return dataStr;
    return `${dia}/${mes}/${ano}`;
  }

  function formatarDataHora(dataStr) {
    if (!dataStr) return "";
    const d = new Date(dataStr);
    return d.toLocaleString("pt-BR");
  }

  function formatarOrcamento(valor) {
    const n = Number(valor || 0);
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
  }

  function mostrarAlerta(tipo, texto, destino = null) {
    setAlerta({ tipo, texto });
    setTimeout(() => {
      setAlerta(null);
      if (destino) navigate(destino);
    }, 2200);
  }

  /* =========================
     Ações (DELETE / ACEITAR / RECUSAR / PROPOSTA)
     ========================= */
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

  const abrirFormProposta = () => {
    setForm({ descricao: "", valor: "", prazo_estimado: "" });
    setMotivoRevisao("");
    setFormErro("");
    setShowForm(true);
  };

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

  const aceitarTrabalho = async () => {
    try {
      await api.post(`/trabalhos/${trabalho.id}/aceitar/`);
      mostrarAlerta("sucesso", "Trabalho aceito e contrato criado!", "/contratos");
    } catch {
      mostrarAlerta("erro", "Erro ao aceitar o trabalho.");
    }
  };

  // Agora abre modal pedindo motivo (opcional) antes de recusar
  const recusarTrabalhoAbrir = () => {
    setMotivoRecusaPrivado("");
    setShowRecusaPrivado(true);
  };

  const recusarTrabalhoConfirmar = async () => {
    setRecusando(true);
    try {
      await api.post(`/trabalhos/${trabalho.id}/recusar/`, {
        motivo: (motivoRecusaPrivado || "").trim(),
      });
      setShowRecusaPrivado(false);
      mostrarAlerta("info", "Você recusou o trabalho.", "/trabalhos");
    } catch {
      mostrarAlerta("erro", "Erro ao recusar o trabalho.");
    } finally {
      setRecusando(false);
    }
  };

  /* =========================
     Estados de tela
     ========================= */
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

  const getAlertaIcon = () => {
    if (!alerta) return "bi-info-circle-fill";
    if (alerta.tipo === "sucesso") return "bi-check-circle-fill";
    if (alerta.tipo === "erro") return "bi-x-circle-fill";
    return "bi-info-circle-fill";
  };

  /* =========================
     Render
     ========================= */
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

      {/* MODAL DE RECUSAR TRABALHO PRIVADO (com motivo opcional) */}
      {showRecusaPrivado && (
        <div className="proposta-modal-overlay">
          <div className="proposta-modal-content">
            <div className="proposta-modal-header">
              <div className="proposta-modal-title-wrapper">
                <div className="proposta-modal-icon">
                  <i className="bi bi-x-octagon-fill"></i>
                </div>
                <div>
                  <h3 className="proposta-modal-title">Recusar Trabalho</h3>
                  <p className="proposta-modal-subtitle">{trabalho.titulo}</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowRecusaPrivado(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="proposta-form">
              <div className="form-group-full">
                <label htmlFor="motivo-recusa">
                  <i className="bi bi-chat-left-text"></i>
                  Motivo (opcional)
                </label>
                <textarea
                  id="motivo-recusa"
                  className="form-control-compact"
                  placeholder="Deixe um feedback para o contratante (opcional)"
                  value={motivoRecusaPrivado}
                  onChange={(e) => setMotivoRecusaPrivado(e.target.value)}
                  disabled={recusando}
                />
              </div>

              <div className="proposta-form-actions">
                <button
                  type="button"
                  className="btn-modal-action btn-modal-cancel"
                  onClick={() => setShowRecusaPrivado(false)}
                  disabled={recusando}
                >
                  <i className="bi bi-x-circle"></i>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn-modal-action btn-danger-action"
                  onClick={recusarTrabalhoConfirmar}
                  disabled={recusando}
                >
                  {recusando ? (
                    <>
                      <span className="spinner-border"></span>
                      Recusando...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-x-octagon"></i>
                      Confirmar Recusa
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PROPOSTA */}
      {showForm && (
        <div className="proposta-modal-overlay">
          <div className="proposta-modal-content">
            {/* Header */}
            <div className="proposta-modal-header">
              <div className="proposta-modal-title-wrapper">
                <div className="proposta-modal-icon">
                  <i className="bi bi-send-fill"></i>
                </div>
                <div>
                  <h3 className="proposta-modal-title">
                    {isReenvio ? "Nova Proposta (Revisada)" : "Enviar Proposta"}
                  </h3>
                  <p className="proposta-modal-subtitle">{trabalho.titulo}</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowForm(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            {/* Form */}
            <form className="proposta-form" onSubmit={enviarProposta}>
              {isReenvio && (
                <div className="proposta-info-badge">
                  <i className="bi bi-arrow-repeat"></i>
                  <span>
                    Você já enviou <strong>{totalEnvios} proposta(s)</strong>. Restam{" "}
                    <strong>{tentativasRestantes} tentativa(s)</strong>.
                  </span>
                </div>
              )}

              {formErro && (
                <div className="proposta-form-error">
                  <i className="bi bi-exclamation-triangle-fill"></i>
                  <span>{formErro}</span>
                </div>
              )}

              <div className="form-group-full">
                <label htmlFor="descricao">
                  <i className="bi bi-file-text"></i>
                  Descrição da Proposta *
                </label>
                <textarea
                  id="descricao"
                  className="form-control-compact"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Descreva como você pode contribuir para este projeto..."
                  required
                  disabled={enviandoProposta}
                />
              </div>

              <div className="proposta-form-grid">
                <div className="form-group-compact">
                  <label htmlFor="valor">
                    <i className="bi bi-currency-dollar"></i>
                    Valor Proposto (R$) *
                  </label>
                  <input
                    type="number"
                    id="valor"
                    className="form-control-compact"
                    value={form.valor}
                    onChange={(e) => setForm({ ...form, valor: e.target.value })}
                    placeholder="Ex: 1500.00"
                    step="0.01"
                    min="0"
                    required
                    disabled={enviandoProposta}
                  />
                </div>

                <div className="form-group-compact">
                  <label htmlFor="prazo">
                    <i className="bi bi-calendar-event"></i>
                    Prazo Estimado *
                  </label>
                  <input
                    type="date"
                    id="prazo"
                    className="form-control-compact"
                    value={form.prazo_estimado}
                    onChange={(e) => setForm({ ...form, prazo_estimado: e.target.value })}
                    required
                    disabled={enviandoProposta}
                  />
                </div>
              </div>

              {isReenvio && (
                <div className="form-revisao-group">
                  <label htmlFor="motivo_revisao">
                    <i className="bi bi-arrow-clockwise"></i>
                    O que mudou nesta proposta? *
                  </label>
                  <textarea
                    id="motivo_revisao"
                    className="form-control-compact"
                    value={motivoRevisao}
                    onChange={(e) => setMotivoRevisao(e.target.value)}
                    placeholder="Ex.: Ajustei o valor com base no feedback e aumentei o prazo em 5 dias."
                    required={isReenvio}
                    disabled={enviandoProposta}
                  />
                  <div className="form-revisao-hint">
                    <i className="bi bi-lightbulb"></i>
                    <span>Explique as mudanças para aumentar suas chances de aprovação</span>
                  </div>
                </div>
              )}

              <div className="proposta-form-actions">
                <button
                  type="button"
                  className="btn-modal-action btn-modal-cancel"
                  onClick={() => setShowForm(false)}
                  disabled={enviandoProposta}
                >
                  <i className="bi bi-x-circle"></i>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-modal-action btn-modal-submit"
                  disabled={enviandoProposta}
                >
                  {enviandoProposta ? (
                    <>
                      <span className="spinner-border"></span>
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
            Publicado por {trabalho.nome_contratante || "—"} em {formatarDataHora(trabalho.criado_em)}
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

            {trabalho.ramo_nome && (
              <div className="trabalho-ramo-info">
                <i className="bi bi-diagram-3-fill"></i>
                <div>
                  <div className="ramo-label">Área de Atuação</div>
                  <div className="ramo-nome">{trabalho.ramo_nome}</div>
                </div>
              </div>
            )}
            
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
                    onClick={() => trabalho.contratante_id && navigate(`/perfil/${trabalho.contratante_id}`)}
                    role="button"
                  >
                    {trabalho.nome_contratante || "—"}
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
            {Array.isArray(trabalho.habilidades_detalhes) && trabalho.habilidades_detalhes.length > 0 && (
              <div className="trabalho-habilidades-section">
                <h3>
                  <i className="bi bi-tools"></i>
                  Habilidades Necessárias
                </h3>
                <div className="habilidades-list">
                  {trabalho.habilidades_detalhes.map((hab) => (
                    <span key={hab.id || hab.nome} className="habilidade-tag">
                      {hab.nome}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ARQUIVO ANEXO */}
            {trabalho.anexo_url && trabalho.anexo_url !== "null" && (
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

            {/* Fluxo de privado para o freelancer convidado */}
            {usuarioLogado && trabalho?.is_privado &&
              trabalho.freelancer === usuarioLogado.id &&
              (trabalho.status || "").toLowerCase() === "aberto" && (
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
                      onClick={recusarTrabalhoAbrir}
                    >
                      <i className="bi bi-x-circle"></i>
                      Recusar Trabalho
                    </button>
                  </div>
                </div>
              )}

            {!podeEditarOuExcluir() &&
              !podeEnviarProposta &&
              !(usuarioLogado && trabalho?.is_privado && trabalho.freelancer === usuarioLogado.id && (trabalho.status || "").toLowerCase() === "aberto") && (
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
