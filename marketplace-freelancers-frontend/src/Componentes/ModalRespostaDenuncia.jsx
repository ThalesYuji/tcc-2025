import React, { useState } from "react";
import api from "../Servicos/Api";
import { FaTimes, FaReply, FaPaperPlane } from "react-icons/fa";
import "../styles/ModalRespostaDenuncia.css";

export default function ModalRespostaDenuncia({ denuncia, onClose, onAtualizar }) {
  const [status, setStatus] = useState(denuncia.status || "Pendente");
  const [resposta, setResposta] = useState(denuncia.resposta_admin || "");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!resposta.trim()) {
      setErro("Por favor, digite uma resposta.");
      return;
    }

    setCarregando(true);
    setErro("");
    setSucesso("");

    try {
      const token = localStorage.getItem("token");
      const response = await api.patch(
        `/denuncias/${denuncia.id}/`,
        { status, resposta_admin: resposta.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSucesso("Resposta enviada com sucesso!");
      onAtualizar(response.data);

      setTimeout(() => onClose(), 1000);
    } catch (error) {
      console.error("Erro ao responder denúncia:", error);
      setErro("Erro ao enviar resposta. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="modal-header">
          <h3>
            <FaReply /> Responder Denúncia #{denuncia.id}
          </h3>
          <button
            className="btn-close-modal"
            aria-label="Fechar"
            onClick={onClose}
            title="Fechar modal"
          >
            <FaTimes />
          </button>
        </div>

        {/* Informações */}
        <div className="denuncia-info-modal">
          <div className="denuncia-info-grid">
            <div className="info-item">
              <span className="info-label">Contrato:</span>
              <p className="info-value">{denuncia.contrato_titulo || denuncia.contrato?.titulo || "-"}</p>
            </div>
            <div className="info-item">
              <span className="info-label">Data:</span>
              <p className="info-value">
                {denuncia.data_criacao
                  ? new Date(denuncia.data_criacao).toLocaleDateString("pt-BR")
                  : "-"}
              </p>
            </div>
            <div className="info-item">
              <span className="info-label">Denunciante:</span>
              <p className="info-value denunciante">{denuncia.denunciante?.nome || "-"}</p>
            </div>
            <div className="info-item">
              <span className="info-label">Denunciado:</span>
              <p className="info-value denunciado">
                {denuncia.denunciado_detalhes?.nome || denuncia.denunciado?.nome || "-"}
              </p>
            </div>
            <div className="info-item">
              <span className="info-label">Motivo:</span>
              <p className="info-value">{denuncia.motivo?.trim() || "-"}</p>
            </div>
          </div>
        </div>

        {/* Mensagens */}
        {erro && <div className="error-msg">{erro}</div>}
        {sucesso && <div className="success-msg">{sucesso}</div>}

        {/* Formulário */}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="status" className="form-label">Status da Denúncia:</label>
            <select
              id="status"
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={carregando}
            >
              <option value="Pendente">Pendente</option>
              <option value="Analisando">Analisando</option>
              <option value="Resolvida">Resolvida</option>
            </select>
          </div>

          <div className="mb-3">
            <label htmlFor="resposta" className="form-label">Resposta do Administrador:</label>
            <textarea
              id="resposta"
              className="form-control"
              rows="4"
              value={resposta}
              onChange={(e) => setResposta(e.target.value)}
              placeholder="Digite sua resposta sobre esta denúncia..."
              disabled={carregando}
              required
            />
            <small className="form-text">
              Esta resposta será visível para o denunciante e o denunciado.
            </small>
          </div>

          <div className="modal-buttons">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={carregando}
            >
              <FaTimes /> Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={carregando || !resposta.trim()}
            >
              {carregando ? "Enviando..." : <><FaPaperPlane /> Enviar Resposta</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
