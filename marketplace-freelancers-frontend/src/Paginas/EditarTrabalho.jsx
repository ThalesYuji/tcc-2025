import React, { useState, useEffect, useContext, useCallback, useRef, useMemo } from "react";
import api from "../Servicos/Api";
import { useNavigate, useParams } from "react-router-dom";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import { useFetchRamos } from "../hooks/useFetchRamos";
import {
  FaEdit,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaCloudUploadAlt,
  FaCheckCircle,
  FaTimes,
  FaLightbulb,
  FaExclamationCircle,
  FaLayerGroup,
  FaArrowLeft,
  FaMagic,
  FaImage,
  FaFile,
  FaTrash,
  FaPlus,
} from "react-icons/fa";
import "../styles/CadastroTrabalho.css";

export default function EditarTrabalho() {
  const { usuarioLogado } = useContext(UsuarioContext);
  const navigate = useNavigate();
  const { id } = useParams();

  // Estados principais
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prazo, setPrazo] = useState("");
  const [orcamento, setOrcamento] = useState("");
  const [habilidades, setHabilidades] = useState([]);
  const [habilidadeInput, setHabilidadeInput] = useState("");
  const [sugestoes, setSugestoes] = useState([]);
  const [anexo, setAnexo] = useState(null);
  const [anexoAtual, setAnexoAtual] = useState(null);
  const [removerAnexo, setRemoverAnexo] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Estados do Ramo
  const [ramoSelecionado, setRamoSelecionado] = useState("");
  const [ramoInput, setRamoInput] = useState("");
  const [showRamoSugestoes, setShowRamoSugestoes] = useState(false);

  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTrabalho, setLoadingTrabalho] = useState(true);
  const [trabalhoNaoEncontrado, setTrabalhoNaoEncontrado] = useState(false);

  const debounceRef = useRef(null);
  const ramoInputRef = useRef(null);
  const { ramos, loadingRamos } = useFetchRamos();

  const habilidadesPopulares = [
    "React", "JavaScript", "Python", "Node.js", "Design Gráfico",
    "WordPress", "Figma", "Photoshop", "Marketing Digital", "SEO",
    "Vue.js", "Angular", "Django", "Laravel", "Copywriting",
  ];

  const ramosPopulares = [
    "Desenvolvimento Web", "Design", "Marketing Digital", "Mobile",
    "Data Science", "DevOps", "UI/UX", "Backend", "Frontend",
  ];

  // Filtrar sugestões de ramos conforme digitação
  const ramoSugestoesFiltradas = useMemo(() => {
    if (!ramoInput.trim()) return [];
    const termo = ramoInput.toLowerCase();
    return ramos
      .filter(r => r.nome.toLowerCase().includes(termo))
      .filter(r => r.nome !== ramoSelecionado)
      .slice(0, 5);
  }, [ramoInput, ramos, ramoSelecionado]);

  // Carregar dados do trabalho
  useEffect(() => {
    carregarTrabalho();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const carregarTrabalho = async () => {
    try {
      setLoadingTrabalho(true);
      const response = await api.get(`/trabalhos/${id}/`);
      const trabalho = response.data;

      if (trabalho.contratante_id !== usuarioLogado?.id && !usuarioLogado?.is_superuser) {
        navigate("/trabalhos");
        return;
      }

      setTitulo(trabalho.titulo || "");
      setDescricao(trabalho.descricao || "");
      setPrazo(trabalho.prazo || "");
      setOrcamento(String(trabalho.orcamento || ""));

      if (trabalho.habilidades_detalhes && trabalho.habilidades_detalhes.length > 0) {
        setHabilidades(trabalho.habilidades_detalhes.map(h => h.nome));
      } else if (trabalho.habilidades && trabalho.habilidades.length > 0) {
        if (typeof trabalho.habilidades[0] === 'object') {
          setHabilidades(trabalho.habilidades.map(h => h.nome));
        } else {
          setHabilidades(trabalho.habilidades);
        }
      } else {
        setHabilidades([]);
      }

      setAnexoAtual(trabalho.anexo_url || null);

      // Carregar ramo como NOME
      if (trabalho.ramo_detalhes?.nome) {
        setRamoSelecionado(trabalho.ramo_detalhes.nome);
      } else {
        setRamoSelecionado("");
      }

    } catch (error) {
      console.error("Erro ao carregar trabalho:", error);
      setTrabalhoNaoEncontrado(true);
    } finally {
      setLoadingTrabalho(false);
    }
  };

  // Buscar sugestões de habilidades
  const buscarSugestoes = useCallback(async (texto) => {
    try {
      const res = await api.get(`/habilidades/?search=${encodeURIComponent(texto || "")}`);
      const nomes = Array.isArray(res.data) ? res.data.map((h) => h.nome) : [];
      setSugestoes(texto ? nomes.filter((n) => !habilidades.includes(n)) : []);
    } catch {
      setSugestoes([]);
    }
  }, [habilidades]);

  useEffect(() => {
    buscarSugestoes("");
  }, [buscarSugestoes]);

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
    if (!limpo || habilidades.includes(limpo)) return;
    setHabilidades((prev) => [...prev, limpo]);
    setHabilidadeInput("");
    setSugestoes([]);
  };

  const removeHabilidade = (hab) => {
    setHabilidades((prev) => prev.filter((h) => h !== hab));
  };

  // Handlers do Ramo
  const handleRamoInput = (e) => {
    const valor = e.target.value;
    setRamoInput(valor);
    setShowRamoSugestoes(valor.trim().length > 0);
  };

  const handleRamoKeyDown = (e) => {
    if (e.key === "Enter" && ramoInput.trim()) {
      e.preventDefault();
      selecionarRamo(ramoInput.trim());
    }
    if (e.key === "Escape") {
      setShowRamoSugestoes(false);
    }
  };

  const selecionarRamo = (nome) => {
    const limpo = nome.replace(/\s+/g, " ").trim();
    if (!limpo) return;
    setRamoSelecionado(limpo);
    setRamoInput("");
    setShowRamoSugestoes(false);
  };

  const removerRamo = () => {
    setRamoSelecionado("");
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ramoInputRef.current && !ramoInputRef.current.contains(e.target)) {
        setShowRamoSugestoes(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Drag & Drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setAnexo(e.dataTransfer.files[0]);
      setRemoverAnexo(false);
    }
  };

  // Validação
  const validarCampos = () => {
    const novosErros = {};
    if (!titulo.trim()) novosErros.titulo = "O título é obrigatório.";
    if (!descricao.trim()) novosErros.descricao = "A descrição é obrigatória.";
    if (!prazo) novosErros.prazo = "O prazo é obrigatório.";
    if (!orcamento || Number(orcamento) <= 0) novosErros.orcamento = "O orçamento deve ser maior que zero.";
    if (anexo && anexo.size > 10 * 1024 * 1024) novosErros.anexo = "Arquivo muito grande (máx. 10MB).";
    return novosErros;
  };

  // Submeter
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

    if (ramoSelecionado) formData.append("ramo", ramoSelecionado);

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
        setErroGeral(coletado.detail || coletado.erro || "Erro ao atualizar.");
      } else {
        setErroGeral("Erro ao atualizar. Tente novamente.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Calcular progresso
  const calcularProgresso = () => {
    let total = 0;
    if (titulo.trim()) total += 25;
    if (descricao.trim()) total += 25;
    if (prazo) total += 25;
    if (orcamento && Number(orcamento) > 0) total += 25;
    return total;
  };

  const progresso = calcularProgresso();

  // Estados de carregamento
  if (!usuarioLogado) {
    return (
      <div className="cadastro-trabalho-page">
        <div className="ct-access-denied">
          <div className="ct-access-denied-content">
            <FaExclamationCircle />
            <h3>Acesso Negado</h3>
            <p>Você precisa estar logado para editar trabalhos.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loadingTrabalho) {
    return (
      <div className="cadastro-trabalho-page">
        <div className="ct-access-denied">
          <div className="ct-access-denied-content">
            <div className="ct-spinner"></div>
            <h3>Carregando trabalho...</h3>
            <p>Aguarde enquanto buscamos os dados.</p>
          </div>
        </div>
      </div>
    );
  }

  if (trabalhoNaoEncontrado) {
    return (
      <div className="cadastro-trabalho-page">
        <div className="ct-access-denied">
          <div className="ct-access-denied-content">
            <FaExclamationCircle />
            <h3>Trabalho Não Encontrado</h3>
            <p>O trabalho que você está tentando editar não existe ou foi removido.</p>
            <button className="ct-btn ct-btn-primary" onClick={() => navigate("/trabalhos")}>
              <FaArrowLeft /> Voltar aos Trabalhos
            </button>
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
            <FaEdit />
          </div>
          Editar Projeto
        </div>
        <div className="cadastro-trabalho-subtitle">
          Atualize as informações do seu projeto
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="ct-main-container">
        {/* Alertas */}
        {erroGeral && (
          <div className="ct-alert ct-alert-error">
            <FaExclamationCircle />
            <span>{erroGeral}</span>
          </div>
        )}
        {sucesso && (
          <div className="ct-alert ct-alert-success">
            <FaCheckCircle />
            <span>{sucesso}</span>
          </div>
        )}

        {/* Botão Voltar */}
        <div style={{ marginBottom: "var(--space-xl)" }}>
          <button onClick={() => navigate("/trabalhos")} className="btn btn-primary">
            <i className="bi bi-arrow-left"></i>
            Voltar aos Trabalhos
          </button>
        </div>

        <div className="ct-creative-layout">
          {/* Coluna Esquerda - Preview Visual */}
          <div className="ct-preview-column">
            <div className="ct-preview-card">
              <div className="ct-preview-header">
                <span className="ct-preview-badge">
                  <FaEdit /> Preview em Tempo Real
                </span>
              </div>
              
              <div className="ct-preview-body">
                <div className="ct-preview-mockup">
                  <div className="ct-mockup-header">
                    <div className="ct-mockup-dots">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                  <div className="ct-mockup-content">
                    <h3 className="ct-preview-title">
                      {titulo || "Título do seu projeto aparecerá aqui..."}
                    </h3>
                    <p className="ct-preview-desc">
                      {descricao 
                        ? (descricao.length > 200 ? descricao.substring(0, 200) + "..." : descricao)
                        : "A descrição detalhada do seu projeto será exibida neste espaço."}
                    </p>
                    
                    <div className="ct-preview-meta">
                      <div className="ct-preview-meta-item">
                        <FaCalendarAlt />
                        <span>{prazo ? new Date(prazo).toLocaleDateString("pt-BR") : "Data de entrega"}</span>
                      </div>
                      <div className="ct-preview-meta-item ct-preview-meta-budget">
                        <FaMoneyBillWave />
                        <span>
                          {orcamento 
                            ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(orcamento))
                            : "R$ 0,00"}
                        </span>
                      </div>
                    </div>

                    {ramoSelecionado && (
                      <div className="ct-preview-ramo">
                        <FaLayerGroup />
                        <span>{ramoSelecionado}</span>
                      </div>
                    )}

                    {habilidades.length > 0 && (
                      <div className="ct-preview-skills">
                        {habilidades.slice(0, 5).map((hab, i) => (
                          <span key={i} className="ct-preview-skill">{hab}</span>
                        ))}
                        {habilidades.length > 5 && (
                          <span className="ct-preview-skill ct-preview-skill-more">
                            +{habilidades.length - 5}
                          </span>
                        )}
                      </div>
                    )}

                    {(anexo || anexoAtual) && !removerAnexo && (
                      <div className="ct-preview-attachment">
                        <FaFile />
                        <span>{anexo ? anexo.name : "Arquivo anexado"}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Barra de Progresso */}
              <div className="ct-progress-section">
                <div className="ct-progress-header">
                  <span>Progresso do formulário</span>
                  <span className="ct-progress-percent">{progresso}%</span>
                </div>
                <div className="ct-progress-bar">
                  <div 
                    className="ct-progress-fill" 
                    style={{ width: `${progresso}%` }}
                  ></div>
                </div>
                <div className="ct-progress-tips">
                  <FaLightbulb />
                  <span>
                    {progresso < 100 
                      ? "Complete todos os campos obrigatórios"
                      : "Tudo pronto! Você pode salvar as alterações"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita - Formulário */}
          <div className="ct-form-column">
            <form onSubmit={handleSubmit} className="ct-form">
              
              {/* Bloco: Título */}
              <div className="ct-form-block">
                <div className="ct-block-header">
                  <div className="ct-block-icon">
                    <FaEdit />
                  </div>
                  <div className="ct-block-info">
                    <h3>Título do Projeto</h3>
                    <p>Um título claro atrai mais freelancers</p>
                  </div>
                </div>
                <div className="ct-block-content">
                  <input
                    type="text"
                    className={`ct-input ct-input-large ${erros.titulo ? "ct-input-error" : ""}`}
                    placeholder="Ex: Desenvolvimento de aplicativo mobile para delivery"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    maxLength={100}
                    disabled={isLoading}
                  />
                  <div className="ct-input-meta">
                    {erros.titulo && <span className="ct-error">{erros.titulo}</span>}
                    <span className="ct-char-count">{titulo.length}/100</span>
                  </div>
                </div>
              </div>

              {/* Bloco: Descrição */}
              <div className="ct-form-block">
                <div className="ct-block-header">
                  <div className="ct-block-icon">
                    <FaMagic />
                  </div>
                  <div className="ct-block-info">
                    <h3>Descrição Detalhada</h3>
                    <p>Quanto mais detalhes, melhores propostas você receberá</p>
                  </div>
                </div>
                <div className="ct-block-content">
                  <textarea
                    className={`ct-textarea ${erros.descricao ? "ct-input-error" : ""}`}
                    placeholder="Descreva o que você precisa, funcionalidades desejadas, referências visuais..."
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    rows="6"
                    maxLength={1000}
                    disabled={isLoading}
                  />
                  <div className="ct-input-meta">
                    {erros.descricao && <span className="ct-error">{erros.descricao}</span>}
                    <span className="ct-char-count">{descricao.length}/1000</span>
                  </div>
                </div>
              </div>

              {/* Bloco: Prazo e Orçamento */}
              <div className="ct-form-block">
                <div className="ct-block-header">
                  <div className="ct-block-icon">
                    <FaMoneyBillWave />
                  </div>
                  <div className="ct-block-info">
                    <h3>Prazo e Investimento</h3>
                    <p>Defina quando precisa e quanto pode investir</p>
                  </div>
                </div>
                <div className="ct-block-content">
                  <div className="ct-inline-fields">
                    <div className="ct-field-group">
                      <label>
                        <FaCalendarAlt />
                        Prazo de Entrega
                      </label>
                      <input
                        type="date"
                        className={`ct-input ${erros.prazo ? "ct-input-error" : ""}`}
                        value={prazo}
                        onChange={(e) => setPrazo(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        disabled={isLoading}
                      />
                      {erros.prazo && <span className="ct-error">{erros.prazo}</span>}
                    </div>

                    <div className="ct-field-group">
                      <label>
                        <FaMoneyBillWave />
                        Orçamento (R$)
                      </label>
                      <input
                        type="number"
                        className={`ct-input ${erros.orcamento ? "ct-input-error" : ""}`}
                        placeholder="1500.00"
                        value={orcamento}
                        onChange={(e) => setOrcamento(e.target.value)}
                        min="1"
                        step="0.01"
                        disabled={isLoading}
                      />
                      {erros.orcamento && <span className="ct-error">{erros.orcamento}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloco: Área/Ramo */}
              <div className="ct-form-block">
                <div className="ct-block-header">
                  <div className="ct-block-icon ct-block-icon-optional">
                    <FaLayerGroup />
                  </div>
                  <div className="ct-block-info">
                    <h3>Área/Ramo <span className="ct-optional">Opcional</span></h3>
                    <p>Selecione ou digite uma nova área para categorizar seu projeto</p>
                  </div>
                </div>
                <div className="ct-block-content">
                  {ramoSelecionado ? (
                    <div className="ct-selected-ramo">
                      <span className="ct-ramo-tag">
                        <FaLayerGroup />
                        {ramoSelecionado}
                        <button type="button" onClick={removerRamo} disabled={isLoading}>
                          <FaTimes />
                        </button>
                      </span>
                    </div>
                  ) : (
                    <div className="ct-ramo-input-container" ref={ramoInputRef}>
                      <input
                        type="text"
                        className="ct-input"
                        placeholder="Digite ou selecione uma área (ex: Desenvolvimento Web)"
                        value={ramoInput}
                        onChange={handleRamoInput}
                        onKeyDown={handleRamoKeyDown}
                        onFocus={() => setShowRamoSugestoes(true)}
                        disabled={isLoading || loadingRamos}
                      />
                      
                      {showRamoSugestoes && (ramoSugestoesFiltradas.length > 0 || ramoInput.trim()) && (
                        <div className="ct-ramo-dropdown">
                          {ramoSugestoesFiltradas.map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              className="ct-ramo-option"
                              onClick={() => selecionarRamo(r.nome)}
                            >
                              {r.nome}
                            </button>
                          ))}
                          {ramoInput.trim() && !ramoSugestoesFiltradas.some(r => r.nome.toLowerCase() === ramoInput.toLowerCase()) && (
                            <button
                              type="button"
                              className="ct-ramo-option ct-ramo-option-new"
                              onClick={() => selecionarRamo(ramoInput.trim())}
                            >
                              <FaPlus /> Criar "{ramoInput.trim()}"
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {!ramoSelecionado && (
                    <div className="ct-popular-ramos">
                      <span className="ct-popular-label">Populares:</span>
                      <div className="ct-popular-list">
                        {ramosPopulares
                          .filter((r) => r !== ramoSelecionado)
                          .slice(0, 6)
                          .map((r, index) => (
                            <button
                              key={index}
                              type="button"
                              className="ct-popular-btn"
                              onClick={() => selecionarRamo(r)}
                              disabled={isLoading}
                            >
                              {r}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bloco: Habilidades */}
              <div className="ct-form-block">
                <div className="ct-block-header">
                  <div className="ct-block-icon ct-block-icon-optional">
                    <FaMagic />
                  </div>
                  <div className="ct-block-info">
                    <h3>Habilidades Necessárias <span className="ct-optional">Opcional</span></h3>
                    <p>Selecione as competências que o freelancer precisa ter</p>
                  </div>
                </div>
                <div className="ct-block-content">
                  <div className="ct-skills-input-container">
                    <input
                      type="text"
                      className="ct-input"
                      placeholder="Digite uma habilidade e pressione Enter"
                      value={habilidadeInput}
                      onChange={handleHabilidadeInput}
                      onKeyDown={handleHabilidadeKeyDown}
                      disabled={isLoading}
                    />
                  </div>

                  {habilidades.length > 0 && (
                    <div className="ct-selected-skills">
                      {habilidades.map((hab, index) => (
                        <span key={index} className="ct-skill-tag">
                          {hab}
                          <button type="button" onClick={() => removeHabilidade(hab)} disabled={isLoading}>
                            <FaTimes />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {sugestoes.length > 0 && (
                    <div className="ct-skill-suggestions">
                      <span className="ct-suggestions-label">Sugestões:</span>
                      {sugestoes.slice(0, 6).map((sug, index) => (
                        <button
                          key={index}
                          type="button"
                          className="ct-suggestion-btn"
                          onClick={() => adicionarHabilidade(sug)}
                          disabled={isLoading}
                        >
                          + {sug}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="ct-popular-skills">
                    <span className="ct-popular-label">Populares:</span>
                    <div className="ct-popular-list">
                      {habilidadesPopulares
                        .filter((skill) => !habilidades.includes(skill))
                        .slice(0, 10)
                        .map((skill, index) => (
                          <button
                            key={index}
                            type="button"
                            className="ct-popular-btn"
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

              {/* Bloco: Upload */}
              <div className="ct-form-block">
                <div className="ct-block-header">
                  <div className="ct-block-icon ct-block-icon-optional">
                    <FaImage />
                  </div>
                  <div className="ct-block-info">
                    <h3>Anexar Arquivo <span className="ct-optional">Opcional</span></h3>
                    <p>Adicione referências, briefings ou documentos relevantes</p>
                  </div>
                </div>
                <div className="ct-block-content">
                  {/* Arquivo Atual */}
                  {anexoAtual && !removerAnexo && !anexo && (
                    <div style={{ marginBottom: "1rem" }}>
                      <div className="ct-file-preview" style={{ background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                        <div className="ct-file-icon">
                          <FaCheckCircle />
                        </div>
                        <div className="ct-file-info">
                          <span className="ct-file-name">Arquivo atual anexado</span>

                          <a
                            href={anexoAtual}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--cor-primaria)",
                              textDecoration: "underline",
                            }}
                          >
                            Visualizar arquivo
                          </a>

                        </div>
                        <button
                          type="button"
                          className="ct-file-remove"
                          onClick={() => setRemoverAnexo(true)}
                          disabled={isLoading}
                          title="Remover arquivo"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Aviso de remoção */}
                  {removerAnexo && !anexo && (
                    <div style={{ 
                      background: "rgba(239, 68, 68, 0.1)", 
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      borderRadius: "var(--radius-md)",
                      padding: "1rem",
                      marginBottom: "1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      fontSize: "0.875rem",
                      color: "#dc2626"
                    }}>
                      <FaExclamationCircle />
                      <span>
                        O arquivo será removido ao salvar.{" "}
                        <button
                          type="button"
                          onClick={() => setRemoverAnexo(false)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "inherit",
                            textDecoration: "underline",
                            cursor: "pointer",
                            padding: 0,
                            font: "inherit"
                          }}
                        >
                          Desfazer
                        </button>
                      </span>
                    </div>
                  )}

                  <div 
                    className={`ct-upload-zone ${dragActive ? "ct-upload-zone-active" : ""} ${anexo ? "ct-upload-zone-filled" : ""}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      id="ct-file-input"
                      type="file"
                      onChange={(e) => {
                        setAnexo(e.target.files?.[0] || null);
                        setRemoverAnexo(false);
                      }}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip,.rar"
                      disabled={isLoading}
                    />
                    
                    {anexo ? (
                      <div className="ct-file-preview">
                        <div className="ct-file-icon">
                          <FaCheckCircle />
                        </div>
                        <div className="ct-file-info">
                          <span className="ct-file-name">{anexo.name}</span>
                          <span className="ct-file-size">{(anexo.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                        <button
                          type="button"
                          className="ct-file-remove"
                          onClick={() => setAnexo(null)}
                          disabled={isLoading}
                        >
                          <FaTimes />
                        </button>
                      </div>
                    ) : (
                      <label htmlFor="ct-file-input" className="ct-upload-content">
                        <FaCloudUploadAlt className="ct-upload-icon" />
                        <span className="ct-upload-text">
                          {anexoAtual && !removerAnexo
                            ? <>Arraste um arquivo ou <strong>clique para substituir</strong></>
                            : <>Arraste um arquivo ou <strong>clique para selecionar</strong></>}
                        </span>
                        <span className="ct-upload-hint">PDF, DOC, JPG, PNG, ZIP até 10MB</span>
                      </label>
                    )}
                  </div>
                  {erros.anexo && <span className="ct-error">{erros.anexo}</span>}
                </div>
              </div>

              {/* Ações */}
              <div className="ct-form-actions">
                <button
                  type="button"
                  className="ct-btn ct-btn-secondary"
                  onClick={() => navigate(`/trabalhos/${id}`)}
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`ct-btn ct-btn-primary ${isLoading ? "ct-btn-loading" : ""}`}
                  disabled={isLoading || progresso < 100}
                >
                  {isLoading ? (
                    <>
                      <span className="ct-spinner"></span>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <FaCheckCircle />
                      Salvar Alterações
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}