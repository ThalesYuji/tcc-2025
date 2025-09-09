// src/Paginas/PagamentoContrato.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../Servicos/Api";
import { FaArrowLeft } from "react-icons/fa";
import { FaPix, FaBarcode, FaCreditCard, FaRegCreditCard } from "react-icons/fa6";
import "../styles/PagamentoContrato.css";

export default function PagamentoContrato() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [contrato, setContrato] = useState(null);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [metodo, setMetodo] = useState("");
  const [carregando, setCarregando] = useState(true);
  const token = localStorage.getItem("token");

  // 🔹 Buscar contrato
  useEffect(() => {
    async function fetchContrato() {
      try {
        const response = await api.get(`/contratos/${id}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setContrato(response.data);
      } catch {
        setErro("Erro ao carregar contrato para pagamento.");
      } finally {
        setCarregando(false);
      }
    }
    fetchContrato();
  }, [id, token]);

  // 🔹 Confirmar pagamento
  const confirmarPagamento = async () => {
    if (!metodo) {
      setErro("Escolha uma forma de pagamento.");
      return;
    }

    setErro("");
    setSucesso("");

    const payload = {
      contrato: contrato?.id,
      cliente: contrato?.cliente?.id,
      valor: contrato?.valor,
      metodo,
    };

    try {
      await api.post("/pagamentos/", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSucesso("✅ Pagamento realizado com sucesso! O contrato foi concluído.");
      setTimeout(() => navigate("/contratos"), 2000);
    } catch (error) {
      let msg = "Erro ao registrar pagamento.";
      if (error.response?.data) {
        if (typeof error.response.data === "string") {
          msg = error.response.data;
        } else if (error.response.data.detail) {
          msg = error.response.data.detail;
        } else {
          const primeiroErro = Object.values(error.response.data)[0];
          msg = Array.isArray(primeiroErro) ? primeiroErro[0] : primeiroErro;
        }
      }
      setErro(msg);
    }
  };

  // 🔹 Render
  if (carregando) {
    return (
      <div className="main-center">
        <div className="main-box">🔄 Carregando contrato...</div>
      </div>
    );
  }

  if (!contrato) {
    return (
      <div className="main-center">
        <div className="main-box error-msg">❌ Contrato não encontrado.</div>
      </div>
    );
  }

  return (
    <div className="pagamento-container">
      <div className="main-box">
        <h2 className="pagamento-title">💳 Pagamento do Contrato</h2>

        {/* 🔹 Detalhes */}
        <div className="contrato-detalhes-grid">
          <p><strong>Trabalho:</strong> {contrato.trabalho.titulo}</p>
          <p><strong>Cliente:</strong> {contrato.cliente.nome}</p>
          <p><strong>Valor:</strong> R$ {contrato.valor}</p>
        </div>

        {/* 🔹 Mensagens */}
        {erro && <p className="pagamento-msg erro">{erro}</p>}
        {sucesso && <p className="pagamento-msg sucesso">{sucesso}</p>}

        {/* 🔹 Métodos */}
        <div className="pagamento-form">
          <h4>Escolha a forma de pagamento:</h4>
          <div className="pagamento-opcoes">
            {[
              { value: "pix", label: "PIX", icon: <FaPix /> },
              { value: "boleto", label: "Boleto", icon: <FaBarcode /> },
              { value: "credito", label: "Cartão de Crédito", icon: <FaCreditCard /> },
              { value: "debito", label: "Cartão de Débito", icon: <FaRegCreditCard /> },
            ].map((opcao) => (
              <label
                key={opcao.value}
                className={`opcao-box ${metodo === opcao.value ? "ativo" : ""}`}
              >
                <input
                  type="radio"
                  value={opcao.value}
                  checked={metodo === opcao.value}
                  onChange={(e) => setMetodo(e.target.value)}
                />
                <span className="icone">{opcao.icon}</span>
                {opcao.label}
              </label>
            ))}
          </div>
        </div>

        {/* 🔹 Botões */}
        <div className="btn-group-inline" style={{ marginTop: 20 }}>
          <button onClick={confirmarPagamento} className="btn-confirmar">
            Confirmar Pagamento
          </button>
          <button onClick={() => navigate("/contratos")} className="btn-voltar">
            <FaArrowLeft /> Voltar
          </button>
        </div>
      </div>
    </div>
  );
}
