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
  const externalReference = qs.get("external_reference");

  // Estados de exibição
  const [msg, setMsg] = useState("Confirmando pagamento com o servidor...");
  const [tipo, setTipo] = useState("info");

  // Fallback do webhook: tenta confirmar no backend
  useEffect(() => {
    (async () => {
      try {
        if (!paymentId && !externalReference) return;
        await api.post("/pagamentos/confirmar_retorno/", {
          payment_id: paymentId,
          external_reference: externalReference,
        });
      } catch {
      }
    })();
  }, [paymentId, externalReference]);

  // Redireciona automaticamente quando o pagamento é confirmado
  useEffect(() => {
    if (tipo !== "sucesso") return;
    const t = setTimeout(() => {
      navigate("/contratos", { replace: true });
    }, 2000);
    return () => clearTimeout(t);
  }, [tipo, navigate]);

  // Polling automático a cada 3s
  useEffect(() => {
    let parar = false;
    let tentativas = 0;

    async function verificarStatus() {
      if (parar) return;

      try {
        let pagamento = null;

        // consulta direta por payment_id
        if (paymentId) {
          try {
            const res = await api.get("/pagamentos/consultar-status-mp", {
              params: { payment_id: paymentId },
            });

            if (res?.data?.fonte === "local+mp") {
              pagamento = res.data.local; 
            } else if (res?.data?.fonte === "mp") {
              const mp = res.data.mp || {};
              const st = String(mp.status || "").toLowerCase();
              if (st === "approved") {
                setTipo("sucesso");
                setMsg("Pagamento aprovado com sucesso!");
                parar = true;
                return;
              } else if (st === "rejected" || st === "cancelled") {
                setTipo("erro");
                setMsg("Pagamento rejeitado. Tente novamente ou entre em contato com o suporte.");
                parar = true;
                return;
              } else {
                setTipo("info");
                setMsg("Aguardando confirmação do pagamento...");
              }
            } else {
              pagamento = res.data;
            }
          } catch {
          }
        }

        if (!pagamento && (paymentId || externalReference)) {
          try {
            const resp = await api.get("/pagamentos/?page_size=50");
            const results = resp?.data?.results || [];
            pagamento = results.find(
              (p) =>
                (paymentId && String(p.mercadopago_payment_id) === String(paymentId)) ||
                (externalReference && String(p.contrato?.id) === String(externalReference))
            );
          } catch {
          }
        }

        // 3️Atualiza status na tela (quando houver registro local)
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

      // Timeout após 3 minutos
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
