// src/Paginas/CadastroTrabalho.jsx
import React, { useState, useEffect, useContext, useCallback } from "react";
import api from "../Servicos/Api";
import { useNavigate, useLocation } from "react-router-dom";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import {
  FaPlus,
  FaFileAlt,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaTools,
  FaCloudUploadAlt,
  FaCheckCircle
} from "react-icons/fa";
import "../styles/CadastroTrabalho.css";

export default function CadastroTrabalho() {
  const { usuarioLogado } = useContext(UsuarioContext);
  const navigate = useNavigate();
  const location = useLocation();

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
    buscarSugestoes("");
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
      novosErros.orcamento = "Informe um orçamento válido (maior que zero).";
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
    if (freelancerId) formData.append("freelancer", freelancerId);

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
        setErroGeral(backendErros.detail || "Erro ao cadastrar trabalho.");
      } else {
        setErroGeral("Erro ao cadastrar trabalho. Verifique os campos e tente novamente.");
      }
    }
  };

  if (
    !usuarioLogado ||
    (usuarioLogado.tipo !== "cliente" && !usuarioLogado.is_superuser)
  ) {
    return (
      <div className="cadastro-trabalho-page">
        <div className="cadastro-trabalho-container">
          <div className="form-box">
            <div className="error-msg-geral">
              Apenas clientes e administradores podem cadastrar trabalhos.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cadastro-trabalho-page">
      <div className="cadastro-trabalho-container">
        {/* Header da Página */}
        <div className="cadastro-trabalho-header">
          <h1 className="cadastro-trabalho-title">
            <div className="cadastro-trabalho-title-icon">
              <FaPlus />
            </div>
            {freelancerId ? "Criar Trabalho Privado" : "Cadastrar Novo Trabalho"}
          </h1>
          <p className="cadastro-trabalho-subtitle">
            {freelancerId 
              ? "Crie um trabalho direcionado especificamente para um freelancer"
              : "Publique um novo projeto e encontre o freelancer ideal para realizá-lo"
            }
          </p>
        </div>

        {/* Card Principal */}
        <div className="form-box">
          {freelancerId && (
            <div className="texto-info">
              Este trabalho será direcionado apenas para{" "}
              <strong>{freelancerNome || `Freelancer #${freelancerId}`}</strong>.
            </div>
          )}

          {erroGeral && (
            <div className="error-msg-geral">
              {erroGeral}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Título */}
            <div className="form-group">
              <label className="form-label">
                <FaFileAlt className="form-label-icon" />
                Título do Trabalho
              </label>
              <input
                type="text"
                className={`form-input ${erros.titulo ? 'input-erro' : ''}`}
                placeholder="Ex: Desenvolvimento de Landing Page para E-commerce"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
              />
              {erros.titulo && <div className="error-msg">{erros.titulo}</div>}
            </div>

            {/* Descrição */}
            <div className="form-group">
              <label className="form-label">
                <FaFileAlt className="form-label-icon" />
                Descrição Detalhada
              </label>
              <textarea
                className={`form-textarea ${erros.descricao ? 'input-erro' : ''}`}
                placeholder="Descreva em detalhes o que precisa ser desenvolvido, objetivos, requisitos específicos, funcionalidades desejadas..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                required
                rows="5"
              />
              {erros.descricao && <div className="error-msg">{erros.descricao}</div>}
            </div>

            {/* Prazo e Orçamento */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  <FaCalendarAlt className="form-label-icon" />
                  Prazo de Entrega
                </label>
                <input
                  type="date"
                  className={`form-input ${erros.prazo ? 'input-erro' : ''}`}
                  value={prazo}
                  onChange={(e) => setPrazo(e.target.value)}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
                {erros.prazo && <div className="error-msg">{erros.prazo}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  <FaMoneyBillWave className="form-label-icon" />
                  Orçamento (R$)
                </label>
                <input
                  type="number"
                  className={`form-input ${erros.orcamento ? 'input-erro' : ''}`}
                  placeholder="1500.00"
                  value={orcamento}
                  onChange={(e) => setOrcamento(e.target.value)}
                  min="1"
                  step="0.01"
                  required
                />
                {erros.orcamento && <div className="error-msg">{erros.orcamento}</div>}
              </div>
            </div>

            {/* Habilidades */}
            <div className="form-group">
              <label className="form-label">
                <FaTools className="form-label-icon" />
                Habilidades Necessárias
              </label>
              <div className="habilidades-container">
                {habilidades.map((hab, index) => (
                  <div key={index} className="habilidade-tag">
                    {hab}
                    <button type="button" onClick={() => removeHabilidade(hab)}>
                      ×
                    </button>
                  </div>
                ))}
                <input
                  type="text"
                  className="habilidades-input"
                  placeholder={habilidades.length === 0 ? "Digite uma habilidade e pressione Enter..." : "Adicionar mais..."}
                  value={habilidadeInput}
                  onChange={handleHabilidadeInput}
                  onKeyDown={handleHabilidadeKeyDown}
                />
              </div>

              {sugestoes.length > 0 && (
                <ul className="habilidade-sugestoes">
                  {sugestoes.slice(0, 6).map((sug, index) => (
                    <li key={index} onClick={() => adicionarHabilidade(sug)}>
                      {sug}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Upload de Arquivo */}
            <div className="form-group">
              <label className="form-label">
                <FaCloudUploadAlt className="form-label-icon" />
                Anexar Arquivo (Opcional)
              </label>
              <input
                id="anexo-upload"
                type="file"
                className="form-file"
                onChange={(e) => setAnexo(e.target.files[0])}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip,.rar"
              />
              <label htmlFor="anexo-upload" className="file-upload-label">
                <FaCloudUploadAlt className="file-upload-icon" />
                {anexo ? 'Alterar arquivo' : 'Clique para selecionar um arquivo'}
                <small style={{ display: 'block', marginTop: '4px', opacity: '0.7' }}>
                  PDF, DOC, DOCX, JPG, PNG, ZIP (Máx. 10MB)
                </small>
              </label>
              {anexo && (
                <div className="file-selected">
                  <FaCheckCircle style={{ marginRight: '4px' }} />
                  {anexo.name}
                </div>
              )}
              {erros.anexo && <div className="error-msg">{erros.anexo}</div>}
            </div>

            {/* Botão de Submit */}
            <button type="submit" className="btn-submit-trabalho">
              <FaPlus style={{ marginRight: '8px' }} />
              {freelancerId ? "Enviar para Freelancer" : "Cadastrar Trabalho"}
            </button>
          </form>

          {sucesso && (
            <div className="success-msg">
              <FaCheckCircle style={{ marginRight: '8px' }} />
              {sucesso}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}