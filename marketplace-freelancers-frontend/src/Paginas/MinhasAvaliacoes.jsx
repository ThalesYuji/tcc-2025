// src/Paginas/MinhasAvaliacoes.jsx
import React, { useEffect, useState, useContext } from "react";
import api from "../Servicos/Api";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import { useNavigate } from "react-router-dom";
import "../styles/MinhasAvaliacoes.css";

export default function MinhasAvaliacoes() {
  const { usuarioLogado } = useContext(UsuarioContext);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [minhasAvaliacoes, setMinhasAvaliacoes] = useState([]);
  const [avaliacoesRecebidas, setAvaliacoesRecebidas] = useState([]);
  const [erro, setErro] = useState("");
  const [abaAtiva, setAbaAtiva] = useState("feitas"); // "feitas" ou "recebidas"

  useEffect(() => {
    async function fetchAvaliacoes() {
      try {
        const feitasResp = await api.get("/avaliacoes/feitas/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMinhasAvaliacoes(feitasResp.data);

        const recebidasResp = await api.get("/avaliacoes/recebidas/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAvaliacoesRecebidas(recebidasResp.data);
      } catch {
        setErro("❌ Erro ao carregar suas avaliações. Tente novamente mais tarde.");
      }
    }

    if (usuarioLogado) fetchAvaliacoes();
  }, [usuarioLogado, token]);

  // 🔹 Renderização de estrelas
  const renderEstrelas = (nota) => (
    <span className="avaliacoes-estrelas">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < nota ? "estrela cheia" : "estrela vazia"}>
          ★
        </span>
      ))}
      <span className="nota-numero">({nota})</span>
    </span>
  );

  // 🔹 Link para perfil
  const UsuarioNome = ({ usuario }) => (
    <span
      className="link-perfil"
      onClick={() => navigate(`/perfil/${usuario.id}`)}
    >
      {usuario.nome}
    </span>
  );

  const avaliacoesAtivas = abaAtiva === "feitas" ? minhasAvaliacoes : avaliacoesRecebidas;

  return (
    <div className="avaliacoes-container">
      <div className="main-box">
        <h2 className="avaliacoes-title">⭐ Minhas Avaliações</h2>

        {erro && <p className="error-msg">{erro}</p>}

        {/* 🔹 Abas */}
        <div className="avaliacoes-tabs">
          <button
            onClick={() => setAbaAtiva("feitas")}
            className={`avaliacoes-tab ${abaAtiva === "feitas" ? "active" : ""}`}
          >
            🧾 Avaliações feitas
          </button>
          <button
            onClick={() => setAbaAtiva("recebidas")}
            className={`avaliacoes-tab ${abaAtiva === "recebidas" ? "active" : ""}`}
          >
            📥 Avaliações recebidas
          </button>
        </div>

        {/* 🔹 Tabela de avaliações */}
        <div className="avaliacoes-table-wrap">
          {avaliacoesAtivas.length === 0 ? (
            <div className="avaliacoes-vazio">
              {abaAtiva === "feitas"
                ? "Você ainda não avaliou ninguém."
                : "Você ainda não recebeu nenhuma avaliação."}
            </div>
          ) : (
            <table className="avaliacoes-table">
              <thead>
                <tr>
                  {abaAtiva === "feitas" ? (
                    <>
                      <th>Contrato</th>
                      <th>Avaliado</th>
                      <th>Nota</th>
                      <th>Comentário</th>
                      <th>Data</th>
                    </>
                  ) : (
                    <>
                      <th>Avaliador</th>
                      <th>Nota</th>
                      <th>Comentário</th>
                      <th>Data</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {avaliacoesAtivas.map((avaliacao) => (
                  <tr key={avaliacao.id}>
                    {abaAtiva === "feitas" ? (
                      <>
                        <td>{avaliacao.titulo_trabalho || "—"}</td>
                        <td><UsuarioNome usuario={avaliacao.avaliado} /></td>
                        <td>{renderEstrelas(avaliacao.nota)}</td>
                        <td className="avaliacoes-comentario">
                          {avaliacao.comentario || <em>Sem comentário</em>}
                        </td>
                        <td>
                          {new Date(avaliacao.data_avaliacao).toLocaleDateString("pt-BR")}
                        </td>
                      </>
                    ) : (
                      <>
                        <td><UsuarioNome usuario={avaliacao.avaliador} /></td>
                        <td>{renderEstrelas(avaliacao.nota)}</td>
                        <td className="avaliacoes-comentario">
                          {avaliacao.comentario || <em>Sem comentário</em>}
                        </td>
                        <td>
                          {new Date(avaliacao.data_avaliacao).toLocaleDateString("pt-BR")}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
