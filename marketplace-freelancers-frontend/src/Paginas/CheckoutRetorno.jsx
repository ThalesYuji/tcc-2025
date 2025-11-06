// src/Paginas/CheckoutRetorno.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../Servicos/Api";
import "../styles/CheckoutRetorno.css";

export default function CheckoutRetorno() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  // Params do Mercado Pago
  const qs = useMemo(() => new URLSearchParams(params), [params]);
  const paymentId = qs.get("payment_id") || qs.get("collection_id");
  const externalReference = qs.get("external_reference"); // 🔹 removido "status"

  // Estados de exibição
  const [msg, setMsg] = useState("Confirmando pagamento com o servidor...");
  const [tipo, setTipo] = useState("info"); // info | sucesso | erro

  // ⚙️ Tenta forçar confirmação inicial no backend (fallback ao webhook)
  useEffect(() => {
    (async () => {
      try {
        await api.post("/pagamentos/confirmar_retorno/", {
          payment_id: paymentId,
          external_reference: externalReference,
        });
      } catch {
        // silencioso — o polling abaixo continuará tentando
      }
    })();
  }, [paymentId, externalReference]);

  // ✅ Redireciona automaticamente quando o pagamento é confirmado
  useEffect(() => {
    if (tipo !== "sucesso") return;
    const t = setTimeout(() => {
      navigate("/contratos", { replace: true });
    }, 2000);
    return () => clearTimeout(t);
  }, [tipo, navigate]);

  // 🔁 Polling automático a cada 3 segundos
  useEffect(() => {
    let parar = false;
    let tentativas = 0;

    async function verificarStatus() {
      if (parar) return;

      try {
        let pagamento = null;

        // 1️⃣ Busca direta no endpoint de status
        if (paymentId) {
          try {
            const res = await api.get(`/pagamentos/${paymentId}/status/`);
            pagamento = res.data;
          } catch {
            // ignora erros 404 enquanto o pagamento ainda não existe
          }
        }

        // 2️⃣ Fallback por external_reference
        if (!pagamento) {
          const resp = await api.get("/pagamentos/?page_size=50");
          const results = resp?.data?.results || [];
          pagamento = results.find(
            (p) =>
              String(p.mercadopago_payment_id) === String(paymentId) ||
              String(p.contrato?.id) === String(externalReference)
          );
        }

        // 3️⃣ Atualiza status na tela
        if (pagamento) {
          const statusLocal = pagamento.status;
          if (statusLocal === "aprovado") {
            setTipo("sucesso");
            setMsg("Pagamento aprovado com sucesso!");
            parar = true;
            return;
          } else if (statusLocal === "rejeitado") {
            setTipo("erro");
            setMsg("Pagamento rejeitado. Tente novamente ou entre em contato com o suporte.");
            parar = true;
            return;
          } else {
            setTipo("info");
            setMsg("Aguardando confirmação do pagamento...");
          }
        } else {
          setTipo("info");
          setMsg("Processando confirmação do Mercado Pago...");
        }
      } catch (error) {
        console.error("Erro ao verificar pagamento:", error);
      }

      tentativas += 1;

      // 4️⃣ Timeout após 3 minutos
      if (tentativas >= 60) {
        setTipo("erro");
        setMsg("Tempo limite atingido. Verifique seus contratos manualmente.");
        parar = true;
        return;
      }

      if (!parar) setTimeout(verificarStatus, 3000);
    }

    verificarStatus();
    return () => {
      parar = true;
    };
  }, [paymentId, externalReference]);

  const getStatusIcon = () => {
    if (tipo === "sucesso") return "bi-check-circle-fill";
    if (tipo === "erro") return "bi-x-circle-fill";
    return "bi-hourglass-split";
  };

  const getStatusClass = () => {
    if (tipo === "sucesso") return "status-sucesso";
    if (tipo === "erro") return "status-erro";
    return "status-info";
  };

  return (
    <div className="checkout-retorno-page">
      <div className="checkout-retorno-wrapper">
        <div className="checkout-retorno-box">
          <div className={`status-icon-wrapper ${getStatusClass()}`}>
            <i className={`bi ${getStatusIcon()}`}></i>
          </div>

          <h2 className="status-title">{msg}</h2>

          {tipo === "info" && (
            <>
              <p className="status-description">
                Estamos verificando seu pagamento com o Mercado Pago.
                <br />
                Isso pode levar alguns segundos...
              </p>
              <div className="loading-spinner-large"></div>
            </>
          )}

          {tipo === "sucesso" && (
            <>
              <p className="status-description">
                Você será redirecionado automaticamente para seus contratos.
              </p>
              <div className="redirect-indicator">
                <div className="redirect-spinner"></div>
                <span>Redirecionando...</span>
              </div>
            </>
          )}

          {tipo === "erro" && (
            <>
              <p className="status-description">
                Caso tenha realizado o pagamento, ele pode estar sendo processado.
                <br />
                Verifique seus contratos em alguns minutos.
              </p>
              <div className="action-buttons">
                <button
                  className="btn-voltar-contratos"
                  onClick={() => navigate("/contratos")}
                >
                  <i className="bi bi-arrow-left-circle"></i>
                  Ir para contratos
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
