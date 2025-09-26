// src/Componentes/ModalRespostaDenuncia.jsx - Redesign Moderno
import React, { useState } from "react";
import api from "../Servicos/Api";
import "../styles/ModalRespostaDenuncia.css";

export default function ModalRespostaDenuncia({ denuncia, onClose, onAtualizar }) {
  const [status, setStatus] = useState(denuncia.status || "Pendente");
  const [resposta, setResposta] = useState(denuncia.resposta_admin || "");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setCarregando(true);
    setErro("");
    setSucesso("");

    try {
      const token = localStorage.getItem("token");

      // Monta o payload dinamicamente
      const payload = { status };
      if (resposta.trim()) {
        payload.resposta_admin = resposta.trim();
      }

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

      setSucesso("Denúncia atualizada com sucesso!");
      onAtualizar(response.data);

      setTimeout(() => onClose(), 1500);
    } catch (error) {
      console.error("Erro ao responder denúncia:", error);
      setErro("Erro ao atualizar denúncia. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  // Função para fechar modal com Escape
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" role="dialog" aria-modal="true">
        
        {/* Header */}
        <div className="modal-header">
          <h3>
            <i className="bi bi-chat-dots"></i>
            Responder Denúncia #{denuncia.id}
          </h3>
          <button
            className="btn-close-modal"
            aria-label="Fechar modal"
            onClick={onClose}
            title="Fechar modal (Esc)"
          >
            <i className="bi bi-x"></i>
          </button>
        </div>

        {/* Informações da Denúncia */}
        <div className="denuncia-info-modal">
          <div className="denuncia-info-grid">
            <div className="info-item">
              <span className="info-label">Contrato</span>
              <p className="info-value">
                {denuncia.contrato_titulo || denuncia.contrato?.titulo || "Não especificado"}
              </p>
            </div>
            
            <div className="info-item">
              <span className="info-label">Data</span>
              <p className="info-value">
                {denuncia.data_criacao
                  ? new Date(denuncia.data_criacao).toLocaleDateString("pt-BR", {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : "Não informada"}
              </p>
            </div>
            
            <div className="info-item">
              <span className="info-label">Denunciante</span>
              <p className="info-value denunciante">
                {denuncia.denunciante?.nome || "Usuário não identificado"}
              </p>
            </div>
            
            <div className="info-item">
              <span className="info-label">Denunciado</span>
              <p className="info-value denunciado">
                {denuncia.denunciado_detalhes?.nome || 
                 denuncia.denunciado?.nome || 
                 "Usuário não identificado"}
              </p>
            </div>
            
            <div className="info-item" style={{gridColumn: '1 / -1'}}>
              <span className="info-label">Motivo da Denúncia</span>
              <p className="info-value">
                {denuncia.motivo?.trim() || "Motivo não especificado"}
              </p>
            </div>
          </div>
        </div>

        {/* Mensagens de Status */}
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
            
            {/* Status */}
            <div className="form-group">
              <label htmlFor="status" className="form-label">
                Status da Denúncia
              </label>
              <select
                id="status"
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={carregando}
              >
                <option value="Pendente">Pendente - Aguardando análise</option>
                <option value="Analisando">Analisando - Em investigação</option>
                <option value="Resolvida">Resolvida - Caso encerrado</option>
              </select>
            </div>

            {/* Resposta */}
            <div className="form-group">
              <label htmlFor="resposta" className="form-label">
                Resposta da Administração (opcional)
              </label>
              <textarea
                id="resposta"
                className="form-control"
                value={resposta}
                onChange={(e) => setResposta(e.target.value)}
                placeholder="Digite sua resposta oficial para esta denúncia..."
                disabled={carregando}
                maxLength={1000}
              />
              <small className="form-text">
                <i className="bi bi-info-circle"></i>
                Esta resposta será visível para o denunciante e o denunciado. Seja claro e profissional.
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
                <i className="bi bi-x"></i>
                Cancelar
              </button>
              
              <button
                type="submit"
                className={`btn btn-primary ${carregando ? 'btn-loading' : ''}`}
                disabled={carregando}
              >
                {carregando ? (
                  "Salvando..."
                ) : (
                  <>
                    <i className="bi bi-check"></i>
                    Salvar Resposta
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}