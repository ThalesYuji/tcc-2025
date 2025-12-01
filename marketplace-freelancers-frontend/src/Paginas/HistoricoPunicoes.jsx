// src/Paginas/HistoricoPunicoes.jsx
import React, { useEffect, useState } from "react";
import { listarHistoricoPunicoes, removerPunicao } from "../Servicos/Api";
import "../styles/HistoricoPunicoes.css";

export default function HistoricoPunicoes() {
  const [punicoes, setPunicoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("Todos");
  const [removendo, setRemovendo] = useState(null);

  // ======================================================
  // 🔄 CARREGAR HISTÓRICO
  // ======================================================
  async function carregarHistorico() {
    setCarregando(true);

    try {
      const data = await listarHistoricoPunicoes();
      setPunicoes(data || []);
      setErro("");
    } catch (e) {
      setErro("Erro ao carregar histórico.");
    }

    setCarregando(false);
  }

  useEffect(() => {
    carregarHistorico();
  }, []);

  // ======================================================
  // 🔍 FILTRAGEM
  // ======================================================
  const punicoesFiltradas = punicoes.filter((p) => {
    const matchTipo = tipoFiltro === "Todos" || p.tipo === tipoFiltro;

    const nomeUsuario = (p.usuario_punido_nome || "").toLowerCase();
    const matchBusca =
      !busca || nomeUsuario.includes(busca.toLowerCase());

    return matchTipo && matchBusca;
  });

  // ======================================================
  // ❌ REMOVER / DESFAZER PUNIÇÃO (com animação)
  // ======================================================
  async function handleRemover(id) {
    const confirmar = window.confirm(
      "Deseja realmente desfazer esta punição?\n\nIsso reverte efeitos como suspensão/banimento e remove o registro desta lista."
    );

    if (!confirmar) return;

    setRemovendo(id);

    try {
      await removerPunicao(id);

      // animação fade-out
      setPunicoes((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, fadingOut: true } : p
        )
      );

      // remove visualmente após a animação
      setTimeout(() => {
        setPunicoes((prev) => prev.filter((p) => p.id !== id));
      }, 350);

      // toast OK
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
      // toast ERRO
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

  // ======================================================
  // 🏷️ BADGE DO TIPO
  // ======================================================
  function BadgeTipo({ tipo }) {
    const map = {
      advertencia: { label: "Advertência", cls: "badge-warning" },
      suspensao: { label: "Suspensão", cls: "badge-info" },
      banimento: { label: "Banimento", cls: "badge-danger" },
    };
    const item = map[tipo] || { label: tipo, cls: "badge-default" };

    return <span className={`hp-badge ${item.cls}`}>{item.label}</span>;
  }

  // ======================================================
  // LOADING
  // ======================================================
  if (carregando) {
    return (
      <div className="hp-loading">
        <div className="hp-spinner"></div>
        <p>Carregando histórico...</p>
      </div>
    );
  }

  // ======================================================
  // 🎨 RENDERIZAÇÃO
  // ======================================================
  return (
    <div className="hp-container">
      <h1 className="hp-title">
        <i className="bi bi-gavel"></i> Histórico de Punições
      </h1>
      <p className="hp-subtitle">
        Todos os registros de advertências, suspensões e banimentos.
      </p>

      {erro && <div className="hp-error">{erro}</div>}

      {/* 🔍 Filtros */}
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
          <i className="bi bi-search"></i>
          <input
            type="text"
            placeholder="Buscar por usuário..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          {busca && (
            <button className="hp-clear" onClick={() => setBusca("")}>
              <i className="bi bi-x"></i>
            </button>
          )}
        </div>

        <button className="hp-btn-refresh" onClick={carregarHistorico}>
          <i className="bi bi-arrow-repeat"></i> Atualizar
        </button>
      </div>

      {/* 🧾 Lista */}
      <div className="hp-grid">
        {punicoesFiltradas.length === 0 ? (
          <div className="hp-empty">
            <i className="bi bi-inbox"></i>
            <p>Nenhum registro encontrado.</p>
          </div>
        ) : (
          punicoesFiltradas.map((p) => {
            const criado = new Date(p.criado_em).toLocaleString("pt-BR");
            const validade = p.valido_ate
              ? new Date(p.valido_ate).toLocaleString("pt-BR")
              : "—";

            return (
              <div
                key={p.id}
                className={`hp-card ${p.fadingOut ? "fade-out" : ""}`}
              >
                <div className="hp-card-header">
                  <h3>
                    <i className="bi bi-gavel"></i> Punição #{p.id}
                  </h3>
                  <BadgeTipo tipo={p.tipo} />
                </div>

                <div className="hp-info">
                  <p>
                    <strong>Usuário:</strong> {p.usuario_punido_nome}
                  </p>
                  <p>
                    <strong>Motivo:</strong> {p.motivo}
                  </p>
                  <p>
                    <strong>Aplicada em:</strong> {criado}
                  </p>
                  <p>
                    <strong>Válida até:</strong> {validade}
                  </p>
                  <p>
                    <strong>Administrador:</strong>{" "}
                    {p.admin_responsavel_nome || "—"}
                  </p>

                  {p.removida_por_admin_nome && (
                    <p>
                      <strong>Removida por:</strong>{" "}
                      {p.removida_por_admin_nome}
                    </p>
                  )}
                </div>

                {/* BOTÃO APENAS PARA ADMINS */}
                <button
                  className="hp-btn-remove"
                  onClick={() => handleRemover(p.id)}
                  disabled={removendo === p.id}
                >
                  {removendo === p.id ? "Processando..." : "Desfazer punição"}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
