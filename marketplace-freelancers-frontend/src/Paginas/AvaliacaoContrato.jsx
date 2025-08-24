// src/Paginas/AvaliacaoContrato.jsx
import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../Servicos/Api";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import { FaStar, FaRegCommentDots, FaArrowLeft } from "react-icons/fa";

export default function AvaliacaoContrato() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuarioLogado } = useContext(UsuarioContext);

  const [contrato, setContrato] = useState(null);
  const [minhaAvaliacao, setMinhaAvaliacao] = useState(null);
  const [avaliacaoOposta, setAvaliacaoOposta] = useState(null);
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function buscarDados() {
      try {
        const contratoResp = await api.get(`/contratos/${id}/`);
        setContrato(contratoResp.data);

        const respFeitas = await api.get("/avaliacoes/feitas/");
        const respRecebidas = await api.get("/avaliacoes/recebidas/");

        const minha = respFeitas.data.find((a) => a.contrato === parseInt(id));
        const outra = respRecebidas.data.find((a) => a.contrato === parseInt(id));

        setMinhaAvaliacao(minha || null);
        setAvaliacaoOposta(outra || null);
      } catch (error) {
        console.error(error);
        setErro("Erro ao buscar avaliações ou contrato.");
      }
    }

    if (usuarioLogado) {
      buscarDados();
    }
  }, [id, usuarioLogado]);

  function traduzirErroAvaliacao(msg) {
    if (!msg) return "Erro ao enviar avaliação.";
    if (typeof msg === "string" && (
      msg.toLowerCase().includes("already exists") ||
      msg.toLowerCase().includes("unique") ||
      msg.toLowerCase().includes("duplicada")
    )) {
      return "Você já enviou uma avaliação para este contrato.";
    }
    if (typeof msg === "string" && (
      msg.toLowerCase().includes("permission") ||
      msg.toLowerCase().includes("not allowed") ||
      msg.toLowerCase().includes("unauthorized")
    )) {
      return "Você não tem permissão para avaliar este contrato.";
    }
    if (typeof msg === "string" && msg.toLowerCase().includes("nota")) {
      return "Nota inválida. Só é permitido de 1 a 5.";
    }
    return typeof msg === "string" ? msg : "Erro ao enviar avaliação.";
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    setMensagem("");

    try {
      await api.post("/avaliacoes/", {
        contrato: contrato.id,
        nota,
        comentario,
      });

      setMensagem("Avaliação enviada com sucesso!");
      setMinhaAvaliacao({
        contrato: contrato.id,
        avaliador: { id: usuarioLogado.id, nome: usuarioLogado.nome },
        avaliado:
          usuarioLogado.id === contrato.cliente.id
            ? { id: contrato.freelancer.id, nome: contrato.freelancer.nome }
            : { id: contrato.cliente.id, nome: contrato.cliente.nome },
        nota,
        comentario,
        data_avaliacao: new Date().toISOString(),
      });
    } catch (err) {
      let msg = "Erro ao enviar avaliação.";
      if (err.response && err.response.data) {
        if (typeof err.response.data === "string") msg = err.response.data;
        else if (err.response.data.detail) msg = err.response.data.detail;
        else if (err.response.data.non_field_errors)
          msg = err.response.data.non_field_errors.join(" ");
      }
      setErro(traduzirErroAvaliacao(msg));
    }
  };

  if (!contrato) return <p style={{ textAlign: "center" }}>Carregando contrato...</p>;

  return (
    <div className="avaliacao-container">
      <div className="main-box">
        <h2 className="avaliacao-title">
          <span role="img" aria-label="clip">📋</span> Avaliação do Contrato
        </h2>

        {/* Bloco com informações do contrato */}
        <div className="avaliacao-detalhes-box">
          <p><strong>Trabalho:</strong> {contrato.trabalho.titulo}</p>
          <p><strong>Cliente:</strong> {contrato.cliente.nome}</p>
          <p><strong>Freelancer:</strong> {contrato.freelancer.nome}</p>
          <p><strong>Status do contrato:</strong> {contrato.status}</p>
        </div>

        <button onClick={() => navigate("/contratos")} className="btn-voltar">
          <FaArrowLeft /> Voltar para Contratos
        </button>

        {erro && <p className="avaliacao-msg erro">{erro}</p>}
        {mensagem && <p className="avaliacao-msg sucesso">{mensagem}</p>}

        {/* Avaliação enviada por mim */}
        {minhaAvaliacao && (
          <div className="avaliacao-card minha">
            <h4>Sua Avaliação</h4>
            <p><strong>Para:</strong> {minhaAvaliacao.avaliado?.nome}</p>
            <p><FaStar className="icone" /> <strong>Nota:</strong> {minhaAvaliacao.nota}</p>
            <p><FaRegCommentDots className="icone" /> <strong>Comentário:</strong> {minhaAvaliacao.comentario || "Sem comentário"}</p>
          </div>
        )}

        {/* Avaliação recebida */}
        {avaliacaoOposta && (
          <div className="avaliacao-card recebida">
            <h4>Avaliação Recebida</h4>
            <p><strong>De:</strong> {avaliacaoOposta.avaliador?.nome}</p>
            <p><FaStar className="icone" /> <strong>Nota:</strong> {avaliacaoOposta.nota}</p>
            <p><FaRegCommentDots className="icone" /> <strong>Comentário:</strong> {avaliacaoOposta.comentario || "Sem comentário"}</p>
          </div>
        )}

        {/* Formulário para enviar avaliação */}
        {!minhaAvaliacao && contrato.status === "concluido" && (
          <div className="avaliacao-card formulario">
            <h4>Enviar sua Avaliação</h4>
            <form onSubmit={handleSubmit} className="avaliacao-form">
              <label>Nota (1 a 5):</label>
              <select value={nota} onChange={(e) => setNota(parseInt(e.target.value))} required>
                <option value={5}>5 - Excelente</option>
                <option value={4}>4 - Muito bom</option>
                <option value={3}>3 - Regular</option>
                <option value={2}>2 - Ruim</option>
                <option value={1}>1 - Péssimo</option>
              </select>

              <label>Comentário (opcional):</label>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                rows="3"
                placeholder="O que achou do trabalho?"
              />

              <button type="submit" className="btn-enviar">Enviar Avaliação</button>
            </form>
          </div>
        )}

        {contrato.status !== "concluido" && !minhaAvaliacao && (
          <p className="avaliacao-msg aviso">
            Avaliações só são permitidas após a conclusão do contrato.
          </p>
        )}
      </div>
    </div>
  );
}
