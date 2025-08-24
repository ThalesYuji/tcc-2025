import React, { useState, useEffect } from "react";
import api from "../Servicos/Api";
import { useNavigate, useParams } from "react-router-dom";

const BASE_URL = "http://localhost:8000";

export default function EditarTrabalho() {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prazo, setPrazo] = useState("");
  const [orcamento, setOrcamento] = useState("");
  const [habilidades, setHabilidades] = useState([]); // Lista de strings
  const [novaHabilidade, setNovaHabilidade] = useState("");

  const [anexoAtual, setAnexoAtual] = useState(null);
  const [novoAnexo, setNovoAnexo] = useState(null);
  const [removerAnexo, setRemoverAnexo] = useState(false);

  const [erros, setErros] = useState({});
  const [sucesso, setSucesso] = useState("");
  const [erroGeral, setErroGeral] = useState("");
  const [carregando, setCarregando] = useState(false);

  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    // Carrega dados do trabalho
    api.get(`/trabalhos/${id}/`)
      .then((response) => {
        setTitulo(response.data.titulo);
        setDescricao(response.data.descricao);
        setPrazo(response.data.prazo);
        setOrcamento(response.data.orcamento);
        setAnexoAtual(response.data.anexo);

        if (response.data.habilidades_detalhes) {
          setHabilidades(response.data.habilidades_detalhes.map(h => h.nome));
        }
      })
      .catch(() => setErroGeral("Erro ao carregar o trabalho. Tente novamente mais tarde."));
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErroGeral("");
    setErros({});
    setSucesso("");
    setCarregando(true);

    const formData = new FormData();
    formData.append("titulo", titulo);
    formData.append("descricao", descricao);
    formData.append("prazo", prazo);
    formData.append("orcamento", orcamento);

    // Envia cada habilidade como string
    habilidades.forEach(hab => formData.append("habilidades", hab));

    if (removerAnexo) {
      formData.append("anexo", "");
    } else if (novoAnexo) {
      formData.append("anexo", novoAnexo);
    }

    try {
      await api.put(`/trabalhos/${id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSucesso("Trabalho atualizado com sucesso!");
      setTimeout(() => navigate("/trabalhos"), 1000);
    } catch (err) {
      if (err.response?.data) {
        const backendErros = err.response.data;
        let novosErros = {};
        Object.entries(backendErros).forEach(([campo, mensagem]) => {
          novosErros[campo] = Array.isArray(mensagem) ? mensagem.join(" ") : mensagem;
        });
        setErros(novosErros);
        setErroGeral(backendErros.detail || "Erro ao atualizar o trabalho.");
      } else {
        setErroGeral("Erro ao atualizar o trabalho. Verifique os dados e tente novamente.");
      }
    } finally {
      setCarregando(false);
    }
  };

  const handleAdicionarHabilidade = () => {
    if (novaHabilidade.trim() && !habilidades.includes(novaHabilidade.trim())) {
      setHabilidades([...habilidades, novaHabilidade.trim()]);
      setNovaHabilidade("");
    }
  };

  const handleRemoverHabilidade = (hab) => {
    setHabilidades(habilidades.filter(h => h !== hab));
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdicionarHabilidade();
    }
  };

  const handleAnexoChange = (e) => {
    setNovoAnexo(e.target.files[0]);
    setRemoverAnexo(false);
  };

  if (erroGeral) {
    return (
      <div className="main-center">
        <div className="main-box error-msg">{erroGeral}</div>
      </div>
    );
  }

  return (
    <div className="main-center">
      <div className="form-box">
        <h2 style={{ marginBottom: 22 }}>Editar Trabalho</h2>
        <form onSubmit={handleSubmit} encType="multipart/form-data">
          <input
            type="text"
            placeholder="Título"
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            required
          />
          {erros.titulo && <div className="error-msg">{erros.titulo}</div>}

          <textarea
            placeholder="Descrição"
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            required
          />
          {erros.descricao && <div className="error-msg">{erros.descricao}</div>}

          <input
            type="date"
            placeholder="Prazo"
            value={prazo}
            onChange={e => setPrazo(e.target.value)}
            required
          />
          {erros.prazo && <div className="error-msg">{erros.prazo}</div>}

          <input
            type="number"
            placeholder="Orçamento"
            value={orcamento}
            onChange={e => setOrcamento(e.target.value)}
            required
          />
          {erros.orcamento && <div className="error-msg">{erros.orcamento}</div>}

          <label>Habilidades:</label>
          <div className="habilidades-container">
            {habilidades.map((hab, index) => (
              <span key={index} className="habilidade-tag">
                {hab}
                <button type="button" onClick={() => handleRemoverHabilidade(hab)}>x</button>
              </span>
            ))}
            <input
              type="text"
              placeholder="Digite e pressione Enter"
              value={novaHabilidade}
              onChange={(e) => setNovaHabilidade(e.target.value)}
              onKeyPress={handleKeyPress}
            />
          </div>
          {erros.habilidades && <div className="error-msg">{erros.habilidades}</div>}

          {anexoAtual && !removerAnexo && (
            <div style={{ marginTop: 8, marginBottom: 8 }}>
              <strong>Anexo atual:</strong>{" "}
              <a href={`${BASE_URL}${anexoAtual}`} target="_blank" rel="noopener noreferrer">
                {anexoAtual.split("/").pop()}
              </a>
              <button
                type="button"
                style={{ marginLeft: 10, color: "red" }}
                onClick={() => { setRemoverAnexo(true); setNovoAnexo(null); }}
              >
                Remover Anexo
              </button>
            </div>
          )}
          {!removerAnexo && (
            <>
              <label style={{ display: "block", marginTop: 10 }}>Trocar anexo:</label>
              <input type="file" onChange={handleAnexoChange} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip" />
              {erros.anexo && <div className="error-msg">{erros.anexo}</div>}
            </>
          )}
          {removerAnexo && <div style={{ color: "red", marginTop: 8 }}>O anexo será removido deste trabalho.</div>}

          <button type="submit" style={{ marginTop: 10 }} disabled={carregando}>
            {carregando ? "Salvando..." : "Salvar"}
          </button>
        </form>

        {sucesso && <div className="success-msg" style={{ marginTop: 10 }}>{sucesso}</div>}
      </div>
    </div>
  );
}
