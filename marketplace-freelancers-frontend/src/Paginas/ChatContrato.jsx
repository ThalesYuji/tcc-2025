import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../Servicos/Api";
import "../styles/ChatContrato.css";

export default function ChatContrato() {
  const { contratoId } = useParams();
  const navigate = useNavigate();

  const [mensagens, setMensagens] = useState([]);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [anexo, setAnexo] = useState(null);
  const [destinatarioId, setDestinatarioId] = useState(null);
  const [destinatarioNome, setDestinatarioNome] = useState("");
  const [statusContrato, setStatusContrato] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const mensagensEndRef = useRef(null);
  const inputRef = useRef(null);

  const [modalEdicao, setModalEdicao] = useState({ aberto: false, mensagem: null, texto: "" });
  const [modalExclusao, setModalExclusao] = useState({ aberto: false, mensagem: null });

  const token = localStorage.getItem("token");
  const userId = parseInt(localStorage.getItem("userId"));

  const scrollToBottom = () => {
    if (mensagensEndRef.current) mensagensEndRef.current.scrollIntoView({ behavior: "smooth" });
  };

  const carregarContrato = useCallback(async () => {
    try {
      const resp = await api.get(`/contratos/${contratoId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const contrato = resp.data;
      setStatusContrato(contrato.status);

      const outroId = userId === contrato.cliente?.id ? contrato.freelancer?.id : contrato.cliente?.id;
      const outroNome = userId === contrato.cliente?.id ? contrato.freelancer?.nome : contrato.cliente?.nome;

      setDestinatarioId(outroId);
      setDestinatarioNome(outroNome || "Usuário");
    } catch (err) {
      console.error("Erro ao carregar contrato", err);
    }
  }, [contratoId, token, userId]);

  const carregarMensagens = useCallback(async () => {
    try {
      setCarregando(true);
      const resp = await api.get(`/mensagens/conversa?contrato=${contratoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const lista = resp.data.mensagens || resp.data || [];
      setMensagens(lista);
      setTimeout(() => {
        scrollToBottom();
        setCarregando(false);
      }, 100);
    } catch (err) {
      console.error("Erro ao carregar mensagens", err);
      setCarregando(false);
    }
  }, [contratoId, token]);

  useEffect(() => {
    carregarContrato();
    carregarMensagens();
  }, [carregarContrato, carregarMensagens]);

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  // Foca no campo quando entra na tela
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // 🔥 Sempre que a mensagem for limpa, volta o foco
  useEffect(() => {
    if (novaMensagem === "" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [novaMensagem]);

  const handleInputChange = (e) => {
    setNovaMensagem(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const enviarMensagem = async (e) => {
    if (e) e.preventDefault();
    if (!novaMensagem.trim() && !anexo) return;
    if (!destinatarioId) return;

    setEnviando(true);

    const formData = new FormData();
    formData.append("contrato", contratoId);
    formData.append("destinatario", destinatarioId);
    formData.append("texto", novaMensagem);
    if (anexo) formData.append("anexo", anexo);

    try {
      const resp = await api.post("/mensagens/", formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });
      setMensagens(resp.data.mensagens || resp.data || []);
      setNovaMensagem(""); // 🔥 Aqui o useEffect acima vai garantir o foco
      setAnexo(null);

      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }

      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = "";
      scrollToBottom();
    } catch (err) {
      alert(err.response?.data?.erro || "Erro ao enviar mensagem.");
    } finally {
      setEnviando(false);
    }
  };

  const formatarData = (dataString) => {
    const data = new Date(dataString);
    return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const handleAnexoChange = (e) => setAnexo(e.target.files[0]);
  const removeAnexo = () => setAnexo(null);

  const abrirModalEdicao = (msg) => setModalEdicao({ aberto: true, mensagem: msg, texto: msg.texto });
  const fecharModalEdicao = () => setModalEdicao({ aberto: false, mensagem: null, texto: "" });

  const salvarEdicao = async () => {
    try {
      const resp = await api.patch(`/mensagens/${modalEdicao.mensagem.id}/`, { texto: modalEdicao.texto }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMensagens(resp.data.mensagens || resp.data || []);
      fecharModalEdicao();
      scrollToBottom();
    } catch (err) {
      alert(err.response?.data?.detail || "Erro ao editar mensagem.");
    }
  };

  const abrirModalExclusao = (msg) => setModalExclusao({ aberto: true, mensagem: msg });
  const fecharModalExclusao = () => setModalExclusao({ aberto: false, mensagem: null });

  const confirmarExclusao = async () => {
    try {
      const resp = await api.delete(`/mensagens/${modalExclusao.mensagem.id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMensagens(resp.data.mensagens || resp.data || []);
      fecharModalExclusao();
      scrollToBottom();
    } catch (err) {
      alert(err.response?.data?.detail || "Erro ao excluir mensagem.");
    }
  };

  const toggleMenu = (id) => {
    setMensagens((prev) =>
      prev.map((msg) =>
        msg.id === id ? { ...msg, menuAberto: !msg.menuAberto } : { ...msg, menuAberto: false }
      )
    );
  };

  return (
    <div className="chat-page">
      <div className="page-container fade-in">
        
        {/* Header */}
        <div className="chat-page-header">
          <h1 className="chat-page-title">
            <div className="chat-title-icon">
              <i className="bi bi-chat-dots"></i>
            </div>
            Conversa com {destinatarioNome}
          </h1>
          <p className="chat-page-subtitle">
            Comunicação direta e segura para seu projeto
          </p>
        </div>

        {/* Navegação - Botão de Voltar */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <button onClick={() => navigate("/contratos")} className="btn btn-primary">
            <i className="bi bi-arrow-left"></i>
            Voltar aos Contratos
          </button>
        </div>

        {/* Container do Chat */}
        <div className="chat-container">
          
          {/* Status do Contrato */}
          {statusContrato === "concluido" && (
            <div className="chat-status-alert">
              <i className="bi bi-info-circle"></i>
              <span>Este contrato foi concluído. O chat está disponível apenas para consulta.</span>
            </div>
          )}

          {/* Preview do Anexo */}
          {anexo && (
            <div className="anexo-preview">
              <div className="anexo-info">
                <i className="bi bi-paperclip"></i>
                <span>{anexo.name}</span>
              </div>
              <button type="button" onClick={removeAnexo} className="remove-anexo">
                <i className="bi bi-x"></i>
              </button>
            </div>
          )}

          {/* Lista de Mensagens */}
          <div className="mensagens-container">
            {carregando ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <h3>Carregando mensagens...</h3>
                <p>Buscando conversas...</p>
              </div>
            ) : mensagens.length === 0 ? (
              <div className="chat-empty">
                <i className="bi bi-chat-square"></i>
                <h3>Nenhuma mensagem ainda</h3>
                <p>Seja o primeiro a enviar uma mensagem!</p>
              </div>
            ) : (
              <div className="mensagens-lista">
                {mensagens.map((m) => {
                  const podeEditar = new Date() - new Date(m.data_envio) <= 5 * 60 * 1000;
                  const podeExcluir = new Date() - new Date(m.data_envio) <= 7 * 60 * 1000;

                  return (
                    <div key={m.id} className={`mensagem ${m.remetente === userId ? "enviada" : "recebida"}`}>
                      
                      {/* Anexo */}
                      {m.anexo_url && !m.excluida && (
                        <div className="mensagem-anexo">
                          <a href={m.anexo_url} target="_blank" rel="noopener noreferrer" className="anexo-link">
                            <i className="bi bi-paperclip"></i>
                            <span>Anexo</span>
                          </a>
                        </div>
                      )}
                      
                      {/* Texto da Mensagem */}
                      <div className="mensagem-content">
                        <p className={`mensagem-texto ${m.excluida ? "mensagem-excluida" : ""}`}>
                          {m.texto}
                        </p>
                        <span className="mensagem-info">
                          {formatarData(m.data_envio)}
                        </span>
                      </div>

                      {/* Menu de Ações */}
                      {m.remetente === userId && !m.excluida && (podeEditar || podeExcluir) && (
                        <div className="mensagem-menu-wrapper">
                          <button className="menu-toggle" onClick={() => toggleMenu(m.id)}>
                            <i className="bi bi-three-dots-vertical"></i>
                          </button>
                          {m.menuAberto && (
                            <div className="mensagem-menu">
                              {podeEditar && (
                                <button onClick={() => abrirModalEdicao(m)} className="menu-item">
                                  <i className="bi bi-pencil"></i>
                                  <span>Editar</span>
                                </button>
                              )}
                              {podeExcluir && (
                                <button onClick={() => abrirModalExclusao(m)} className="menu-item">
                                  <i className="bi bi-trash"></i>
                                  <span>Excluir</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={mensagensEndRef} />
              </div>
            )}
          </div>

          {/* Formulário de Envio */}
          <div className="chat-form-container">
            <form onSubmit={enviarMensagem} className="chat-form">
              <div className="form-input-group">
                <textarea
                  ref={inputRef}
                  value={novaMensagem}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      enviarMensagem();
                    }
                  }}
                  placeholder={statusContrato === "concluido" ? "Envio desabilitado - contrato concluído" : "Digite sua mensagem..."}
                  className="chat-input"
                  disabled={enviando || statusContrato === "concluido"}
                  maxLength={2000}
                  rows={1}
                />
                
                <div className="form-actions">
                  <label className="chat-btn-anexo" title="Anexar arquivo">
                    <i className="bi bi-paperclip"></i>
                    <input 
                      type="file" 
                      accept=".jpg,.jpeg,.png,.pdf" 
                      onChange={handleAnexoChange} 
                      disabled={enviando || statusContrato === "concluido"} 
                    />
                  </label>

                  <button 
                    type="submit" 
                    className="chat-btn-enviar" 
                    disabled={enviando || statusContrato === "concluido" || (!novaMensagem.trim() && !anexo)} 
                    title="Enviar mensagem"
                  >
                    {enviando ? (
                      <div className="loading-spinner small"></div>
                    ) : (
                      <i className="bi bi-send"></i>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Modal de Edição */}
        {modalEdicao.aberto && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h3>Editar mensagem</h3>
              </div>
              <div className="modal-body">
                <textarea 
                  value={modalEdicao.texto} 
                  onChange={(e) => setModalEdicao({ ...modalEdicao, texto: e.target.value })} 
                  rows={4} 
                  className="modal-textarea"
                  placeholder="Digite sua mensagem..."
                />
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={fecharModalEdicao}>
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={salvarEdicao}>
                  <i className="bi bi-check"></i>
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Exclusão */}
        {modalExclusao.aberto && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h3 className="modal-title-danger">
                  <i className="bi bi-exclamation-triangle"></i>
                  Confirmar exclusão
                </h3>
              </div>
              <div className="modal-body">
                <p>Tem certeza que deseja excluir esta mensagem? Esta ação não poderá ser desfeita.</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={fecharModalExclusao}>
                  Cancelar
                </button>
                <button className="btn btn-danger" onClick={confirmarExclusao}>
                  <i className="bi bi-trash"></i>
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
