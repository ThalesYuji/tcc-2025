// src/Paginas/CheckoutRetorno.jsx
// Tela de retorno do Checkout Pro. Mostra IDs, copia dados e faz polling do status no backend.
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../Servicos/Api";

function Row({ label, value, onCopy }) {
  return (
    <div style={{display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8}}>
      <div style={{fontWeight: 600, minWidth: 160}}>{label}</div>
      <div style={{flex: 1, wordBreak: "break-all"}}>{value ?? "—"}</div>
      {value ? (
        <button className="btn btn-sm btn-outline-secondary" onClick={() => onCopy?.(value)}>
          Copiar
        </button>
      ) : (
        <div style={{ width: 80 }} />
      )}
    </div>
  );
}

export default function CheckoutRetorno() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  // --- Params vindos do MP ---
  const qs = useMemo(() => new URLSearchParams(params), [params]);
  const paymentId = qs.get("payment_id") || qs.get("collection_id"); // em alguns fluxos vem collection_id
  const status = qs.get("status"); // approved | pending | failure (do redirect)
  const externalReference = qs.get("external_reference"); // seu id do contrato
  const preferenceId = qs.get("preference_id");
  const paymentType = qs.get("payment_type");
  const merchantOrderId = qs.get("merchant_order_id");

  // --- Estado de confirmação no backend ---
  const [msg, setMsg] = useState("Confirmando pagamento com o servidor...");
  const [tipo, setTipo] = useState("info"); // info | sucesso | erro
  const [pagamentoLocal, setPagamentoLocal] = useState(null); // {id,status,mercadopago_payment_id,...}
  const [tentativas, setTentativas] = useState(0);

  // Copiar helper
  const copiar = async (texto) => {
    try {
      await navigator.clipboard.writeText(String(texto));
    } catch {}
  };

  // Poll no backend buscando o pagamento pelo payment_id ou pelo contrato (external_reference)
  useEffect(() => {
    let t = 0;
    async function tick() {
      setTentativas((v) => v + 1);
      try {
        // pegue bastante para garantir que venha o registro criado via webhook
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
            setMsg("✅ Pagamento aprovado! Concluindo…");
            return; // para o polling
          }
          if (encontrado.status === "rejeitado") {
            setTipo("erro");
            setMsg("❌ Pagamento rejeitado. Tente novamente.");
            return; // para o polling
          }

          // ainda pendente ou em_processamento
          setTipo("info");
          setMsg("Aguardando confirmação do Mercado Pago (webhook)...");
        } else {
          // ainda não chegou via webhook
          setTipo(status === "approved" ? "info" : "info");
          setMsg(
            status === "approved"
              ? "Pagamento possivelmente aprovado. Aguardando o webhook confirmar…"
              : "Aguardando confirmação do Mercado Pago…"
          );
        }
      } catch {
        // ignora erros transitórios
      }

      // timeout de ~60s
      if (t >= 19) {
        setTipo(status === "approved" ? "sucesso" : "erro");
        setMsg(
          status === "approved"
            ? "Pagamento pode ter sido aprovado, mas não confirmou ainda. Verifique seus contratos em alguns instantes."
            : "Não foi possível confirmar o pagamento agora."
        );
        return;
      }

      t += 1;
      poll();
    }

    function poll() {
      setTimeout(tick, 3000);
    }

    tick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, externalReference, status]);

  return (
    <div style={{maxWidth: 760, margin: "40px auto"}}>
      <h2 style={{textAlign: "center"}}>Retornando do Mercado Pago</h2>

      <div
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 12,
          border: "1px solid #e6e6e6",
          background: "#fafafa",
        }}
      >
        <p
          className={
            tipo === "sucesso"
              ? "text-success"
              : tipo === "erro"
              ? "text-danger"
              : "text-muted"
          }
          style={{marginBottom: 8}}
        >
          {msg}
        </p>

        <div style={{marginTop: 12}}>
          <h5 style={{marginBottom: 12}}>Parâmetros recebidos do Mercado Pago</h5>

          <Row label="payment_id / collection_id" value={paymentId} onCopy={copiar} />
          <Row label="status" value={status} onCopy={copiar} />
          <Row label="external_reference (Contrato)" value={externalReference} onCopy={copiar} />
          <Row label="preference_id" value={preferenceId} onCopy={copiar} />
          <Row label="payment_type" value={paymentType} onCopy={copiar} />
          <Row label="merchant_order_id" value={merchantOrderId} onCopy={copiar} />
          <Row label="URL completa" value={window.location.href} onCopy={copiar} />
        </div>

        <div style={{marginTop: 24}}>
          <h5 style={{marginBottom: 12}}>Status no seu backend</h5>
          <Row
            label="Pagamento local ID"
            value={pagamentoLocal?.id ? String(pagamentoLocal.id) : null}
            onCopy={copiar}
          />
          <Row
            label="Status local"
            value={pagamentoLocal?.status || null}
            onCopy={copiar}
          />
          <Row
            label="MP payment_id salvo"
            value={pagamentoLocal?.mercadopago_payment_id || null}
            onCopy={copiar}
          />
        </div>

        <div style={{display: "flex", gap: 12, marginTop: 24, justifyContent: "center"}}>
          <button className="btn btn-secondary" onClick={() => navigate("/contratos")}>
            Voltar aos contratos
          </button>
          <button className="btn btn-outline-secondary" onClick={() => window.location.reload()}>
            Recarregar página
          </button>
        </div>

        <div style={{marginTop: 12, textAlign: "center", fontSize: 12, color: "#888"}}>
          Tentativas de verificação: {tentativas}
        </div>
      </div>
    </div>
  );
}
