import React, { useContext, useEffect, useState } from "react";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import api from "../Servicos/Api";

export default function Dashboard() {
  const { usuarioLogado } = useContext(UsuarioContext);
  const [carregando, setCarregando] = useState(true);
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (usuarioLogado !== undefined) setCarregando(false);

    async function fetchResumo() {
      try {
        const novaResumo = {};

        if (usuarioLogado?.tipo === "freelancer") {
          const res = await api.get("/propostas/");
          novaResumo.enviadas = res.data.length;
          novaResumo.aceitas = res.data.filter(p => p.status === "aceita").length;
          novaResumo.recusadas = res.data.filter(p => p.status === "recusada").length;
        }

        if (usuarioLogado?.tipo === "cliente") {
          const res = await api.get("/propostas/");
          novaResumo.recebidas = res.data.length;
          novaResumo.pendentes = res.data.filter(p => p.status === "pendente").length;
          novaResumo.aceitas = res.data.filter(p => p.status === "aceita").length;
        }

        // Busca avaliações recebidas
        const avaliacoesRes = await api.get("/avaliacoes/");
        const minhasRecebidas = avaliacoesRes.data.filter(
          (a) => a.avaliado.id === usuarioLogado.id
        );

        const media =
          minhasRecebidas.length > 0
            ? minhasRecebidas.reduce((soma, a) => soma + a.nota, 0) /
              minhasRecebidas.length
            : null;

        novaResumo.mediaAvaliacao = media;
        novaResumo.totalAvaliacoes = minhasRecebidas.length;

        setResumo(novaResumo);
      } catch (err) {
        setErro("Erro ao carregar o resumo. Tente novamente mais tarde.");
        setResumo(null);
      }
    }

    fetchResumo();
  }, [usuarioLogado]);

  if (carregando) {
    return (
      <div className="main-center">
        <div className="main-box">🔄 Carregando painel...</div>
      </div>
    );
  }

  if (!usuarioLogado) {
    return (
      <div className="main-center">
        <div className="main-box error-msg">⚠️ Usuário não autenticado!</div>
      </div>
    );
  }

  return (
    <div className="main-center">
      <div className="main-box" style={{ maxWidth: 480 }}>
        <h2 style={{ marginBottom: 18 }}>
          👋 Bem-vindo, {usuarioLogado.nome || usuarioLogado.username || usuarioLogado.email}!
        </h2>

        <p style={{ marginBottom: 18 }}>
          Tipo de conta:{" "}
          <strong>
            {usuarioLogado.tipo === "freelancer" ? "Freelancer" : "Cliente"}
          </strong>
        </p>

        {erro && (
          <div className="error-msg" style={{ marginBottom: 10 }}>
            {erro}
          </div>
        )}

        {resumo && (
          <div>
            <h3>📊 Resumo:</h3>
            <ul>
              {usuarioLogado.tipo === "freelancer" ? (
                <>
                  <li>
                    Propostas enviadas: <strong>{resumo.enviadas}</strong>
                  </li>
                  <li>
                    Propostas aceitas: <strong>{resumo.aceitas}</strong>
                  </li>
                  <li>
                    Propostas recusadas: <strong>{resumo.recusadas}</strong>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    Propostas recebidas: <strong>{resumo.recebidas}</strong>
                  </li>
                  <li>
                    Propostas pendentes: <strong>{resumo.pendentes}</strong>
                  </li>
                  <li>
                    Propostas aceitas: <strong>{resumo.aceitas}</strong>
                  </li>
                </>
              )}
              <li>
                Média de avaliação:{" "}
                {resumo.totalAvaliacoes > 0 ? (
                  <>
                    <strong>
                      {resumo.mediaAvaliacao.toFixed(1)} de 5
                    </strong>{" "}
                    ({resumo.totalAvaliacoes}{" "}
                    {resumo.totalAvaliacoes === 1
                      ? "avaliação"
                      : "avaliações"})
                  </>
                ) : (
                  "Nenhuma avaliação recebida ainda."
                )}
              </li>
            </ul>
          </div>
        )}

        <p style={{ marginTop: 16, color: "#1976d2" }}>
          Use o menu acima para navegar pelo sistema.
        </p>
      </div>
    </div>
  );
}
