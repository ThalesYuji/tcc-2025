import React, { useState, useEffect, useContext, useCallback, useRef } from "react";
import api from "../Servicos/Api";
import { useNavigate, useParams } from "react-router-dom";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import { useFetchRamos } from "../hooks/useFetchRamos";
import {
  FaEdit,
  FaFileAlt,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaTools,
  FaCloudUploadAlt,
  FaCheckCircle,
  FaTimes,
  FaEye,
  FaLightbulb,
  FaStar,
  FaTag,
  FaPaperclip,
  FaExclamationCircle,
  FaArrowLeft,
  FaTrash,
  FaLayerGroup,
} from "react-icons/fa";
import "../styles/EditarTrabalho.css";

export default function EditarTrabalho() {
  const { usuarioLogado } = useContext(UsuarioContext);
  const navigate = useNavigate();
  const { id } = useParams();

  // 📦 Estados
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prazo, setPrazo] = useState("");
  const [orcamento, setOrcamento] = useState("");
  const [habilidades, setHabilidades] = useState([]);
  const [habilidadeInput, setHabilidadeInput] = useState("");
// eslint-disable-next-line no-unused-vars
  const [sugestoes, setSugestoes] = useState([]);
  const [anexo, setAnexo] = useState(null);
  const [anexoAtual, setAnexoAtual] = useState(null);
  const [removerAnexo, setRemoverAnexo] = useState(false);
  const [ramo, setRamo] = useState("");

  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTrabalho, setLoadingTrabalho] = useState(true);
  const [trabalhoNaoEncontrado, setTrabalhoNaoEncontrado] = useState(false);

  // ⏱️ debounce para busca de sugestões
  const debounceRef = useRef(null);

  // 🎯 Hook para buscar ramos
  const { ramos, loadingRamos } = useFetchRamos();

  const habilidadesPopulares = [
    "React", "JavaScript", "Python", "Node.js", "Design Gráfico",
    "WordPress", "Figma", "Photoshop", "Marketing Digital", "SEO",
    "Vue.js", "Angular", "Django", "Laravel", "Copywriting",
  ];

  // 🔄 Carregar dados do trabalho
  useEffect(() => {
    carregarTrabalho();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const carregarTrabalho = async () => {
    try {
      setLoadingTrabalho(true);
      const response = await api.get(`/trabalhos/${id}/`);
      const trabalho = response.data;

      // Verificar permissão
      if (trabalho.contratante_id !== usuarioLogado?.id && !usuarioLogado?.is_superuser) {
        navigate("/trabalhos");
        return;
      }

      setTitulo(trabalho.titulo || "");
      setDescricao(trabalho.descricao || "");
      setPrazo(trabalho.prazo || "");
      setOrcamento(String(trabalho.orcamento || ""));
      setHabilidades(trabalho.habilidades || []);
      setAnexoAtual(trabalho.anexo_url || null);
      setRamo(trabalho.ramo || "");

    } catch (error) {
      console.error("Erro ao carregar trabalho:", error);
      setTrabalhoNaoEncontrado(true);
    } finally {
      setLoadingTrabalho(false);
    }
  };

  // 🔎 Sugestões de habilidades (search server-side)
  const buscarSugestoes = useCallback(async (texto) => {
    try {
      const res = await api.get(`/habilidades/?search=${encodeURIComponent(texto || "")}`);
      const nomes = Array.isArray(res.data) ? res.data.map((h) => h.nome) : [];
      setSugestoes(texto ? nomes.filter((n) => !habilidades.includes(n)) : []);
    } catch {
      setSugestoes([]);
    }
  }, [habilidades]);

  // 🖊️ input de habilidade com debounce
  const handleHabilidadeInput = (e) => {
    const valor = e.target.value;
    setHabilidadeInput(valor);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscarSugestoes(valor), 200);
  };

  const handleHabilidadeKeyDown = (e) => {
    if (["Enter", ","].includes(e.key) && habilidadeInput.trim()) {
      e.preventDefault();
      adicionarHabilidade(habilidadeInput.trim());
    }
  };

  const adicionarHabilidade = (nome) => {
    const limpo = nome.replace(/\s+/g, " ").trim();
    if (!limpo) return;
    if (!habilidades.includes(limpo)) {
      setHabilidades((prev) => [...prev, limpo]);
    }
    setHabilidadeInput("");
    setSugestoes([]);
  };

  const removeHabilidade = (hab) => {
    setHabilidades((prev) => prev.filter((h) => h !== hab));
  };

  // 🛡️ Validações simples no cliente
  const validarCampos = () => {
    const novosErros = {};
    if (!titulo.trim()) novosErros.titulo = "Preencha o título.";
    if (!descricao.trim()) novosErros.descricao = "Preencha a descrição.";
    if (!prazo) novosErros.prazo = "Escolha o prazo.";
    if (!orcamento || isNaN(Number(orcamento)) || Number(orcamento) <= 0) {
      novosErros.orcamento = "Informe um orçamento válido (maior que zero).";
    }
    if (anexo) {
      const max = 10 * 1024 * 1024;
      if (anexo.size > max) {
        novosErros.anexo = "Arquivo muito grande. Tamanho máximo: 10MB.";
      } else {
        const ext = (anexo.name.split(".").pop() || "").toLowerCase();
        const permitidos = ["pdf", "doc", "docx", "jpg", "jpeg", "png", "zip", "rar"];
        if (!permitidos.includes(ext)) {
          novosErros.anexo = "Tipo de arquivo não permitido (PDF, DOC, DOCX, JPG, PNG, ZIP, RAR).";
        }
      }
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

    setIsLoading(true);

    const formData = new FormData();
    formData.append("titulo", titulo.trim());
    formData.append("descricao", descricao.trim());
    formData.append("prazo", prazo);
    formData.append("orcamento", String(Number(orcamento)));

    // 🎯 RAMO (opcional)
    if (ramo) {
      formData.append("ramo", ramo);
    }

    habilidades.forEach((hab) => formData.append("habilidades", hab));
    
    if (anexo) {
      formData.append("anexo", anexo);
    } else if (removerAnexo) {
      formData.append("remover_anexo", "true");
    }

    try {
      await api.put(`/trabalhos/${id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSucesso("Trabalho atualizado com sucesso!");
      setTimeout(() => navigate(`/trabalhos/${id}`), 1200);
    } catch (err) {
      const payload = err?.response?.data;
      if (payload && typeof payload === "object") {
        const coletado = {};
        Object.entries(payload).forEach(([campo, mensagem]) => {
          coletado[campo] = Array.isArray(mensagem) ? mensagem.join(" ") : String(mensagem);
        });
        setErros(coletado);
        setErroGeral(coletado.detail || coletado.erro || "Erro ao atualizar trabalho.");
      } else {
        setErroGeral("Erro ao atualizar trabalho. Verifique os campos e tente novamente.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDesfazerRemocao = (e) => {
    e.preventDefault();
    setRemoverAnexo(false);
  };

  // 🔒 Verificação de permissão
  if (!usuarioLogado) {
    return (
      <div className="editar-trabalho-page">
        <div className="page-container">
          <div className="access-denied-container">
            <FaExclamationCircle className="access-denied-icon" />
            <h3>Acesso Negado</h3>
            <p>Você precisa estar logado para editar trabalhos.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loadingTrabalho) {
    return (
      <div className="editar-trabalho-page">
        <div className="page-container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <h3>Carregando trabalho...</h3>
            <p>Aguarde enquanto buscamos os dados.</p>
          </div>
        </div>
      </div>
    );
  }

  if (trabalhoNaoEncontrado) {
    return (
      <div className="editar-trabalho-page">
        <div className="page-container">
          <div className="access-denied-container">
            <FaExclamationCircle className="access-denied-icon" />
            <h3>Trabalho Não Encontrado</h3>
            <p>O trabalho que você está tentando editar não existe ou foi removido.</p>
            <div className="error-actions">
              <button className="btn btn-primary" onClick={() => navigate("/trabalhos")}>
                <FaArrowLeft /> Voltar para Trabalhos
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="editar-trabalho-page">
      {/* Header */}
      <div className="editar-trabalho-header">
        <div className="detalhes-nav">
          <button className="btn-voltar" onClick={() => navigate(`/trabalhos/${id}`)}>
            <FaArrowLeft /> Voltar para Detalhes
          </button>
        </div>

        <div className="detalhes-title-section">
          <div className="editar-trabalho-title">
            <div className="editar-trabalho-title-icon">
              <FaEdit />
            </div>
            <span>Editar Projeto</span>
          </div>
          <p className="editar-trabalho-subtitle">
            Atualize as informações do seu projeto
          </p>
        </div>
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
        <div className="editar-trabalho-grid">
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
                      disabled={isLoading}
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
                      placeholder="Descreva em detalhes o que precisa ser desenvolvido..."
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      rows="6"
                      maxLength={1000}
                      disabled={isLoading}
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
                        disabled={isLoading}
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
                        disabled={isLoading}
                      />
                      {erros.orcamento && <span className="error-msg">{erros.orcamento}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* 🆕 CARD DE CATEGORIZAÇÃO (RAMO) */}
              <div className="modern-card">
                <div className="card-header">
                  <h2 className="card-title">
                    <FaLayerGroup />
                    Ramo
                  </h2>
                  <span className="optional-badge">Opcional</span>
                </div>

                <div className="card-body">
                  <div className="form-field">
                    <label className="input-label">
                      <FaLayerGroup />
                      Ramo de Atuação
                    </label>
                    <div className="ramo-select-wrapper">
                      <FaLayerGroup className="ramo-select-icon" />
                      <select
                        className="ramo-select"
                        value={ramo}
                        onChange={(e) => setRamo(e.target.value)}
                        disabled={loadingRamos || isLoading}
                      >
                        <option value="">Selecione uma área (opcional)</option>
                        {ramos.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="ramo-helper-text">
                      <FaLightbulb />
                      Categorize seu trabalho para facilitar a busca de freelancers especializados
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
                        disabled={isLoading}
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
                              disabled={isLoading}
                            >
                              <FaTimes />
                            </button>
                          </div>
                        ))}
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
                              disabled={isLoading}
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
                  {anexoAtual && !removerAnexo && !anexo && (
                    <div className="current-file-section">
                      <h4 className="subsection-title">Arquivo Atual</h4>
                      <div className="file-selected-info current">
                        <FaCheckCircle className="file-success-icon" />
                        <div className="file-details">
                          <span className="file-name">Arquivo anexado</span>
                          <a
                            href={anexoAtual}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="file-link"
                          >
                            <FaPaperclip /> Visualizar arquivo
                          </a>
                        </div>
                        <button
                          type="button"
                          className="file-remove"
                          onClick={() => setRemoverAnexo(true)}
                          disabled={isLoading}
                          title="Remover arquivo"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  )}

                  {removerAnexo && !anexo && (
                    <div className="removal-warning">
                      <FaExclamationCircle />
                      <span>
                        O arquivo será removido ao salvar.{" "}
                        <button
                          type="button"
                          onClick={handleDesfazerRemocao}
                          style={{
                            background: "none",
                            border: "none",
                            color: "inherit",
                            textDecoration: "underline",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          Desfazer
                        </button>
                      </span>
                    </div>
                  )}

                  <div className="file-upload-area">
                    <input
                      id="file-input"
                      type="file"
                      className="file-input"
                      onChange={(e) => {
                        setAnexo(e.target.files?.[0] || null);
                        setRemoverAnexo(false);
                      }}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip,.rar"
                      disabled={isLoading}
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
                            disabled={isLoading}
                          >
                            <FaTimes />
                          </button>
                        </div>
                      ) : (
                        <div className="file-upload-placeholder">
                          <FaCloudUploadAlt className="upload-icon" />
                          <div className="upload-text">
                            <span className="upload-title">
                              {anexoAtual && !removerAnexo
                                ? "Substituir arquivo"
                                : "Clique para enviar arquivo"}
                            </span>
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

              {/* Botões */}
              <div className="form-actions">
                <button
                  type="submit"
                  className={`btn gradient-btn btn-large ${isLoading ? "loading" : ""}`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="loading-spinner"></div>
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <FaCheckCircle />
                      <span>Salvar Alterações</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-large"
                  onClick={() => navigate(`/trabalhos/${id}`)}
                  disabled={isLoading}
                >
                  <FaTimes />
                  <span>Cancelar</span>
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
                    {(descricao
                      ? descricao.substring(0, 150) + (descricao.length > 150 ? "..." : "")
                      : "") || "Descrição do seu projeto aparecerá aqui..."}
                  </div>
                  <div className="preview-details">
                    <div className="preview-detail">
                      <FaCalendarAlt />
                      <span>
                        {prazo ? new Date(prazo).toLocaleDateString("pt-BR") : "Prazo"}
                      </span>
                    </div>
                    <div className="preview-detail">
                      <FaMoneyBillWave />
                      <span>
                        {orcamento
                          ? new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(Number(orcamento))
                          : "R$ 0,00"}
                      </span>
                    </div>
                    <div className="preview-detail">
                      <FaTools />
                      <span>
                        {habilidades.length} habilidade{habilidades.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}