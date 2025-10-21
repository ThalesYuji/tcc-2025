// src/Paginas/CheckoutRetorno.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../Servicos/Api";
import "../styles/CheckoutRetorno.css";

function Row({ label, value, onCopy }) {
  return (
    <div className="data-row">
      <div className="data-row-label">{label}</div>
      <div className={`data-row-value ${!value ? 'empty' : ''}`}>
        {value || "—"}
      </div>
      {value ? (
        <button className="btn-copy" onClick={() => onCopy?.(value)}>
          <i className="bi bi-clipboard"></i>
          Copiar
        </button>
      ) : (
        <div className="btn-copy-placeholder" />
      )}
    </div>
  );
}

export default function CheckoutRetorno() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  // Params do MP
  const qs = useMemo(() => new URLSearchParams(params), [params]);
  const paymentId = qs.get("payment_id") || qs.get("collection_id");
  const status = qs.get("status"); // approved | pending | failure
  const externalReference = qs.get("external_reference");
  const preferenceId = qs.get("preference_id");
  const paymentType = qs.get("payment_type");
  const merchantOrderId = qs.get("merchant_order_id");

  const [msg, setMsg] = useState("Confirmando pagamento com o servidor...");
  const [tipo, setTipo] = useState("info"); // info | sucesso | erro
  const [pagamentoLocal, setPagamentoLocal] = useState(null);
  const [tentativas, setTentativas] = useState(0);

  const copiar = async (texto) => {
    try { 
      await navigator.clipboard.writeText(String(texto));
    } catch {}
  };

  // Chama um endpoint de confirmação (fallback do webhook) uma vez
  useEffect(() => {
    (async () => {
      try {
        await api.post("/pagamentos/confirmar_retorno/", {
          payment_id: paymentId,
          external_reference: externalReference,
        });
      } catch {
        // silencioso — o polling abaixo continua tentando
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, externalReference]);

  // Poll no backend procurando o pagamento local
  useEffect(() => {
    let t = 0;

    async function tick() {
      setTentativas((v) => v + 1);
      try {
        const resp = await api.get("/pagamentos/?page_size=50");
        const results = resp?.data?.results || [];

        let encontrado = null;
        if (paymentId) {
          encontrado = results.find(
            (p) => String(p.mercadopago_payment_id) === String(paymentId)
          );
        }
        if (!encontrado && externalReference) {
          encontrado = results.find(
            (p) => String(p.contrato?.id) === String(externalReference)
          );
        }

        if (encontrado) {
          setPagamentoLocal(encontrado);

          if (encontrado.status === "aprovado") {
            setTipo("sucesso");
            setMsg("Pagamento aprovado! Concluindo…");
            return;
          }
          if (encontrado.status === "rejeitado") {
            setTipo("erro");
            setMsg("Pagamento rejeitado. Tente novamente.");
            return;
          }

          setTipo("info");
          setMsg("Aguardando confirmação do Mercado Pago (webhook)...");
        } else {
          setTipo("info");
          setMsg(
            status === "approved"
              ? "Pagamento possivelmente aprovado. Aguardando o webhook confirmar…"
              : "Aguardando confirmação do Mercado Pago…"
          );
        }
      } catch {
        // ignora erros temporários
      }

      if (t >= 22) { // ~44s
        setTipo(status === "approved" ? "sucesso" : "erro");
        setMsg(
          status === "approved"
            ? "Pagamento pode ter sido aprovado, mas ainda não confirmou. Verifique seus contratos em alguns instantes."
            : "Não foi possível confirmar o pagamento agora."
        );
        return;
      }

      t += 1;
      setTimeout(tick, 2000);
    }

    tick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, externalReference, status]);

  const getStatusIcon = () => {
    if (tipo === "sucesso") return "bi-check-circle-fill";
    if (tipo === "erro") return "bi-x-circle-fill";
    return "bi-arrow-repeat";
  };

  const showLoadingDots = tipo === "info" && tentativas > 0;

  return (
    <div className="checkout-retorno-container">
      <div className="checkout-retorno-content">
        {/* Header */}
        <div className="checkout-retorno-header">
          <h2>
            <div className="checkout-retorno-icon">
              <i className="bi bi-credit-card-2-front"></i>
            </div>
            Retornando do Mercado Pago
          </h2>
        </div>

        {/* Card principal */}
        <div className="checkout-retorno-card">
          {/* Mensagem de status */}
          <div className={`status-message ${tipo}`}>
            <i className={`bi ${getStatusIcon()}`}></i>
            <div>
              {msg}
              {showLoadingDots && (
                <span className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              )}
            </div>
          </div>

          {/* Parâmetros do Mercado Pago */}
          <div className="info-section">
            <h5>
              <i className="bi bi-receipt"></i>
              Parâmetros recebidos do Mercado Pago
            </h5>
            <Row label="Payment ID / Collection ID" value={paymentId} onCopy={copiar} />
            <Row label="Status" value={status} onCopy={copiar} />
            <Row label="External Reference (Contrato)" value={externalReference} onCopy={copiar} />
            <Row label="Preference ID" value={preferenceId} onCopy={copiar} />
            <Row label="Payment Type" value={paymentType} onCopy={copiar} />
            <Row label="Merchant Order ID" value={merchantOrderId} onCopy={copiar} />
            <Row label="URL Completa" value={window.location.href} onCopy={copiar} />
          </div>

          {/* Status no backend */}
          <div className="info-section">
            <h5>
              <i className="bi bi-server"></i>
              Status no seu backend
            </h5>
            <Row 
              label="Pagamento Local ID" 
              value={pagamentoLocal?.id ? String(pagamentoLocal.id) : null} 
              onCopy={copiar}
            />
            <Row 
              label="Status Local" 
              value={pagamentoLocal?.status || null} 
              onCopy={copiar}
            />
            <Row 
              label="MP Payment ID Salvo" 
              value={pagamentoLocal?.mercadopago_payment_id || null} 
              onCopy={copiar}
            />
          </div>

          {/* Ações */}
          <div className="checkout-actions">
            <button 
              className="btn-primary-action" 
              onClick={() => navigate("/contratos")}
            >
              <i className="bi bi-arrow-left-circle"></i>
              Voltar aos contratos
            </button>
            <button 
              className="btn-secondary-action" 
              onClick={() => window.location.reload()}
            >
              <i className="bi bi-arrow-clockwise"></i>
              Recarregar página
            </button>
          </div>

          {/* Footer com tentativas */}
          <div className="checkout-footer">
            <div className="tentativas-info">
              <i className="bi bi-clock-history"></i>
              Tentativas de verificação: 
              <span className="tentativas-numero">{tentativas}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}