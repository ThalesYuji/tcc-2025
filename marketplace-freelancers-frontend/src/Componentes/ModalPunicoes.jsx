import React, { useState } from "react";
import {
  aplicarAdvertencia,
  aplicarSuspensao,
  aplicarBanimento
} from "../Servicos/Api";
import "../styles/ModalPunicoes.css";

export default function ModalPunicoes({ denuncia, onClose, onPunicaoAplicada }) {
  const [tipo, setTipo] = useState("advertencia");
  const [motivo, setMotivo] = useState("");
  const [dias, setDias] = useState(7);
  const [loading, setLoading] = useState(false);

  const usuarioPunidoId = denuncia?.denunciado_detalhes?.id;

  // Proteção caso a denúncia venha quebrada
  if (!usuarioPunidoId) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Punição indisponível</h3>
            <button className="close-btn" onClick={onClose}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
          <div className="modal-body">
            <p>Não foi possível identificar o usuário a ser punido.</p>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // FUNÇÃO PRINCIPAL: APLICAR PUNIÇÃO
  async function aplicar() {
    if (loading) return;

    if (!motivo.trim()) {
      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: {
            type: "error",
            title: "Campo obrigatório",
            message: "O motivo da punição deve ser informado."
          }
        })
      );
      return;
    }

    setLoading(true);

    try {
      // EXECUTA O TIPO DE PUNIÇÃO
      if (tipo === "advertencia") {
        await aplicarAdvertencia(usuarioPunidoId, motivo, denuncia.id);
      }

      else if (tipo === "suspensao") {
        if (!dias || dias < 1) {
          window.dispatchEvent(
            new CustomEvent("toast", {
              detail: {
                type: "error",
                title: "Valor inválido",
                message: "Informe um número de dias válido para suspensão."
              }
            })
          );
          setLoading(false);
          return;
        }
        await aplicarSuspensao(usuarioPunidoId, motivo, dias, denuncia.id);
      }

      else if (tipo === "banimento") {
        await aplicarBanimento(usuarioPunidoId, motivo, denuncia.id);
      }

      // Toast bonito no canto superior direito
      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: {
            type: "success",
            title: "Punição aplicada!",
            message: "A punição foi aplicada com sucesso."
          }
        })
      );

      // Atualiza o card da denúncia como resolvida
      if (onPunicaoAplicada) {
        onPunicaoAplicada({
          ...denuncia,
          status: "Resolvida"
        });
      }

      // Fecha o modal após sucesso
      onClose();

    } catch (error) {
      console.error("Erro ao aplicar punição:", error);

      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: {
            type: "error",
            title: "Erro na punição",
            message: "Não foi possível aplicar a punição. Tente novamente."
          }
        })
      );
    }

    setLoading(false);
  }

  // RENDERIZAÇÃO DO MODAL
  return (
    <div className="modal-overlay">
      <div className="modal-content">

        {/* HEADER */}
        <div className="modal-header">
          <h3>Punição ao Usuário</h3>
          <button className="close-btn" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* BODY */}
        <div className="modal-body">
          <p>
            Você está aplicando uma punição ao usuário:
            <strong> {denuncia?.denunciado_detalhes?.nome}</strong>
          </p>

          {/* Tipo */}
          <label className="form-label">Tipo de Punição</label>
          <select
            className="form-select"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            <option value="advertencia">Advertência</option>
            <option value="suspensao">Suspensão (dias)</option>
            <option value="banimento">Banimento permanente</option>
          </select>

          {/* Motivo */}
          <label className="form-label">Motivo</label>
          <textarea
            className="form-control"
            placeholder="Descreva o motivo da punição..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          ></textarea>

          {/* Dias */}
          {tipo === "suspensao" && (
            <>
              <label className="form-label">Dias de Suspensão</label>
              <input
                type="number"
                min="1"
                className="form-control"
                value={dias}
                onChange={(e) => setDias(Number(e.target.value))}
              />
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>

          <button
            className="btn btn-danger"
            onClick={aplicar}
            disabled={loading}
          >
            {loading ? "Aplicando..." : "Aplicar Punição"}
          </button>
        </div>

      </div>
    </div>
  );
}
