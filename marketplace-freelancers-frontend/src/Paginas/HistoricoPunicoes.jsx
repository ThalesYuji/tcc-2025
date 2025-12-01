import React, { useEffect, useState } from "react";
import { listarHistoricoPunicoes, removerPunicao } from "../Servicos/Api";
import {
  FaGavel,
  FaTimes,
  FaRedoAlt,
  FaExclamationCircle,
  FaTrash,
} from "react-icons/fa";
import "../styles/HistoricoPunicoes.css";

export default function HistoricoPunicoes() {
  const [punicoes, setPunicoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("Todos");
  const [removendo, setRemovendo] = useState(null);

  // modal
  const [modalAberto, setModalAberto] = useState(false);
  const [punicaoSelecionada, setPunicaoSelecionada] = useState(null);

  // CARREGAR HISTÓRICO
  async function carregarHistorico() {
    setCarregando(true);

    try {
      const data = await listarHistoricoPunicoes();
      setPunicoes(data || []);
      setErro("");
    } catch (e) {
      setErro("Erro ao carregar histórico de punições.");
    }

    setCarregando(false);
  }

  useEffect(() => {
    carregarHistorico();
  }, []);

  // FILTRAGEM
  const punicoesFiltradas = punicoes.filter((p) => {
    const matchTipo = tipoFiltro === "Todos" || p.tipo === tipoFiltro;
    const nomeUsuario = (p.usuario_punido_nome || "").toLowerCase();
    const matchBusca = !busca || nomeUsuario.includes(busca.toLowerCase());
    return matchTipo && matchBusca;
  });

  // REMOVER PUNIÇÃO
  async function confirmarRemocao() {
    setModalAberto(false);
    const id = punicaoSelecionada;
    setPunicaoSelecionada(null);

    setRemovendo(id);

    try {
      await removerPunicao(id);

      setPunicoes((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, fadingOut: true } : p
        )
      );

      setTimeout(() => {
        setPunicoes((prev) => prev.filter((p) => p.id !== id));
      }, 350);

      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: {
            type: "success",
            title: "Punição desfeita",
            message: "Os efeitos foram revertidos e o registro removido.",
          },
        })
      );
    } catch (e) {
      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: {
            type: "error",
            title: "Erro",
            message: "Não foi possível desfazer a punição.",
          },
        })
      );
    }

    setRemovendo(null);
  }

  function abrirModal(id) {
    setPunicaoSelecionada(id);
    setModalAberto(true);
  }

  function cancelarRemocao() {
    setPunicaoSelecionada(null);
    setModalAberto(false);
  }

  // BADGE DO TIPO
  function BadgeTipo({ tipo }) {
    const map = {
      advertencia: { label: "Advertência", cls: "badge-warning" },
      suspensao: { label: "Suspensão", cls: "badge-info" },
      banimento: { label: "Banimento", cls: "badge-danger" },
    };
    const item = map[tipo] || { label: tipo, cls: "badge-danger" };

    return <span className={`hp-badge ${item.cls}`}>{item.label}</span>;
  }

  // LOADING
  if (carregando) {
    return (
      <div className="historico-punicoes-page">
        <div className="page-container">
          <div className="hp-loading">
            <div className="hp-spinner"></div>
            <p>Carregando histórico de punições...</p>
          </div>
        </div>
      </div>
    );
  }

  // 🎨 RENDERIZAÇÃO
  return (
    <div className="historico-punicoes-page">
      
      {/* MODAL DE CONFIRMAÇÃO */}
      {modalAberto && (
        <div className="modal-overlay" style={{
          position: "fixed",
          top: 0, left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999
        }}>
          <div className="modal-box" style={{
            background: "#1e1f23",
            padding: "25px",
            borderRadius: "12px",
            width: "380px",
            color: "white",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            animation: "fadeIn 0.2s ease-in-out"
          }}>
            <h3 style={{ fontSize: "20px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
              <FaExclamationCircle color="#f0ad4e" />
              Desfazer punição?
            </h3>

            <p style={{ fontSize: "14px", lineHeight: "1.5", marginBottom: "20px" }}>
              Essa ação vai reverter efeitos como suspensão ou banimento
              e remover definitivamente este registro do histórico.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={cancelarRemocao}
                style={{
                  padding: "8px 14px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#555",
                  color: "white",
                  cursor: "pointer"
                }}
              >
                Cancelar
              </button>

              <button
                onClick={confirmarRemocao}
                style={{
                  padding: "8px 14px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#d9534f",
                  color: "white",
                  cursor: "pointer"
                }}
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="historico-header">
        <div className="historico-title">
          <div className="historico-title-icon">
            <FaGavel />
          </div>
          <span>Histórico de Punições</span>
        </div>
        <p className="historico-subtitle">
          Todos os registros de advertências, suspensões e banimentos na plataforma
        </p>
      </div>

      <div className="page-container">
        {erro && (
          <div className="alert-error">
            <FaExclamationCircle />
            <span>{erro}</span>
          </div>
        )}

        {/* FILTROS */}
        <div className="hp-filtros">
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            className="hp-select"
          >
            <option value="Todos">Todos os Tipos</option>
            <option value="advertencia">Advertência</option>
            <option value="suspensao">Suspensão</option>
            <option value="banimento">Banimento</option>
          </select>

          <div className="hp-search">
            <input
              type="text"
              placeholder="Buscar por usuário..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            {busca && (
              <button className="hp-clear" onClick={() => setBusca("")}>
                <FaTimes />
              </button>
            )}
          </div>

          <button className="hp-btn-refresh" onClick={carregarHistorico}>
            <FaRedoAlt />
            Atualizar
          </button>
        </div>

        {/* LISTA */}
        <div className="hp-grid">
          {punicoesFiltradas.length === 0 ? (
            <div className="hp-empty">
              <FaExclamationCircle />
              <p>Nenhum registro encontrado.</p>
            </div>
          ) : (
            punicoesFiltradas.map((p) => {
              const criado = new Date(p.criado_em).toLocaleString("pt-BR");
              const validade = p.valido_ate
                ? new Date(p.valido_ate).toLocaleString("pt-BR")
                : "Indefinida";

              return (
                <div
                  key={p.id}
                  className={`hp-card ${p.fadingOut ? "fade-out" : ""}`}
                >
                  <div className="hp-card-header">
                    <h3>
                      <FaGavel />
                      Punição #{p.id}
                    </h3>
                    <BadgeTipo tipo={p.tipo} />
                  </div>

                  <div className="hp-info">
                    <p><strong>Usuário:</strong> <span>{p.usuario_punido_nome}</span></p>
                    <p><strong>Motivo:</strong> <span>{p.motivo}</span></p>
                    <p><strong>Aplicada em:</strong> <span>{criado}</span></p>
                    <p><strong>Válida até:</strong> <span>{validade}</span></p>
                    <p><strong>Administrador:</strong> <span>{p.admin_responsavel_nome || "—"}</span></p>

                    {p.removida_por_admin_nome && (
                      <p><strong>Removida por:</strong> <span>{p.removida_por_admin_nome}</span></p>
                    )}
                  </div>

                  <button
                    className="hp-btn-remove"
                    onClick={() => abrirModal(p.id)}
                    disabled={removendo === p.id}
                  >
                    <FaTrash />
                    {removendo === p.id ? "Processando..." : "Desfazer"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
