// src/Paginas/DetalhesTrabalho.jsx
import React, { useEffect, useState } from "react";
import api from "../Servicos/Api";
import { getUsuarioLogado } from "../Servicos/Auth";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/DetalhesTrabalho.css";

const BASE_URL = "http://localhost:8000";

// 🔹 Função para classe do status
function getStatusClass(status) {
  switch (status) {
    case "aberto": return "status-aberto";
    case "em_andamento": return "status-andamento";
    case "concluido": return "status-concluido";
    case "cancelado": return "status-cancelado";
    case "recusado": return "status-recusado";
    default: return "status-default";
  }
}

export default function DetalhesTrabalho() {
  const { id } = useParams();
  const [trabalho, setTrabalho] = useState(null);
  const [erro, setErro] = useState("");
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ descricao: "", valor: "", prazo_estimado: "" });
  const [formErro, setFormErro] = useState("");
  const [formSucesso, setFormSucesso] = useState("");
  const [alerta, setAlerta] = useState(null);
  const navigate = useNavigate();

  // 🔹 Buscar dados
  useEffect(() => {
    api.get(`/trabalhos/${id}/`)
      .then((response) => setTrabalho(response.data))
      .catch(() => setErro("❌ Erro ao buscar o trabalho."));

    getUsuarioLogado()
      .then(setUsuarioLogado)
      .catch(() => setUsuarioLogado(null));
  }, [id]);

  // 🔹 Utilidades de data
  function formatarData(dataStr) {
    if (!dataStr) return "";
    const [ano, mes, dia] = dataStr.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  function formatarDataHora(dataStr) {
    if (!dataStr) return "";
    const d = new Date(dataStr);
    return d.toLocaleString("pt-BR");
  }

  // 🔹 Alerta central
  function mostrarAlerta(tipo, texto, destino = null) {
    setAlerta({ tipo, texto });
    setTimeout(() => {
      setAlerta(null);
      if (destino) navigate(destino);
    }, 2000);
  }

  // 🔹 Permissões
  const podeEditarOuExcluir = () =>
    usuarioLogado &&
    trabalho &&
    (usuarioLogado.id === trabalho.cliente_id || usuarioLogado.is_superuser);

  const podeEnviarProposta =
    usuarioLogado &&
    usuarioLogado.tipo === "freelancer" &&
    trabalho &&
    trabalho.status === "aberto" &&
    !trabalho.is_privado;

  const podeAceitarOuRecusar =
    usuarioLogado &&
    trabalho &&
    trabalho.is_privado &&
    trabalho.freelancer === usuarioLogado.id &&
    trabalho.status === "aberto";

  // 🔹 Excluir trabalho
  const handleDelete = async () => {
    if (!window.confirm("Tem certeza que deseja excluir este trabalho?")) return;
    try {
      await api.delete(`/trabalhos/${trabalho.id}/`);
      mostrarAlerta("sucesso", "🗑️ Trabalho excluído com sucesso!", "/trabalhos");
    } catch {
      mostrarAlerta("erro", "❌ Erro ao excluir trabalho.");
    }
  };

  // 🔹 Formulário proposta
  const abrirFormProposta = () => {
    setForm({ descricao: "", valor: "", prazo_estimado: "" });
    setFormErro("");
    setFormSucesso("");
    setShowForm(true);
  };

  const enviarProposta = async (e) => {
    e.preventDefault();
    setFormErro("");
    setFormSucesso("");

    if (!form.descricao || !form.valor || !form.prazo_estimado) {
      setFormErro("Por favor, preencha todos os campos da proposta.");
      return;
    }

    try {
      await api.post("/propostas/", {
        trabalho: trabalho.id,
        freelancer: usuarioLogado.id,
        descricao: form.descricao,
        valor: form.valor,
        prazo_estimado: form.prazo_estimado,
      });
      setFormSucesso("✅ Proposta enviada com sucesso!");
      setShowForm(false);
    } catch (err) {
      const mensagem =
        err.response?.data?.erro ||
        err.response?.data?.detail ||
        "Erro ao enviar proposta. Tente novamente.";
      setFormErro(`❌ ${mensagem}`);
    }
  };

  // 🔹 Aceitar / Recusar
  const aceitarTrabalho = async () => {
    try {
      await api.post(`/trabalhos/${trabalho.id}/aceitar/`);
      mostrarAlerta("sucesso", "✅ Trabalho aceito e contrato criado!", "/contratos");
    } catch {
      mostrarAlerta("erro", "❌ Erro ao aceitar o trabalho.");
    }
  };

  const recusarTrabalho = async () => {
    try {
      await api.post(`/trabalhos/${trabalho.id}/recusar/`);
      mostrarAlerta("info", "⚠️ Você recusou o trabalho.", "/trabalhos");
    } catch {
      mostrarAlerta("erro", "❌ Erro ao recusar o trabalho.");
    }
  };

  // 🔹 Render
  if (erro) {
    return (
      <div className="detalhes-trabalho-container">
        <div className="detalhes-trabalho-card error-msg">{erro}</div>
      </div>
    );
  }

  if (!trabalho) {
    return (
      <div className="detalhes-trabalho-container">
        <div className="detalhes-trabalho-card">🔄 Carregando trabalho...</div>
      </div>
    );
  }

  return (
    <div className="detalhes-trabalho-container">
      {alerta && (
        <div className="alerta-overlay">
          <div className={`alerta-box alerta-${alerta.tipo}`}>{alerta.texto}</div>
        </div>
      )}

      <div className="detalhes-trabalho-card">
        <h2>📄 Detalhes do Trabalho</h2>
        <p><strong>Título:</strong> {trabalho.titulo}</p>
        <p><strong>Descrição:</strong> {trabalho.descricao}</p>
        <p><strong>Prazo:</strong> {formatarData(trabalho.prazo)}</p>
        <p><strong>Orçamento:</strong> R$ {Number(trabalho.orcamento).toFixed(2)}</p>
        <p>
          <strong>Status:</strong>{" "}
          <span className={`status-badge ${getStatusClass(trabalho.status)}`}>
            {trabalho.status}
          </span>
        </p>
        <p><strong>Cliente:</strong> {trabalho.nome_cliente}</p>

        {trabalho.habilidades_detalhes?.length > 0 && (
          <p><strong>Habilidades:</strong> {trabalho.habilidades_detalhes.map(h => h.nome).join(", ")}</p>
        )}

        {trabalho.criado_em && (
          <p><strong>Criado em:</strong> {formatarDataHora(trabalho.criado_em)}</p>
        )}

        {trabalho.atualizado_em && (
          <p><strong>Atualizado em:</strong> {formatarDataHora(trabalho.atualizado_em)}</p>
        )}

        {trabalho.anexo && (
          <p>
            <strong>Anexo:</strong>{" "}
            <a
              href={`${BASE_URL}${trabalho.anexo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="link-anexo"
            >
              Ver arquivo
            </a>
          </p>
        )}

        {/* Botões principais */}
        <div className="btn-group-inline">
          <button onClick={() => navigate("/trabalhos")}>Voltar</button>
          {podeEditarOuExcluir() && (
            <>
              <button onClick={() => navigate(`/trabalhos/editar/${trabalho.id}`)}>Editar</button>
              <button className="btn-excluir" onClick={handleDelete}>Excluir</button>
            </>
          )}
        </div>

        {/* Formulário de proposta */}
        {podeEnviarProposta && (
          <div className="proposta-container">
            <button onClick={abrirFormProposta}>✉️ Enviar Proposta</button>

            {showForm && (
              <form onSubmit={enviarProposta} className="proposta-form">
                <textarea
                  placeholder="Mensagem para o cliente"
                  value={form.descricao}
                  onChange={e => setForm({ ...form, descricao: e.target.value })}
                  rows={3}
                  required
                />
                <input
                  type="number"
                  placeholder="Valor (R$)"
                  value={form.valor}
                  onChange={e => setForm({ ...form, valor: e.target.value })}
                  min="1"
                  required
                />
                <input
                  type="date"
                  value={form.prazo_estimado}
                  onChange={e => setForm({ ...form, prazo_estimado: e.target.value })}
                  required
                />
                {formErro && <div className="error-msg">{formErro}</div>}
                {formSucesso && <div className="success-msg">{formSucesso}</div>}

                <div className="btn-group-inline">
                  <button type="submit">Enviar</button>
                  <button type="button" onClick={() => setShowForm(false)}>Cancelar</button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Aceitar / Recusar */}
        {podeAceitarOuRecusar && (
          <div className="btn-group-inline">
            <button className="btn-aceitar" onClick={aceitarTrabalho}>
              Aceitar Trabalho
            </button>
            <button className="btn-recusar" onClick={recusarTrabalho}>
              Recusar Trabalho
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
