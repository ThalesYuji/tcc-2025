import React, { useEffect, useState, useContext } from "react";
import api from "../Servicos/Api";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import { useNavigate } from "react-router-dom";

export default function Propostas() {
  const { usuarioLogado } = useContext(UsuarioContext);
  const [propostas, setPropostas] = useState([]);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);
  const [sucesso, setSucesso] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!usuarioLogado) return;
    setLoading(true);
    api.get("/propostas/")
      .then(res => {
        setPropostas(res.data);
        setErro("");
      })
      .catch(() => setErro("Erro ao buscar propostas."));
    setLoading(false);
    // eslint-disable-next-line
  }, [usuarioLogado, sucesso]);

  function formatarData(dataStr) {
    if (!dataStr) return "";
    return new Date(dataStr).toLocaleString("pt-BR");
  }

  function traduzirErroBackend(msg) {
    if (!msg) return "Erro inesperado ao processar a proposta.";
    if (
      typeof msg === "string" &&
      (
        msg.toLowerCase().includes("permission") ||
        msg.toLowerCase().includes("not allowed") ||
        msg.toLowerCase().includes("unauthorized")
      )
    ) {
      return "Você não tem permissão para realizar essa ação.";
    }
    if (
      typeof msg === "string" &&
      (msg.toLowerCase().includes("already exists") ||
        msg.toLowerCase().includes("unique"))
    ) {
      return "Já existe uma proposta enviada para esse trabalho.";
    }
    if (msg === "Não é possível enviar proposta para o próprio trabalho.") {
      return msg;
    }
    return msg;
  }

  async function aceitarOuRecusar(propostaId, status) {
    setSucesso("");
    setErro("");
    try {
      const resp = await api.patch(`/propostas/${propostaId}/alterar-status/`, { status });
      setSucesso(resp.data.mensagem || "Operação realizada com sucesso!");
    } catch (err) {
      const backendMsg =
        (err.response && err.response.data && (err.response.data.erro || err.response.data.detail)) ||
        "Erro ao alterar status.";
      setErro(traduzirErroBackend(backendMsg));
    }
  }

  if (loading) return (
    <div className="main-center">
      <div className="main-box">Carregando...</div>
    </div>
  );

  if (!usuarioLogado) return (
    <div className="main-center">
      <div className="main-box">Usuário não autenticado!</div>
    </div>
  );

  return (
    <div className="main-center">
      <div className="main-box propostas-box">
        <h2 className="propostas-title">💼 Minhas Propostas</h2>

        {sucesso && <div className="alert-success">{sucesso}</div>}
        {erro && <div className="alert-error">{erro}</div>}

        {/* FREELANCER */}
        {usuarioLogado.tipo === "freelancer" && (
          <div className="tabela-container">
            <table className="tabela-propostas">
              <thead>
                <tr>
                  <th>Trabalho</th>
                  <th>Descrição</th>
                  <th>Valor (R$)</th>
                  <th>Prazo Estimado</th>
                  <th>Status</th>
                  <th>Enviada em</th>
                </tr>
              </thead>
              <tbody>
                {propostas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="nenhum-registro">
                      Nenhuma proposta enviada ainda.
                    </td>
                  </tr>
                )}
                {propostas.map(prop => (
                  <tr key={prop.id}>
                    <td>
                      <button
                        onClick={() => navigate(`/trabalhos/detalhes/${prop.trabalho}`)}
                        className="link-acao"
                      >
                        {prop.trabalho_titulo || `Trabalho #${prop.trabalho}`}
                      </button>
                    </td>
                    <td>{prop.descricao}</td>
                    <td>R$ {Number(prop.valor).toFixed(2)}</td>
                    <td>{prop.prazo_estimado}</td>
                    <td>
                      <span className={`status-badge status-${prop.status}`}>
                        {prop.status}
                      </span>
                    </td>
                    <td>{formatarData(prop.data_envio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* CLIENTE */}
        {usuarioLogado.tipo === "cliente" && (
          <div className="tabela-container">
            <table className="tabela-propostas">
              <thead>
                <tr>
                  <th>Trabalho</th>
                  <th>Freelancer</th>
                  <th>Descrição</th>
                  <th>Valor (R$)</th>
                  <th>Prazo Estimado</th>
                  <th>Status</th>
                  <th>Enviada em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {propostas.length === 0 && (
                  <tr>
                    <td colSpan={8} className="nenhum-registro">
                      Nenhuma proposta recebida ainda.
                    </td>
                  </tr>
                )}
                {propostas.map(prop => (
                  <tr key={prop.id}>
                    <td>
                      <button
                        onClick={() => navigate(`/trabalhos/detalhes/${prop.trabalho}`)}
                        className="link-acao"
                      >
                        {prop.trabalho_titulo || `Trabalho #${prop.trabalho}`}
                      </button>
                    </td>
                    <td>
                      <span
                        className="link-acao"
                        onClick={() => navigate(`/perfil/${prop.freelancer}`)}
                        title="Ver perfil do freelancer"
                      >
                        {prop.freelancer_nome || prop.freelancer}
                      </span>
                    </td>
                    <td>{prop.descricao}</td>
                    <td>R$ {Number(prop.valor).toFixed(2)}</td>
                    <td>{prop.prazo_estimado}</td>
                    <td>
                      <span className={`status-badge status-${prop.status}`}>
                        {prop.status}
                      </span>
                    </td>
                    <td>{formatarData(prop.data_envio)}</td>
                    <td>
                      {prop.status === "pendente" ? (
                        <div className="acoes-btns">
                          <button
                            className="btn-aceitar"
                            onClick={() => aceitarOuRecusar(prop.id, "aceita")}
                          >
                            Aceitar
                          </button>
                          <button
                            className="btn-recusar"
                            onClick={() => aceitarOuRecusar(prop.id, "recusada")}
                          >
                            Recusar
                          </button>
                        </div>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
