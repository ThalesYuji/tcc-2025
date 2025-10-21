// src/Paginas/CheckoutRetorno.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../Servicos/Api";
import "../styles/CheckoutRetorno.css";

export default function CheckoutRetorno() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  // Params do MP
  const qs = useMemo(() => new URLSearchParams(params), [params]);
  const paymentId = qs.get("payment_id") || qs.get("collection_id");
  const status = qs.get("status");
  const externalReference = qs.get("external_reference");

  const [msg, setMsg] = useState("Confirmando pagamento com o servidor...");
  const [tipo, setTipo] = useState("info"); // info | sucesso | erro

  // Fallback do webhook: tenta forçar confirmação no backend (apenas uma vez)
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

  // REDIRECIONA automaticamente quando confirmar (tipo === "sucesso")
  useEffect(() => {
    if (tipo !== "sucesso") return;
    const t = setTimeout(() => {
      navigate("/contratos", { replace: true });
    }, 2000); // 2s para o usuário ver a mensagem de sucesso
    return () => clearTimeout(t);
  }, [tipo, navigate]);

  // Poll no backend procurando o pagamento local
  useEffect(() => {
    let parar = false;
    let t = 0;

    async function tick() {
      if (parar) return;

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
          if (encontrado.status === "aprovado") {
            setTipo("sucesso");
            setMsg("Pagamento aprovado com sucesso!");
            parar = true;
            return; // para o polling; o useEffect acima fará o redirect
          }
          if (encontrado.status === "rejeitado") {
            setTipo("erro");
            setMsg("Pagamento rejeitado. Tente novamente ou entre em contato com o suporte.");
            parar = true;
            return;
          }

          setTipo("info");
          setMsg("Aguardando confirmação do pagamento...");
        } else {
          setTipo("info");
          setMsg(
            status === "approved"
              ? "Processando pagamento aprovado..."
              : "Aguardando confirmação do Mercado Pago..."
          );
        }
      } catch (error) {
        console.error("Erro ao verificar pagamento:", error);
        // continua tentando mesmo com erro
      }

      t += 1;

      if (t >= 30) { // ~60s
        if (status === "approved") {
          setTipo("sucesso");
          setMsg("Pagamento processado! Redirecionando...");
        } else {
          setTipo("erro");
          setMsg("Não foi possível confirmar o pagamento. Verifique seus contratos ou tente novamente.");
        }
        parar = true;
        return;
      }

      // Continua o polling se não parou
      if (!parar) {
        setTimeout(tick, 2000);
      }
    }

    // Inicia o polling
    tick();

    // Cleanup
    return () => {
      parar = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, externalReference, status]);

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
          {/* Ícone de status */}
          <div className={`status-icon-wrapper ${getStatusClass()}`}>
            <i className={`bi ${getStatusIcon()}`}></i>
          </div>

          {/* Mensagem principal */}
          <h2 className="status-title">{msg}</h2>

          {/* Descrição adicional */}
          {tipo === "info" && (
            <p className="status-description">
              Estamos verificando seu pagamento com o Mercado Pago. 
              <br />
              Isso pode levar alguns segundos...
            </p>
          )}

          {tipo === "sucesso" && (
            <p className="status-description">
              Você será redirecionado automaticamente para seus contratos.
            </p>
          )}

          {tipo === "erro" && (
            <p className="status-description">
              Caso tenha realizado o pagamento, ele pode estar sendo processado.
              <br />
              Verifique seus contratos em alguns minutos.
            </p>
          )}

          {/* Loading spinner (apenas quando info) */}
          {tipo === "info" && (
            <div className="loading-spinner-large"></div>
          )}

          {/* Botão de ação (apenas em erro) */}
          {tipo === "erro" && (
            <div className="action-buttons">
              <button 
                className="btn-voltar-contratos" 
                onClick={() => navigate("/contratos")}
              >
                <i className="bi bi-arrow-left-circle"></i>
                Ir para contratos
              </button>
            </div>
          )}

          {/* Indicador de redirecionamento (apenas em sucesso) */}
          {tipo === "sucesso" && (
            <div className="redirect-indicator">
              <div className="redirect-spinner"></div>
              <span>Redirecionando...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}