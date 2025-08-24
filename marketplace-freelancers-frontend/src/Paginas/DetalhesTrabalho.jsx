import React, { useEffect, useState } from "react";
import api from "../Servicos/Api";
import { getUsuarioLogado } from "../Servicos/Auth";
import { useParams, useNavigate } from "react-router-dom";

const BASE_URL = "http://localhost:8000";

function getStatusColor(status) {
  switch (status) {
    case "aberto": return "green";
    case "em_andamento": return "orange";
    case "concluido": return "blue";
    case "cancelado": return "red";
    default: return "gray";
  }
}

export default function DetalhesTrabalho() {
  const { id } = useParams();
  const [trabalho, setTrabalho] = useState(null);
  const [erro, setErro] = useState("");
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    descricao: "",
    valor: "",
    prazo_estimado: "",
  });
  const [formErro, setFormErro] = useState("");
  const [formSucesso, setFormSucesso] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/trabalhos/${id}/`)
      .then((response) => setTrabalho(response.data))
      .catch(() => setErro("❌ Erro ao buscar o trabalho. Por favor, tente novamente."));

    getUsuarioLogado()
      .then(setUsuarioLogado)
      .catch(() => setUsuarioLogado(null));
  }, [id]);

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

  const podeEditarOuExcluir = () => {
    if (!usuarioLogado || !trabalho) return false;
    return usuarioLogado.id === trabalho.cliente_id || usuarioLogado.is_superuser;
  };

  const handleDelete = async () => {
    const confirmar = window.confirm("Tem certeza que deseja excluir este trabalho?");
    if (!confirmar) return;
    try {
      await api.delete(`/trabalhos/${trabalho.id}/`);
      navigate("/trabalhos");
    } catch {
      alert("Erro ao excluir trabalho. Tente novamente mais tarde.");
    }
  };

  // ====== PROPOSTA ======
  const podeEnviarProposta =
    usuarioLogado &&
    usuarioLogado.tipo === "freelancer" &&
    trabalho &&
    trabalho.status === "aberto";

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
        (err.response?.data?.erro ||
         err.response?.data?.detail ||
         "Erro ao enviar proposta. Tente novamente.");
      setFormErro(`❌ ${mensagem}`);
    }
  };

  if (erro) {
    return (
      <div className="main-center">
        <div className="main-box error-msg">{erro}</div>
      </div>
    );
  }

  if (!trabalho) {
    return (
      <div className="main-center">
        <div className="main-box">🔄 Carregando trabalho...</div>
      </div>
    );
  }

  return (
    <div className="main-center">
      <div className="main-box" style={{ maxWidth: 520 }}>
        <h2 style={{ marginBottom: 18 }}>📄 Detalhes do Trabalho</h2>
        <div><strong>Título:</strong> {trabalho.titulo}</div>
        <div><strong>Descrição:</strong> {trabalho.descricao}</div>
        <div><strong>Prazo:</strong> {formatarData(trabalho.prazo)}</div>
        <div><strong>Orçamento:</strong> R$ {Number(trabalho.orcamento).toFixed(2)}</div>
        <div>
          <strong>Status:</strong>
          <span style={{
            background: getStatusColor(trabalho.status),
            color: "#fff",
            padding: "3px 10px",
            borderRadius: 6,
            marginLeft: 10,
            fontWeight: 600,
            textTransform: "capitalize"
          }}>
            {trabalho.status}
          </span>
        </div>
        <div><strong>Cliente:</strong> {trabalho.nome_cliente}</div>

        {trabalho.habilidades_detalhes?.length > 0 && (
          <div><strong>Habilidades:</strong> {trabalho.habilidades_detalhes.map(h => h.nome).join(", ")}</div>
        )}

        {trabalho.criado_em && (
          <div><strong>Criado em:</strong> {formatarDataHora(trabalho.criado_em)}</div>
        )}

        {trabalho.atualizado_em && (
          <div><strong>Atualizado em:</strong> {formatarDataHora(trabalho.atualizado_em)}</div>
        )}

        {trabalho.anexo && (
          <div>
            <strong>Anexo:</strong>{" "}
            <a
              href={`${BASE_URL}${trabalho.anexo}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#1976d2" }}
            >
              Ver arquivo
            </a>
          </div>
        )}

        {/* AÇÕES */}
        <div className="btn-group-inline" style={{ margin: "20px 0" }}>
          <button onClick={() => navigate("/trabalhos")}>Voltar</button>
          {podeEditarOuExcluir() && (
            <>
              <button onClick={() => navigate(`/trabalhos/editar/${trabalho.id}`)}>Editar</button>
              <button className="btn-excluir" onClick={handleDelete}>Excluir</button>
            </>
          )}
        </div>

        {/* FORMULÁRIO DE PROPOSTA */}
        {podeEnviarProposta && (
          <div style={{ marginTop: 24 }}>
            <button onClick={abrirFormProposta}>✉️ Enviar Proposta</button>

            {showForm && (
              <form
                onSubmit={enviarProposta}
                style={{
                  marginTop: 14,
                  background: "#f6f8fb",
                  border: "1px solid #dde4ef",
                  borderRadius: 10,
                  padding: 18
                }}
              >
                <textarea
                  placeholder="Mensagem para o cliente"
                  value={form.descricao}
                  onChange={e => setForm({ ...form, descricao: e.target.value })}
                  rows={3}
                  required
                  style={{ width: "100%", marginBottom: 10 }}
                />

                <input
                  type="number"
                  placeholder="Valor (R$)"
                  value={form.valor}
                  onChange={e => setForm({ ...form, valor: e.target.value })}
                  min="1"
                  required
                  style={{ marginBottom: 10, width: "100%" }}
                />

                <input
                  type="date"
                  value={form.prazo_estimado}
                  onChange={e => setForm({ ...form, prazo_estimado: e.target.value })}
                  required
                  style={{ marginBottom: 10, width: "100%" }}
                />

                {formErro && <div className="error-msg" style={{ marginBottom: 10 }}>{formErro}</div>}
                {formSucesso && <div className="success-msg" style={{ marginBottom: 10 }}>{formSucesso}</div>}

                <div className="btn-group-inline">
                  <button type="submit">Enviar</button>
                  <button type="button" onClick={() => setShowForm(false)}>Cancelar</button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
