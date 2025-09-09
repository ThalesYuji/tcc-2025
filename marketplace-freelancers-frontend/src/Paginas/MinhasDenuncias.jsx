// src/Paginas/MinhasDenuncias.jsx
import React, { useEffect, useState, useContext } from "react";
import api from "../Servicos/Api";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import { useNavigate } from "react-router-dom";
import "../styles/MinhasDenuncias.css";

export default function MinhasDenuncias() {
  const { usuarioLogado } = useContext(UsuarioContext);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [enviadas, setEnviadas] = useState([]);
  const [recebidas, setRecebidas] = useState([]);
  const [erro, setErro] = useState("");
  const [abaAtiva, setAbaAtiva] = useState("feitas"); // "feitas" ou "recebidas"

  useEffect(() => {
    async function carregarEnviadas() {
      const res = await api.get("/denuncias/?tipo=enviadas", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEnviadas(res.data || []);
    }

    async function carregarRecebidas() {
      const res = await api.get("/denuncias/?tipo=recebidas", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecebidas(res.data || []);
    }

    async function fetchDenuncias() {
      try {
        setErro("");
        await Promise.all([carregarEnviadas(), carregarRecebidas()]);
      } catch (err) {
        console.error(err);
        setErro("❌ Erro ao carregar suas denúncias. Tente novamente mais tarde.");
      }
    }

    if (usuarioLogado) {
      fetchDenuncias();
    }
  }, [usuarioLogado, token]);

  const Badge = ({ status }) => {
    const map = {
      Pendente: "warning",
      Analisando: "primary",
      Resolvida: "success",
    };
    const cls = map[status] ?? "secondary";
    return <span className={`denuncias-badge ${cls}`}>{status}</span>;
  };

  const UsuarioNome = ({ usuario }) => (
    <span className="link-perfil" onClick={() => navigate(`/perfil/${usuario.id}`)}>
      {usuario.nome}
    </span>
  );

  const denunciasAtivas = abaAtiva === "feitas" ? enviadas : recebidas;

  return (
    <div className="denuncias-container">
      <div className="main-box">
        <h2 className="denuncias-title">🚨 Minhas Denúncias</h2>

        {erro && <p className="erro-msg">{erro}</p>}

        {/* Abas */}
        <div className="denuncias-tabs">
          <button
            onClick={() => setAbaAtiva("feitas")}
            className={`denuncias-tab ${abaAtiva === "feitas" ? "active" : ""}`}
          >
            🧾 Denúncias feitas
          </button>
          <button
            onClick={() => setAbaAtiva("recebidas")}
            className={`denuncias-tab ${abaAtiva === "recebidas" ? "active" : ""}`}
          >
            📥 Denúncias recebidas
          </button>
        </div>

        {/* Tabela */}
        <div className="denuncias-table-wrap">
          {denunciasAtivas.length === 0 ? (
            <div className="denuncias-empty">
              {abaAtiva === "feitas"
                ? "Você ainda não fez nenhuma denúncia."
                : "Você ainda não recebeu nenhuma denúncia."}
            </div>
          ) : (
            <table className="denuncias-table">
              <thead>
                <tr>
                  {abaAtiva === "feitas" ? (
                    <>
                      <th>Contrato</th>
                      <th>Denunciado</th>
                      <th className="hide-mobile">Motivo</th>
                      <th>Status</th>
                      <th className="hide-mobile">Resposta Admin</th>
                      <th>Data</th>
                    </>
                  ) : (
                    <>
                      <th>Contrato</th>
                      <th>Denunciante</th>
                      <th className="hide-mobile">Motivo</th>
                      <th>Status</th>
                      <th className="hide-mobile">Resposta Admin</th>
                      <th>Data</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {denunciasAtivas.map((denuncia) => {
                  const quemObj =
                    abaAtiva === "feitas"
                      ? denuncia.denunciado_detalhes
                      : denuncia.denunciante;

                  const quemNome =
                    abaAtiva === "feitas"
                      ? denuncia.denunciado_detalhes?.nome || "Usuário"
                      : denuncia.denunciante?.nome || "Usuário";

                  const data = denuncia.data_criacao
                    ? new Date(denuncia.data_criacao).toLocaleDateString("pt-BR")
                    : "—";

                  return (
                    <tr key={denuncia.id}>
                      <td>{denuncia.contrato_titulo || denuncia.contrato?.titulo || "—"}</td>
                      <td>
                        {quemObj ? (
                          <UsuarioNome usuario={quemObj} />
                        ) : (
                          <span>{quemNome}</span>
                        )}
                      </td>
                      <td className="hide-mobile cell-truncate">
                        {denuncia.motivo?.trim()
                          ? denuncia.motivo.length > 50
                            ? `${denuncia.motivo.substring(0, 50)}...`
                            : denuncia.motivo
                          : "—"}
                      </td>
                      <td>
                        <Badge status={denuncia.status} />
                      </td>
                      <td className="hide-mobile cell-truncate">
                        {denuncia.resposta_admin
                          ? denuncia.resposta_admin.length > 50
                            ? `${denuncia.resposta_admin.substring(0, 50)}...`
                            : denuncia.resposta_admin
                          : <em>Aguardando resposta</em>}
                      </td>
                      <td>{data}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
