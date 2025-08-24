import React, { useEffect, useState } from "react";
import api from "../Servicos/Api";
import ModalRespostaDenuncia from "../Componentes/ModalRespostaDenuncia";

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
        <h1 className="denuncias-title">
          <i className="fas fa-shield-alt"></i> 🚨 Painel de Denúncias
        </h1>

        {erro && (
          <div className="erro-msg">
            <i className="fas fa-exclamation-triangle me-2"></i>
            {erro}
          </div>
        )}

        {/* Estatísticas */}
        <div
          className="estatisticas-denuncias"
          style={{
            alignItems: "center",
            justifyContent: "center",
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
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
            className="btn btn-outline-primary"
            onClick={carregarDenuncias}
            disabled={carregando}
            style={{
              height: "fit-content",
              padding: "0.45rem 0.9rem",
              fontSize: "0.85rem",
              borderRadius: "8px",
            }}
          >
            <i className="fas fa-sync-alt me-2"></i> Atualizar
          </button>
        </div>

        {/* Lista de denúncias */}
        <div className="denuncias-content">
          {denuncias.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
              <div>Nenhuma denúncia encontrada</div>
              <div>Quando usuários fizerem denúncias, elas aparecerão aqui.</div>
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
                      <div>
                        <strong>Contrato:</strong>
                        <p>
                          {denuncia.contrato_titulo ||
                            denuncia.contrato?.titulo ||
                            "-"}
                        </p>

                        <strong>Data:</strong>
                        <p>{data}</p>

                        <strong>Denunciante:</strong>
                        <p className="link-perfil">
                          {denuncia.denunciante?.nome || "-"}
                        </p>

                        <strong>Denunciado:</strong>
                        <p className="link-perfil">
                          {denuncia.denunciado_detalhes?.nome ||
                            denuncia.denunciado?.nome ||
                            "-"}
                        </p>

                        <strong>Motivo:</strong>
                        <p>
                          {denuncia.motivo?.trim() ? denuncia.motivo : "-"}
                        </p>

                        {denuncia.resposta_admin && (
                          <div className="resposta-admin">
                            <strong>Resposta do Admin:</strong>
                            <p>{denuncia.resposta_admin}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      className="btn-responder"
                      onClick={() => abrirModal(denuncia)}
                    >
                      <i className="fas fa-reply"></i>
                      {denuncia.resposta_admin
                        ? "Editar Resposta"
                        : "Responder"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="d-flex justify-content-center mt-4">
            <ul
              className="pagination"
              style={{
                display: "flex",
                gap: "0.4rem",
                padding: 0,
                listStyle: "none",
              }}
            >
              <li className={`page-item ${paginaAtual === 1 && "disabled"}`}>
                <button
                  className="page-link"
                  style={{
                    borderRadius: "8px",
                    padding: "0.3rem 0.8rem",
                    fontSize: "0.85rem",
                  }}
                  onClick={() => setPaginaAtual(paginaAtual - 1)}
                >
                  Anterior
                </button>
              </li>
              {Array.from({ length: totalPaginas }, (_, i) => (
                <li
                  key={i + 1}
                  className={`page-item ${
                    paginaAtual === i + 1 ? "active" : ""
                  }`}
                >
                  <button
                    className="page-link"
                    style={{
                      borderRadius: "8px",
                      padding: "0.3rem 0.8rem",
                      fontSize: "0.85rem",
                    }}
                    onClick={() => setPaginaAtual(i + 1)}
                  >
                    {i + 1}
                  </button>
                </li>
              ))}
              <li
                className={`page-item ${
                  paginaAtual === totalPaginas && "disabled"
                }`}
              >
                <button
                  className="page-link"
                  style={{
                    borderRadius: "8px",
                    padding: "0.3rem 0.8rem",
                    fontSize: "0.85rem",
                  }}
                  onClick={() => setPaginaAtual(paginaAtual + 1)}
                >
                  Próximo
                </button>
              </li>
            </ul>
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
