// src/Paginas/CheckoutRetorno.jsx
// Tela de retorno do Checkout Pro. Exibe status enquanto o webhook confirma.
import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../Servicos/Api";

export default function CheckoutRetorno() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [mensagem, setMensagem] = useState("Processando pagamento...");
  const [tipo, setTipo] = useState("info"); // info | sucesso | erro

  // O MP retorna alguns params como: status, payment_id, preference_id, external_reference etc.
  const externalReference = params.get("external_reference"); // é o id do contrato que mandamos
  const mpPaymentId = params.get("payment_id");
  const statusUrlParam = params.get("status"); // approved | pending | failure (pelo redirecionamento)

  useEffect(() => {
    let polling;
    const start = async () => {
      // Se veio 'approved' já pelo redirect, ainda assim esperamos o webhook aplicar no backend.
      setMensagem("Confirmando pagamento com o servidor...");
      let tentativas = 0;

      polling = setInterval(async () => {
        tentativas += 1;

        try {
          // Estratégia simples: buscar os pagamentos do usuário e checar se algum do contrato foi aprovado.
          // Se você tiver endpoint específico para buscar pagamento por contrato, use-o aqui.
          // Abaixo exemplificamos chamando sua listagem geral e filtrando no front:
          const lista = await api.get("/pagamentos/?page_size=50");
          const pagamentos = lista.data?.results || [];

          // prioridade: se conhecemos o payment_id retornado pelo MP
          let pagamento = null;
          if (mpPaymentId) {
            pagamento = pagamentos.find(p => String(p.mercadopago_payment_id) === String(mpPaymentId));
          }
          // fallback: pelo external_reference (id do contrato)
          if (!pagamento && externalReference) {
            pagamento = pagamentos.find(p => String(p.contrato?.id) === String(externalReference));
          }

          if (pagamento?.status === "aprovado") {
            clearInterval(polling);
            setTipo("sucesso");
            setMensagem("✅ Pagamento aprovado! Concluindo...");
            setTimeout(() => navigate("/contratos"), 2000);
          } else if (pagamento?.status === "rejeitado") {
            clearInterval(polling);
            setTipo("erro");
            setMensagem("❌ Pagamento rejeitado. Tente novamente.");
          }
        } catch {
          // ignora e segue tentando
        }

        // timeout de segurança (~60s)
        if (tentativas >= 20) {
          clearInterval(polling);
          setTipo(statusUrlParam === "approved" ? "sucesso" : "erro");
          setMensagem(
            statusUrlParam === "approved"
              ? "Pagamento possivelmente aprovado, mas não confirmado ainda. Verifique seus contratos em alguns instantes."
              : "Não foi possível confirmar o pagamento. Tente novamente."
          );
        }
      }, 3000);
    };

    start();
    return () => polling && clearInterval(polling);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{maxWidth: 600, margin: "40px auto", textAlign: "center"}}>
      <h2>Retornando do Mercado Pago</h2>
      <p className={tipo === "sucesso" ? "text-success" : tipo === "erro" ? "text-danger" : "text-muted"}>
        {mensagem}
      </p>
      <div style={{marginTop: 20}}>
        <button className="btn btn-secondary" onClick={()=>navigate("/contratos")}>
          Voltar aos contratos
        </button>
      </div>
    </div>
  );
}
