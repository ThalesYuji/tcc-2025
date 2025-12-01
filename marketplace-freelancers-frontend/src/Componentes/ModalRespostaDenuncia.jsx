// src/Componentes/ModalRespostaDenuncia.jsx - Versão Atualizada (sem status)
import React, { useState } from "react";
import api from "../Servicos/Api";
import "../styles/ModalRespostaDenuncia.css";

export default function ModalRespostaDenuncia({ denuncia, onClose, onAtualizar }) {
  const [resposta, setResposta] = useState(denuncia.resposta_admin || "");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  // 👉 Apenas envia a resposta_admin
  const handleSubmit = async (e) => {
    e.preventDefault();

    setCarregando(true);
    setErro("");
    setSucesso("");

    try {
      const token = localStorage.getItem("token");

      const payload = {};
      if (resposta.trim()) payload.resposta_admin = resposta.trim();

      const response = await api.patch(
        `/denuncias/${denuncia.id}/`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setSucesso("Resposta salva com sucesso!");

      // Atualiza o card no painel
      onAtualizar(response.data);

      // Fecha modal rapidamente
      setTimeout(() => onClose(), 1200);

    } catch (error) {
      console.error("Erro ao salvar resposta:", error);
      setErro("Erro ao salvar resposta. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  // 👉 Fechar modal com ESC
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div
      className="modal-bg"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box" role="dialog" aria-modal="true">

        {/* Header */}
        <div className="modal-header">
          <h3>
            <i className="bi bi-chat-dots"></i>
            Responder Denúncia #{denuncia.id}
          </h3>

          <button
            className="btn-close-modal"
            aria-label="Fechar"
            onClick={onClose}
          >
            <i className="bi bi-x"></i>
          </button>
        </div>

        {/* Informações da denúncia */}
        <div className="denuncia-info-modal">
          <div className="denuncia-info-grid">

            <div className="info-item">
              <span className="info-label">Contrato</span>
              <p className="info-value">
                {denuncia.contrato_titulo || denuncia.contrato?.titulo || "Não informado"}
              </p>
            </div>

            <div className="info-item">
              <span className="info-label">Data</span>
              <p className="info-value">
                {denuncia.data_criacao
                  ? new Date(denuncia.data_criacao).toLocaleDateString("pt-BR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "—"}
              </p>
            </div>

            <div className="info-item">
              <span className="info-label">Denunciante</span>
              <p className="info-value denunciante">
                {denuncia.denunciante?.nome || "—"}
              </p>
            </div>

            <div className="info-item">
              <span className="info-label">Denunciado</span>
              <p className="info-value denunciado">
                {denuncia.denunciado_detalhes?.nome ||
                  denuncia.denunciado?.nome ||
                  "—"}
              </p>
            </div>

            <div className="info-item" style={{ gridColumn: "1 / -1" }}>
              <span className="info-label">Motivo</span>
              <p className="info-value">{denuncia.motivo || "—"}</p>
            </div>
          </div>
        </div>

        {/* Mensagens */}
        <div className="modal-messages">
          {erro && (
            <div className="error-msg">
              <i className="bi bi-exclamation-circle"></i>
              {erro}
            </div>
          )}
          {sucesso && (
            <div className="success-msg">
              <i className="bi bi-check-circle"></i>
              {sucesso}
            </div>
          )}
        </div>

        {/* Formulário */}
        <div className="modal-form">
          <form onSubmit={handleSubmit}>

            {/* Campo de resposta */}
            <div className="form-group">
              <label htmlFor="resposta" className="form-label">
                Resposta da Administração
              </label>

              <textarea
                id="resposta"
                className="form-control"
                placeholder="Digite a resposta oficial..."
                value={resposta}
                onChange={(e) => setResposta(e.target.value)}
                disabled={carregando}
                maxLength={1000}
              />

              <small className="form-text">
                <i className="bi bi-info-circle"></i>
                Essa resposta será visível para denunciante e denunciado.
              </small>
            </div>

            {/* Botões */}
            <div className="modal-buttons">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={carregando}
              >
                <i className="bi bi-x"></i> Cancelar
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={carregando}
              >
                {carregando ? "Salvando..." : <><i className="bi bi-check"></i> Salvar</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
