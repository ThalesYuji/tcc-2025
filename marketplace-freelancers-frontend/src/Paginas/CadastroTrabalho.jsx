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
  FaCheckCircle,
  FaTimes,
  FaUser,
  FaEye,
  FaLightbulb,
  FaStar,
  FaTag,
  FaPaperclip,
  FaExclamationCircle,
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
  const [isLoading, setIsLoading] = useState(false);

  const habilidadesPopulares = [
    "React", "JavaScript", "Python", "Node.js", "Design Gráfico", 
    "WordPress", "Figma", "Photoshop", "Marketing Digital", "SEO",
    "Vue.js", "Angular", "Django", "Laravel", "Copywriting"
  ];

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
    setIsLoading(true);

    const novosErros = validarCampos();
    if (Object.keys(novosErros).length > 0) {
      setErros(novosErros);
      setErroGeral("Corrija os campos destacados para prosseguir.");
      setIsLoading(false);
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
      setTimeout(() => navigate("/trabalhos"), 1500);
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
    } finally {
      setIsLoading(false);
    }
  };

  // 🔒 Permissão de acesso
  if (
    !usuarioLogado ||
    (usuarioLogado.tipo !== "contratante" && !usuarioLogado.is_superuser)
  ) {
    return (
      <div className="cadastro-trabalho-page">
        <div className="page-container">
          <div className="access-denied-container">
            <FaExclamationCircle className="access-denied-icon" />
            <h3>Acesso Negado</h3>
            <p>Apenas contratantes e administradores podem cadastrar trabalhos.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cadastro-trabalho-page">
      {/* Header */}
      <div className="cadastro-trabalho-header">
        <div className="cadastro-trabalho-title">
          <div className="cadastro-trabalho-title-icon">
            <FaPlus />
          </div>
          {freelancerId ? "Trabalho Privado" : "Novo Projeto"}
        </div>
        <div className="cadastro-trabalho-subtitle">
          {freelancerId
            ? `Criar trabalho direcionado para ${freelancerNome}`
            : "Publique seu projeto e encontre o freelancer ideal"}
        </div>
        {freelancerId && (
          <div className="private-work-badge">
            <FaUser />
            <span>Trabalho Privado</span>
          </div>
        )}
      </div>

      <div className="page-container">
        {/* Alertas */}
        {erroGeral && (
          <div className="alert-error">
            <FaExclamationCircle />
            <span>{erroGeral}</span>
          </div>
        )}
        {sucesso && (
          <div className="alert-success">
            <FaCheckCircle />
            <span>{sucesso}</span>
          </div>
        )}

        {/* Layout */}
        <div className="cadastro-trabalho-grid">
          {/* Form principal */}
          <div className="form-main-column">
            <form onSubmit={handleSubmit} className="trabalho-form">
              {/* Informações Básicas */}
              <div className="modern-card">
                <div className="card-header">
                  <h2 className="card-title">
                    <FaFileAlt />
                    Informações Básicas
                  </h2>
                </div>

                <div className="card-body">
                  <div className="form-field">
                    <label className="input-label">
                      Título do Projeto <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${erros.titulo ? "error" : ""}`}
                      placeholder="Ex: Desenvolvimento de Landing Page para E-commerce"
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      maxLength={100}
                    />
                    <div className="input-footer">
                      <span className="char-count">{titulo.length}/100</span>
                      {erros.titulo && <span className="error-msg">{erros.titulo}</span>}
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="input-label">
                      Descrição Detalhada <span className="required">*</span>
                    </label>
                    <textarea
                      className={`form-control textarea-field ${erros.descricao ? "error" : ""}`}
                      placeholder="Descreva em detalhes o que precisa ser desenvolvido, objetivos, requisitos específicos..."
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      rows="6"
                      maxLength={1000}
                    />
                    <div className="input-footer">
                      <span className="char-count">{descricao.length}/1000</span>
                      {erros.descricao && <span className="error-msg">{erros.descricao}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Prazo e Orçamento */}
              <div className="modern-card">
                <div className="card-header">
                  <h2 className="card-title">
                    <FaCalendarAlt />
                    Prazo e Orçamento
                  </h2>
                </div>

                <div className="card-body">
                  <div className="form-row">
                    <div className="form-field">
                      <label className="input-label">
                        <FaCalendarAlt />
                        Prazo de Entrega <span className="required">*</span>
                      </label>
                      <input
                        type="date"
                        className={`form-control ${erros.prazo ? "error" : ""}`}
                        value={prazo}
                        onChange={(e) => setPrazo(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                      />
                      {erros.prazo && <span className="error-msg">{erros.prazo}</span>}
                    </div>

                    <div className="form-field">
                      <label className="input-label">
                        <FaMoneyBillWave />
                        Orçamento (R$) <span className="required">*</span>
                      </label>
                      <input
                        type="number"
                        className={`form-control ${erros.orcamento ? "error" : ""}`}
                        placeholder="1500.00"
                        value={orcamento}
                        onChange={(e) => setOrcamento(e.target.value)}
                        min="1"
                        step="0.01"
                      />
                      {erros.orcamento && <span className="error-msg">{erros.orcamento}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Habilidades */}
              <div className="modern-card">
                <div className="card-header">
                  <h2 className="card-title">
                    <FaTools />
                    Habilidades Necessárias
                  </h2>
                </div>

                <div className="card-body">
                  <div className="skills-container">
                    <div className="skills-input-wrapper">
                      <input
                        type="text"
                        className="skills-input"
                        placeholder="Digite uma habilidade e pressione Enter..."
                        value={habilidadeInput}
                        onChange={handleHabilidadeInput}
                        onKeyDown={handleHabilidadeKeyDown}
                      />
                      <FaTag className="skills-input-icon" />
                    </div>

                    {habilidades.length > 0 && (
                      <div className="selected-skills">
                        {habilidades.map((hab, index) => (
                          <div key={index} className="skill-badge">
                            <span>{hab}</span>
                            <button
                              type="button"
                              onClick={() => removeHabilidade(hab)}
                              className="skill-remove"
                            >
                              <FaTimes />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {sugestoes.length > 0 && (
                      <div className="skills-suggestions">
                        <div className="suggestions-header">
                          <FaLightbulb />
                          <span>Sugestões</span>
                        </div>
                        <div className="suggestions-list">
                          {sugestoes.slice(0, 8).map((sug, index) => (
                            <button
                              key={index}
                              type="button"
                              className="suggestion-tag"
                              onClick={() => adicionarHabilidade(sug)}
                            >
                              {sug}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="popular-skills">
                      <div className="popular-skills-header">
                        <FaStar />
                        <span>Habilidades Populares</span>
                      </div>
                      <div className="popular-skills-list">
                        {habilidadesPopulares
                          .filter((skill) => !habilidades.includes(skill))
                          .slice(0, 10)
                          .map((skill, index) => (
                            <button
                              key={index}
                              type="button"
                              className="popular-skill-tag"
                              onClick={() => adicionarHabilidade(skill)}
                            >
                              {skill}
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Arquivo Anexo */}
              <div className="modern-card">
                <div className="card-header">
                  <h2 className="card-title">
                    <FaPaperclip />
                    Arquivo Anexo
                  </h2>
                  <span className="optional-badge">Opcional</span>
                </div>

                <div className="card-body">
                  <div className="file-upload-area">
                    <input
                      id="file-input"
                      type="file"
                      className="file-input"
                      onChange={(e) => setAnexo(e.target.files[0])}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip,.rar"
                    />
                    <label htmlFor="file-input" className="file-upload-label">
                      {anexo ? (
                        <div className="file-selected-info">
                          <FaCheckCircle className="file-success-icon" />
                          <div className="file-details">
                            <span className="file-name">{anexo.name}</span>
                            <span className="file-size">
                              {(anexo.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                          <button
                            type="button"
                            className="file-remove"
                            onClick={(e) => {
                              e.preventDefault();
                              setAnexo(null);
                            }}
                          >
                            <FaTimes />
                          </button>
                        </div>
                      ) : (
                        <div className="file-upload-placeholder">
                          <FaCloudUploadAlt className="upload-icon" />
                          <div className="upload-text">
                            <span className="upload-title">Clique para enviar arquivo</span>
                            <span className="upload-subtitle">
                              PDF, DOC, DOCX, JPG, PNG, ZIP (Máx. 10MB)
                            </span>
                          </div>
                        </div>
                      )}
                    </label>
                  </div>
                  {erros.anexo && <span className="error-msg">{erros.anexo}</span>}
                </div>
              </div>

              {/* Botão */}
              <div className="form-actions">
                <button
                  type="submit"
                  className={`btn gradient-btn btn-large ${isLoading ? "loading" : ""}`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="loading-spinner"></div>
                      <span>Cadastrando...</span>
                    </>
                  ) : (
                    <>
                      <FaPlus />
                      <span>
                        {freelancerId ? "Enviar para Freelancer" : "Publicar Projeto"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Sidebar */}
          <div className="form-sidebar-column">
            <div className="modern-card preview-card">
              <div className="card-header">
                <h2 className="card-title">
                  <FaEye />
                  Prévia do Projeto
                </h2>
              </div>

              <div className="card-body">
                <div className="preview-content">
                  <div className="preview-title">
                    {titulo || "Título do seu projeto..."}
                  </div>
                  <div className="preview-description">
                    {descricao.substring(0, 150) +
                      (descricao.length > 150 ? "..." : "") ||
                      "Descrição do seu projeto aparecerá aqui..."}
                  </div>
                  <div className="preview-details">
                    <div className="preview-detail">
                      <FaCalendarAlt />
                      <span>
                        {prazo
                          ? new Date(prazo).toLocaleDateString()
                          : "Prazo"}
                      </span>
                    </div>
                    <div className="preview-detail">
                      <FaMoneyBillWave />
                      <span>R$ {orcamento || "0,00"}</span>
                    </div>
                    <div className="preview-detail">
                      <FaTools />
                      <span>
                        {habilidades.length} habilidade
                        {habilidades.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modern-card tips-card">
              <div className="card-header">
                <h2 className="card-title">
                  <FaLightbulb />
                  Dicas para um Bom Projeto
                </h2>
              </div>

              <div className="card-body">
                <ul className="tips-list">
                  <li>Seja específico no título e descrição</li>
                  <li>Defina um prazo realista</li>
                  <li>Escolha habilidades relevantes</li>
                  <li>Anexe materiais de referência</li>
                  <li>Estabeleça um orçamento justo</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
