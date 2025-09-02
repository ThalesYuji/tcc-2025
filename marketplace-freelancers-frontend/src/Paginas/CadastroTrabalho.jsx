import React, { useState, useEffect, useContext, useCallback } from "react";
import api from "../Servicos/Api";
import { useNavigate, useLocation } from "react-router-dom";
import { UsuarioContext } from "../Contextos/UsuarioContext";

export default function CadastroTrabalho() {
  const { usuarioLogado } = useContext(UsuarioContext);
  const navigate = useNavigate();
  const location = useLocation();

  // 🔹 Captura freelancerId da query string
  const params = new URLSearchParams(location.search);
  const freelancerId = params.get("freelancer");

  const [freelancerNome, setFreelancerNome] = useState("");

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prazo, setPrazo] = useState("");
  const [orcamento, setOrcamento] = useState("");
  const [habilidades, setHabilidades] = useState([]);
  const [habilidadeInput, setHabilidadeInput] = useState("");
  const [sugestoes, setSugestoes] = useState([]);
  const [anexo, setAnexo] = useState(null);

  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState("");
  const [sucesso, setSucesso] = useState("");

  // 🔹 Buscar nome do freelancer (se for trabalho privado)
  useEffect(() => {
    async function fetchFreelancer() {
      if (freelancerId) {
        try {
          const resp = await api.get(`/usuarios/${freelancerId}/`);
          setFreelancerNome(resp.data.nome || resp.data.email);
        } catch {
          setFreelancerNome("Freelancer não encontrado");
        }
      }
    }
    fetchFreelancer();
  }, [freelancerId]);

  // 🔹 buscarSugestoes definido com useCallback
  const buscarSugestoes = useCallback(
    async (texto) => {
      try {
        const res = await api.get(`/habilidades/?search=${texto}`);
        const nomes = res.data.map((h) => h.nome);
        setSugestoes(
          texto ? nomes.filter((nome) => !habilidades.includes(nome)) : []
        );
      } catch {
        setSugestoes([]);
      }
    },
    [habilidades]
  );

  useEffect(() => {
    buscarSugestoes(""); // inicia sem sugestões
  }, [buscarSugestoes]);

  const handleHabilidadeInput = (e) => {
    const valor = e.target.value;
    setHabilidadeInput(valor);
    buscarSugestoes(valor);
  };

  const handleHabilidadeKeyDown = (e) => {
    if (["Enter", ","].includes(e.key) && habilidadeInput.trim()) {
      e.preventDefault();
      adicionarHabilidade(habilidadeInput.trim());
    }
  };

  const adicionarHabilidade = (nome) => {
    if (!habilidades.includes(nome)) {
      setHabilidades([...habilidades, nome]);
    }
    setHabilidadeInput("");
    setSugestoes([]);
  };

  const removeHabilidade = (hab) => {
    setHabilidades(habilidades.filter((h) => h !== hab));
  };

  const validarCampos = () => {
    let novosErros = {};
    if (!titulo.trim()) novosErros.titulo = "Preencha o título.";
    if (!descricao.trim()) novosErros.descricao = "Preencha a descrição.";
    if (!prazo) novosErros.prazo = "Escolha o prazo.";
    if (!orcamento || isNaN(Number(orcamento)) || Number(orcamento) <= 0) {
      novosErros.orcamento =
        "Informe um orçamento válido (maior que zero).";
    }
    return novosErros;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErros({});
    setErroGeral("");
    setSucesso("");

    const novosErros = validarCampos();
    if (Object.keys(novosErros).length > 0) {
      setErros(novosErros);
      setErroGeral("Corrija os campos destacados para prosseguir.");
      return;
    }

    const formData = new FormData();
    formData.append("titulo", titulo);
    formData.append("descricao", descricao);
    formData.append("prazo", prazo);
    formData.append("orcamento", orcamento);
    habilidades.forEach((hab) => formData.append("habilidades", hab));
    if (anexo) formData.append("anexo", anexo);

    // 🔹 Se veio da query string → envia freelancer fixo
    if (freelancerId) {
      formData.append("freelancer", freelancerId);
    }

    try {
      await api.post("/trabalhos/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSucesso("Trabalho cadastrado com sucesso!");
      setTimeout(() => navigate("/trabalhos"), 1200);
    } catch (err) {
      if (err.response?.data) {
        const backendErros = err.response.data;
        let novosErros = {};
        Object.entries(backendErros).forEach(([campo, mensagem]) => {
          novosErros[campo] = Array.isArray(mensagem)
            ? mensagem.join(" ")
            : mensagem;
        });
        setErros(novosErros);
        setErroGeral(
          backendErros.detail || "Erro ao cadastrar trabalho."
        );
      } else {
        setErroGeral(
          "Erro ao cadastrar trabalho. Verifique os campos e tente novamente."
        );
      }
    }
  };

  if (
    !usuarioLogado ||
    (usuarioLogado.tipo !== "cliente" && !usuarioLogado.is_superuser)
  ) {
    return (
      <div className="main-center">
        <div className="main-box" style={{ color: "red" }}>
          Apenas clientes e administradores podem cadastrar trabalhos.
        </div>
      </div>
    );
  }

  return (
    <div className="main-center">
      <div className="form-box">
        <h2 style={{ marginBottom: 22 }}>
          {freelancerId
            ? "Criar Trabalho Privado"
            : "Cadastrar Novo Trabalho"}
        </h2>

        {freelancerId && (
          <p style={{ marginBottom: 15, color: "#1976d2" }}>
            Este trabalho será direcionado apenas para{" "}
            <strong>{freelancerNome || `Freelancer #${freelancerId}`}</strong>.
          </p>
        )}

        <form onSubmit={handleSubmit} encType="multipart/form-data">
          <input
            type="text"
            placeholder="Título"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
            className={erros.titulo ? "input-erro" : ""}
          />
          {erros.titulo && <div className="error-msg">{erros.titulo}</div>}

          <textarea
            placeholder="Descrição"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            required
            className={erros.descricao ? "input-erro" : ""}
          />
          {erros.descricao && (
            <div className="error-msg">{erros.descricao}</div>
          )}

          <input
            type="date"
            value={prazo}
            onChange={(e) => setPrazo(e.target.value)}
            required
            className={erros.prazo ? "input-erro" : ""}
          />
          {erros.prazo && <div className="error-msg">{erros.prazo}</div>}

          <input
            type="number"
            placeholder="Orçamento"
            value={orcamento}
            onChange={(e) => setOrcamento(e.target.value)}
            min="1"
            required
            className={erros.orcamento ? "input-erro" : ""}
          />
          {erros.orcamento && (
            <div className="error-msg">{erros.orcamento}</div>
          )}

          <label>Habilidades:</label>
          <div className="habilidades-container">
            {habilidades.map((hab, index) => (
              <div key={index} className="habilidade-tag">
                {hab}
                <button
                  type="button"
                  onClick={() => removeHabilidade(hab)}
                >
                  ×
                </button>
              </div>
            ))}
            <input
              type="text"
              placeholder="Digite e pressione Enter"
              value={habilidadeInput}
              onChange={handleHabilidadeInput}
              onKeyDown={handleHabilidadeKeyDown}
            />
          </div>

          {sugestoes.length > 0 && (
            <ul className="habilidade-sugestoes">
              {sugestoes.map((sug, index) => (
                <li key={index} onClick={() => adicionarHabilidade(sug)}>
                  {sug}
                </li>
              ))}
            </ul>
          )}

          <label>Anexo (opcional):</label>
          <input
            type="file"
            onChange={(e) => setAnexo(e.target.files[0])}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            className={erros.anexo ? "input-erro" : ""}
          />
          {erros.anexo && <div className="error-msg">{erros.anexo}</div>}

          <button type="submit">
            {freelancerId ? "Enviar para Freelancer" : "Cadastrar Trabalho"}
          </button>
        </form>
        {sucesso && <div className="success-msg">{sucesso}</div>}
        {erroGeral && <div className="error-msg">{erroGeral}</div>}
      </div>
    </div>
  );
}
