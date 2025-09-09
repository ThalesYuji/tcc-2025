// src/Paginas/Contratos.jsx
import React, { useEffect, useState, useContext } from "react";
import api from "../Servicos/Api";
import { useNavigate, Link } from "react-router-dom";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import "../styles/Contratos.css";

export default function Contratos() {
  const [contratos, setContratos] = useState([]);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const userId = parseInt(localStorage.getItem("userId"));
  const token = localStorage.getItem("token");

  const navigate = useNavigate();
  const { usuarioLogado } = useContext(UsuarioContext);

  useEffect(() => {
    async function fetchContratos() {
      try {
        const response = await api.get("/contratos/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setContratos(response.data);
      } catch (error) {
        let msg = "Erro ao carregar contratos.";
        if (
          error.response &&
          error.response.data &&
          (typeof error.response.data === "string" || error.response.data.detail)
        ) {
          msg =
            error.response.data.detail ||
            error.response.data ||
            "Erro ao carregar contratos.";
        }
        setErro(msg);
      }
    }
    fetchContratos();
  }, [token]);

  return (
    <div className="contratos-container">
      <div className="main-box">
        {/* 🔹 Título */}
        <h2 className="contratos-title">📝 Meus Contratos</h2>

        {/* 🔹 Mensagens */}
        {erro && <p className="contratos-msg erro">{erro}</p>}
        {sucesso && <p className="contratos-msg sucesso">{sucesso}</p>}

        {/* 🔹 Nenhum contrato */}
        {contratos.length === 0 && (
          <p className="contratos-vazio">Você ainda não possui contratos.</p>
        )}

        <div className="contratos-lista">
          {contratos.map((contrato) => {
            const souCliente = contrato.cliente.id === userId;
            const souFreelancer = contrato.freelancer.id === userId;
            const jaAvaliei = contrato.avaliacoes?.some(
              (a) => a.avaliador === userId
            );

            return (
              <div key={contrato.id} className="contrato-card">
                <p>
                  <strong>Trabalho:</strong> {contrato.trabalho.titulo}
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  <span className={`status-badge ${contrato.status}`}>
                    {contrato.status}
                  </span>
                </p>
                <p><strong>Cliente:</strong> {contrato.cliente.nome}</p>
                <p><strong>Freelancer:</strong> {contrato.freelancer.nome}</p>
                <p><strong>Início:</strong> {contrato.data_inicio}</p>
                {contrato.data_fim && (
                  <p><strong>Fim:</strong> {contrato.data_fim}</p>
                )}

                {/* 🔹 Botão Chat */}
                <Link
                  to={`/contratos/${contrato.id}/chat`}
                  className="btn-chat"
                  onClick={() => setSucesso("Abrindo chat do contrato...")}
                >
                  💬 Abrir Chat
                </Link>

                {/* 🔹 Área de pagamento */}
                {contrato.status === "ativo" ? (
                  souCliente && usuarioLogado?.tipo === "cliente" ? (
                    <>
                      {contrato.pagamento ? (
                        <p
                          className={`contrato-pagamento ${contrato.pagamento.status}`}
                        >
                          Pagamento: {contrato.pagamento.metodo.toUpperCase()} |{" "}
                          Status: {contrato.pagamento.status.toUpperCase()}
                        </p>
                      ) : (
                        <button
                          onClick={() => {
                            setSucesso("Redirecionando para pagamento...");
                            navigate(`/contratos/${contrato.id}/pagamento`);
                          }}
                          className="btn-pagar"
                        >
                          💰 Pagar
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="contrato-info">
                      Apenas o cliente responsável pode pagar este contrato.
                    </p>
                  )
                ) : (
                  <p className="contrato-info">
                    Este contrato já foi finalizado.
                  </p>
                )}

                {/* 🔹 Avaliação */}
                {contrato.status === "concluido" &&
                  (souCliente || souFreelancer) &&
                  !jaAvaliei && (
                    <button
                      onClick={() => {
                        setSucesso("Redirecionando para avaliação...");
                        navigate(`/contratos/${contrato.id}/avaliacao`);
                      }}
                      className="btn-avaliar"
                    >
                      ⭐ Avaliar
                    </button>
                  )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
