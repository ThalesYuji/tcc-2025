// src/Paginas/HistoricoPunicoes.jsx
import React, { useEffect, useState } from "react";
import {
  listarHistoricoPunicoes,
  listarPunicoesPorUsuario,
  removerPunicao,
} from "../Servicos/Api";
import "../styles/HistoricoPunicoes.css"; // NOVO CSS SEPARADO

export default function HistoricoPunicoes() {
  const [punicoes, setPunicoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("Todos");
  const [removendo, setRemovendo] = useState(null);

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

  const punicoesFiltradas = punicoes.filter((p) => {
    const matchTipo = tipoFiltro === "Todos" || p.tipo === tipoFiltro;
    const matchBusca =
      !busca ||
      (p.usuario_nome || "").toLowerCase().includes(busca.toLowerCase());
    return matchTipo && matchBusca;
  });

  async function handleRemover(id) {
    const confirmar = window.confirm(
      "Deseja remover esta punição do histórico? Isso não desfaz suspensões/banimentos já aplicados."
    );

    if (!confirmar) return;

    setRemovendo(id);

    try {
      await removerPunicao(id);

      setPunicoes((prev) => prev.filter((p) => p.id !== id));

      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: {
            type: "success",
            title: "Punição removida",
            message: "O registro foi removido com sucesso.",
          },
        })
      );
    } catch (e) {
      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: {
            type: "error",
            title: "Erro",
            message: "Não foi possível remover a punição.",
          },
        })
      );
    }

    setRemovendo(null);
  }

  function BadgeTipo({ tipo }) {
    const map = {
      advertencia: { label: "Advertência", cls: "badge-warning" },
      suspensao: { label: "Suspensão", cls: "badge-info" },
      banimento: { label: "Banimento", cls: "badge-danger" },
    };
    const item = map[tipo] || { label: tipo, cls: "badge-default" };

    return <span className={`hp-badge ${item.cls}`}>{item.label}</span>;
  }

  if (carregando) {
    return (
      <div className="hp-loading">
        <div className="hp-spinner"></div>
        <p>Carregando histórico...</p>
      </div>
    );
  }

  return (
    <div className="hp-container">
      {/* Título */}
      <h1 className="hp-title">
        <i className="bi bi-gavel"></i> Histórico de Punições
      </h1>
      <p className="hp-subtitle">
        Todos os registros de advertências, suspensões e banimentos
      </p>

      {erro && <div className="hp-error">{erro}</div>}

      {/* Filtros */}
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

      {/* Lista */}
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
              <div key={p.id} className="hp-card">
                <div className="hp-card-header">
                  <h3>
                    <i className="bi bi-gavel"></i> Punição #{p.id}
                  </h3>
                  <BadgeTipo tipo={p.tipo} />
                </div>

                <div className="hp-info">
                  <p>
                    <strong>Usuário</strong> {p.usuario_nome}
                  </p>
                  <p>
                    <strong>Motivo</strong> {p.motivo}
                  </p>
                  <p>
                    <strong>Aplicada em</strong> {criado}
                  </p>
                  <p>
                    <strong>Válida até</strong> {validade}
                  </p>
                  <p>
                    <strong>Administrador</strong> {p.admin_nome || "—"}
                  </p>
                </div>

                <button
                  className="hp-btn-remove"
                  onClick={() => handleRemover(p.id)}
                  disabled={removendo === p.id}
                >
                  {removendo === p.id ? "Removendo..." : "Remover Registro"}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
