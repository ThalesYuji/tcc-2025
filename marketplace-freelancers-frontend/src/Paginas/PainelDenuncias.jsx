import React, { useEffect, useState } from "react";
import api from "../Servicos/Api";
import ModalRespostaDenuncia from "../Componentes/ModalRespostaDenuncia";
import "../styles/PainelDenuncias.css";

function Badge({ status }) {
  const map = {
    Pendente: "badge-warning",
    Analisando: "badge-primary",
    Resolvida: "badge-success",
  };
  const cls = map[status] ?? "badge-secondary";
  return <span className={`badge ${cls}`}>{status}</span>;
}

export default function PainelDenuncias() {
  const [denuncias, setDenuncias] = useState([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [denunciaSelecionada, setDenunciaSelecionada] = useState(null);

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 4;

  async function carregarDenuncias() {
    setCarregando(true);
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/denuncias/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDenuncias(res.data || []);
      setErro("");
    } catch (e) {
      console.error("Erro ao carregar denúncias:", e);
      setErro("Erro ao carregar denúncias. Tente novamente mais tarde.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDenuncias();
  }, []);

  const abrirModal = (denuncia) => {
    setDenunciaSelecionada(denuncia);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setDenunciaSelecionada(null);
  };

  const atualizarDenuncia = (denunciaAtualizada) => {
    setDenuncias((prev) =>
      prev.map((d) => (d.id === denunciaAtualizada.id ? denunciaAtualizada : d))
    );
  };

  // Estatísticas
  const estatisticas = {
    total: denuncias.length,
    pendentes: denuncias.filter((d) => d.status === "Pendente").length,
    analisando: denuncias.filter((d) => d.status === "Analisando").length,
    resolvidas: denuncias.filter((d) => d.status === "Resolvida").length,
  };

  // Calcular páginas
  const totalPaginas = Math.ceil(denuncias.length / itensPorPagina);
  const indiceInicial = (paginaAtual - 1) * itensPorPagina;
  const denunciasPagina = denuncias.slice(
    indiceInicial,
    indiceInicial + itensPorPagina
  );

  if (carregando) {
    return (
      <div className="denuncias-container">
        <div className="main-box text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
          <p className="mt-2">Carregando denúncias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="denuncias-container admin-denuncias">
      <div className="main-box">
        <h1 className="denuncias-title">🚨 Painel de Denúncias</h1>

        {erro && <div className="erro-msg">{erro}</div>}

        {/* Estatísticas */}
        <div className="estatisticas-denuncias">
          <div className="estatistica-card total">
            <strong>{estatisticas.total}</strong>
            <span>Total</span>
          </div>
          <div className="estatistica-card pendentes">
            <strong>{estatisticas.pendentes}</strong>
            <span>Pendentes</span>
          </div>
          <div className="estatistica-card analisando">
            <strong>{estatisticas.analisando}</strong>
            <span>Analisando</span>
          </div>
          <div className="estatistica-card resolvidas">
            <strong>{estatisticas.resolvidas}</strong>
            <span>Resolvidas</span>
          </div>
          <button
            className="btn-atualizar"
            onClick={carregarDenuncias}
            disabled={carregando}
          >
            🔄 Atualizar
          </button>
        </div>

        {/* Lista de denúncias */}
        <div className="denuncias-content">
          {denuncias.length === 0 ? (
            <div className="empty-state">
              <p>Nenhuma denúncia encontrada.</p>
              <p>Quando usuários fizerem denúncias, elas aparecerão aqui.</p>
            </div>
          ) : (
            <div className="denuncias-grid">
              {denunciasPagina.map((denuncia) => {
                const data = denuncia.data_criacao
                  ? new Date(denuncia.data_criacao).toLocaleDateString("pt-BR")
                  : "-";

                return (
                  <div key={denuncia.id} className="denuncia-card-admin">
                    <div className="denuncia-header">
                      <h4>Denúncia #{denuncia.id}</h4>
                      <Badge status={denuncia.status} />
                    </div>

                    <div className="denuncia-info">
                      <p>
                        <strong>Contrato:</strong>{" "}
                        {denuncia.contrato_titulo ||
                          denuncia.contrato?.titulo ||
                          "-"}
                      </p>
                      <p>
                        <strong>Data:</strong> {data}
                      </p>
                      <p>
                        <strong>Denunciante:</strong>{" "}
                        {denuncia.denunciante?.nome || "-"}
                      </p>
                      <p>
                        <strong>Denunciado:</strong>{" "}
                        {denuncia.denunciado_detalhes?.nome ||
                          denuncia.denunciado?.nome ||
                          "-"}
                      </p>
                      <p>
                        <strong>Motivo:</strong>{" "}
                        {denuncia.motivo?.trim() ? denuncia.motivo : "-"}
                      </p>

                      {denuncia.resposta_admin && (
                        <div className="resposta-admin">
                          <strong>Resposta do Admin:</strong>
                          <p>{denuncia.resposta_admin}</p>
                        </div>
                      )}
                    </div>

                    <button
                      className="btn-responder"
                      onClick={() => abrirModal(denuncia)}
                    >
                      {denuncia.resposta_admin
                        ? "✏️ Editar Resposta"
                        : "💬 Responder"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="paginacao-denuncias">
            {Array.from({ length: totalPaginas }, (_, i) => (
              <button
                key={i + 1}
                className={`page-btn ${paginaAtual === i + 1 ? "ativo" : ""}`}
                onClick={() => setPaginaAtual(i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}

        {/* Modal */}
        {modalAberto && denunciaSelecionada && (
          <ModalRespostaDenuncia
            denuncia={denunciaSelecionada}
            onClose={fecharModal}
            onAtualizar={atualizarDenuncia}
          />
        )}
      </div>
    </div>
  );
}
