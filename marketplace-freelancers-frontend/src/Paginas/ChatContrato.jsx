import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import api from "../Servicos/Api";
import { FiSend, FiPaperclip, FiLoader } from "react-icons/fi";
import "../App.css";

export default function ChatContrato() {
  const { contratoId } = useParams();

  // Estados principais
  const [mensagens, setMensagens] = useState([]);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [anexo, setAnexo] = useState(null);
  const [destinatarioId, setDestinatarioId] = useState(null);
  const [destinatarioNome, setDestinatarioNome] = useState("");
  const [statusContrato, setStatusContrato] = useState(""); // 🔹 status do contrato
  const [enviando, setEnviando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  // Refs
  const mensagensEndRef = useRef(null);
  const inputRef = useRef(null);

  // Estados para modais
  const [modalEdicao, setModalEdicao] = useState({ aberto: false, mensagem: null, texto: "" });
  const [modalExclusao, setModalExclusao] = useState({ aberto: false, mensagem: null });

  const token = localStorage.getItem("token");
  const userId = parseInt(localStorage.getItem("userId"));

  // 🔹 Rolagem para o fim da conversa
  const scrollToBottom = () => {
    if (mensagensEndRef.current) {
      mensagensEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // 🔹 Carrega informações do contrato e destinatário
  const carregarContrato = useCallback(async () => {
    try {
      const resp = await api.get(`/contratos/${contratoId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const contrato = resp.data;
      setStatusContrato(contrato.status); // salva status do contrato

      const outroId =
        userId === contrato.cliente?.id
          ? contrato.freelancer?.id
          : contrato.cliente?.id;

      const outroNome =
        userId === contrato.cliente?.id
          ? contrato.freelancer?.nome
          : contrato.cliente?.nome;

      setDestinatarioId(outroId);
      setDestinatarioNome(outroNome || "Usuário");
    } catch (err) {
      console.error("Erro ao carregar contrato", err);
    }
  }, [contratoId, token, userId]);

  // 🔹 Carrega mensagens
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

  // 🔹 Efeitos iniciais
  useEffect(() => {
    carregarContrato();
    carregarMensagens();
  }, [carregarContrato, carregarMensagens]);

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // 🔹 Ajusta textarea
  const handleInputChange = (e) => {
    setNovaMensagem(e.target.value);
    e.target.style.height = "auto";
    const newHeight = Math.min(e.target.scrollHeight, 120);
    e.target.style.height = newHeight + "px";
  };

  // 🔹 Envia mensagem
  const enviarMensagem = async (e) => {
    e.preventDefault();
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
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setMensagens(resp.data.mensagens || resp.data || []);
      setNovaMensagem("");
      setAnexo(null);

      if (inputRef.current) inputRef.current.style.height = "auto";
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = "";

      scrollToBottom();
    } catch (err) {
      alert(err.response?.data?.erro || "Erro ao enviar mensagem. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  // 🔹 Formata hora
  const formatarData = (dataString) => {
    const data = new Date(dataString);
    return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  // 🔹 Upload / remover anexo
  const handleAnexoChange = (e) => setAnexo(e.target.files[0]);
  const removeAnexo = () => {
    setAnexo(null);
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = "";
  };

  // 🔹 Modal edição
  const abrirModalEdicao = (msg) => setModalEdicao({ aberto: true, mensagem: msg, texto: msg.texto });
  const fecharModalEdicao = () => setModalEdicao({ aberto: false, mensagem: null, texto: "" });

  const salvarEdicao = async () => {
    try {
      const resp = await api.patch(
        `/mensagens/${modalEdicao.mensagem.id}/`,
        { texto: modalEdicao.texto },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMensagens(resp.data.mensagens || resp.data || []);
      fecharModalEdicao();
      scrollToBottom();
    } catch (err) {
      alert(err.response?.data?.detail || "Erro ao editar mensagem.");
    }
  };

  // 🔹 Modal exclusão
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

  // 🔹 Menu de mensagem
  const toggleMenu = (id) => {
    setMensagens((prev) =>
      prev.map((msg) =>
        msg.id === id ? { ...msg, menuAberto: !msg.menuAberto } : { ...msg, menuAberto: false }
      )
    );
  };

  return (
    <div className="chat-wrapper">
      <div className="chat-container">
        <div className="chat-header">
          <h3>
            <span className="chat-header-icone">💬</span>
            Conversa com <span className="chat-header-nome">{destinatarioNome}</span>
          </h3>
        </div>

        {/* 🔹 aviso se contrato concluído */}
        {statusContrato === "concluido" && (
          <div className="chat-aviso">
            ⚠️ Este contrato foi concluído. O chat está disponível apenas para consulta.
          </div>
        )}

        {/* Preview de anexo */}
        {anexo && (
          <div className="anexo-preview">
            <span>📎 {anexo.name}</span>
            <button type="button" onClick={removeAnexo} className="remove-anexo">×</button>
          </div>
        )}

        {/* Lista de mensagens */}
        <div className="mensagens-lista">
          {carregando ? (
            <div className="loading-container">
              <FiLoader className="loading-spinner" />
              <p>Carregando mensagens...</p>
            </div>
          ) : mensagens.length === 0 ? (
            <div className="sem-mensagens">
              <p>Nenhuma mensagem ainda.</p>
              <p>Seja o primeiro a enviar uma mensagem! 💬</p>
            </div>
          ) : (
            mensagens.map((m) => {
              const podeEditar = new Date() - new Date(m.data_envio) <= 5 * 60 * 1000;
              const podeExcluir = new Date() - new Date(m.data_envio) <= 7 * 60 * 1000;

              return (
                <div key={m.id} className={`mensagem ${m.remetente === userId ? "enviada" : "recebida"}`}>
                  {m.anexo_url && !m.excluida && (
                    <a href={m.anexo_url} target="_blank" rel="noopener noreferrer" className="anexo-link">
                      📎 Anexo
                    </a>
                  )}
                  <p className={`mensagem-texto ${m.excluida ? "mensagem-excluida" : ""}`}>
                    {m.texto}
                  </p>
                  <span className="mensagem-info">{formatarData(m.data_envio)}</span>

                  {m.remetente === userId && !m.excluida && (podeEditar || podeExcluir) && (
                    <div className="mensagem-menu-wrapper">
                      <button className="menu-toggle" onClick={() => toggleMenu(m.id)}>⋮</button>
                      {m.menuAberto && (
                        <div className="mensagem-menu">
                          {podeEditar && <button onClick={() => abrirModalEdicao(m)}>✏️ Editar</button>}
                          {podeExcluir && <button onClick={() => abrirModalExclusao(m)}>🗑️ Excluir</button>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={mensagensEndRef} />
        </div>

        {/* Formulário de envio */}
        <form onSubmit={enviarMensagem} className="chat-form">
          <textarea
            ref={inputRef}
            value={novaMensagem}
            onChange={handleInputChange}
            placeholder={
              statusContrato === "concluido"
                ? "Envio desabilitado - contrato concluído"
                : "Digite uma mensagem..."
            }
            className="chat-input"
            disabled={enviando || statusContrato === "concluido"}
            maxLength={2000}
            rows={1}
          />

          <label className="chat-btn-anexo" title="Anexar arquivo">
            <FiPaperclip />
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
            {enviando ? <FiLoader className="loading-spinner" /> : <FiSend />}
          </button>
        </form>
      </div>

      {/* Modal edição */}
      {modalEdicao.aberto && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>Editar mensagem</h3>
            <textarea
              value={modalEdicao.texto}
              onChange={(e) => setModalEdicao({ ...modalEdicao, texto: e.target.value })}
              rows={4}
              className="modal-textarea"
            />
            <div className="modal-botoes">
              <button className="btn-cancelar" onClick={fecharModalEdicao}>Cancelar</button>
              <button className="btn-salvar" onClick={salvarEdicao}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal exclusão */}
      {modalExclusao.aberto && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3 style={{ color: "#dc2626" }}>⚠️ Confirmar exclusão</h3>
            <p>Tem certeza que deseja excluir esta mensagem? Esta ação não poderá ser desfeita.</p>
            <div className="modal-botoes">
              <button className="btn-cancelar" onClick={fecharModalExclusao}>Cancelar</button>
              <button className="btn-excluir" onClick={confirmarExclusao}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
