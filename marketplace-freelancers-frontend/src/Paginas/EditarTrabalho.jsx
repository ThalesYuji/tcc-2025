// src/Paginas/EditarTrabalho.jsx - VERSÃO COMPLETA CORRIGIDA
import React, { useState, useEffect } from "react";
import api from "../Servicos/Api";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/EditarTrabalho.css";

export default function EditarTrabalho() {
  // Estados do formulário
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prazo, setPrazo] = useState("");
  const [orcamento, setOrcamento] = useState("");
  const [habilidades, setHabilidades] = useState([]);
  const [novaHabilidade, setNovaHabilidade] = useState("");

  // Estados de anexo - CORRIGIDO: usar anexo_url
  const [anexoAtualUrl, setAnexoAtualUrl] = useState(null);
  const [anexoAtualNome, setAnexoAtualNome] = useState("");
  const [novoAnexo, setNovoAnexo] = useState(null);
  const [removerAnexo, setRemoverAnexo] = useState(false);

  // Estados de controle
  const [erros, setErros] = useState({});
  const [sucesso, setSucesso] = useState("");
  const [erroGeral, setErroGeral] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [carregandoInicial, setCarregandoInicial] = useState(true);

  const navigate = useNavigate();
  const { id } = useParams();

  // Carregar dados do trabalho
  useEffect(() => {
    async function carregarTrabalho() {
      try {
        const resp = await api.get(`/trabalhos/${id}/`);
        setTitulo(resp.data.titulo);
        setDescricao(resp.data.descricao);
        setPrazo(resp.data.prazo);
        setOrcamento(resp.data.orcamento);
        
        // CORRIGIDO: usar anexo_url ao invés de anexo
        if (resp.data.anexo_url) {
          setAnexoAtualUrl(resp.data.anexo_url);
          // Extrair nome do arquivo da URL
          const nomeArquivo = resp.data.anexo_url.split('/').pop().split('?')[0];
          setAnexoAtualNome(nomeArquivo || "Arquivo anexado");
        }

        if (resp.data.habilidades_detalhes) {
          setHabilidades(resp.data.habilidades_detalhes.map((h) => h.nome));
        }
        setCarregandoInicial(false);
      } catch {
        setErroGeral("Erro ao carregar o trabalho. Tente novamente mais tarde.");
        setCarregandoInicial(false);
      }
    }
    carregarTrabalho();
  }, [id]);

  // Submissão do formulário
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

    habilidades.forEach((hab) => formData.append("habilidades", hab));

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
      setTimeout(() => navigate("/trabalhos"), 2000);
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
        setErroGeral(backendErros.detail || "Erro ao atualizar o trabalho.");
      } else {
        setErroGeral("Erro ao atualizar o trabalho. Verifique os dados e tente novamente.");
      }
    } finally {
      setCarregando(false);
    }
  };

  // Gerenciar habilidades
  const handleAdicionarHabilidade = () => {
    if (novaHabilidade.trim() && !habilidades.includes(novaHabilidade.trim())) {
      setHabilidades([...habilidades, novaHabilidade.trim()]);
      setNovaHabilidade("");
    }
  };

  const handleRemoverHabilidade = (hab) => {
    setHabilidades(habilidades.filter((h) => h !== hab));
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdicionarHabilidade();
    }
  };

  // Gerenciar anexos
  const handleAnexoChange = (e) => {
    setNovoAnexo(e.target.files[0]);
    setRemoverAnexo(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setNovoAnexo(files[0]);
      setRemoverAnexo(false);
    }
  };

  // Loading inicial
  if (carregandoInicial) {
    return (
      <div className="editar-trabalho-page">
        <div className="page-container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <h3>Carregando trabalho...</h3>
            <p>Aguarde enquanto buscamos as informações</p>
          </div>
        </div>
      </div>
    );
  }

  // Estado de erro
  if (erroGeral && !carregandoInicial) {
    return (
      <div className="editar-trabalho-page">
        <div className="page-container">
          <div className="access-denied-container">
            <div className="access-denied-icon">⚠️</div>
            <h3>Erro ao Carregar</h3>
            <p>{erroGeral}</p>
            <div className="error-actions">
              <button 
                className="btn btn-primary"
                onClick={() => window.location.reload()}
              >
                <i className="bi bi-arrow-clockwise"></i>
                Tentar Novamente
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => navigate("/trabalhos")}
              >
                <i className="bi bi-arrow-left"></i>
                Voltar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="editar-trabalho-page">
      {/* Container Principal */}
      <div className="page-container">
        
        {/* Header com Breadcrumb */}
        <div className="editar-trabalho-header">
          <div className="detalhes-nav">
            <button
              onClick={() => navigate("/trabalhos")}
              className="btn-voltar"
            >
              <i className="bi bi-arrow-left"></i>
              Voltar para Trabalhos
            </button>
          </div>

          {/* Título Principal */}
          <div className="detalhes-title-section">
            <h1 className="editar-trabalho-title">
              <div className="editar-trabalho-title-icon">
                <i className="bi bi-pencil-square"></i>
              </div>
              Editar Trabalho
            </h1>
            <p className="editar-trabalho-subtitle">
              Atualize as informações do seu projeto para atrair os melhores profissionais
            </p>
          </div>
        </div>

        {/* Sucesso Alert */}
        {sucesso && (
          <div className="alert-success">
            <i className="bi bi-check-circle-fill"></i>
            <span>{sucesso}</span>
          </div>
        )}

        {/* Erro Geral */}
        {erroGeral && (
          <div className="alert-error">
            <i className="bi bi-exclamation-circle-fill"></i>
            <span>{erroGeral}</span>
          </div>
        )}

        {/* Layout Principal em Grid */}
        <div className="editar-trabalho-grid">
          
          {/* Coluna Principal - Formulário */}
          <div className="form-main-column">
            <form onSubmit={handleSubmit} className="trabalho-form">
              
              {/* Card: Informações Básicas */}
              <div className="modern-card">
                <div className="card-header">
                  <h2 className="card-title">
                    <i className="bi bi-info-circle"></i>
                    Informações Básicas
                  </h2>
                </div>

                <div className="card-body">
                  {/* Título */}
                  <div className="form-field">
                    <label className="input-label">
                      <i className="bi bi-card-text"></i>
                      Título do Trabalho
                      <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${erros.titulo ? 'error' : ''}`}
                      placeholder="Ex: Desenvolvimento de sistema web para e-commerce..."
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      required
                    />
                    {erros.titulo && (
                      <div className="error-msg">
                        <i className="bi bi-exclamation-circle"></i> {erros.titulo}
                      </div>
                    )}
                  </div>

                  {/* Descrição */}
                  <div className="form-field">
                    <label className="input-label">
                      <i className="bi bi-file-text"></i>
                      Descrição Detalhada
                      <span className="required">*</span>
                    </label>
                    <textarea
                      className={`form-control textarea-field ${erros.descricao ? 'error' : ''}`}
                      placeholder="Descreva detalhadamente o trabalho: objetivos, requisitos técnicos, escopo, entregáveis esperados..."
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      rows={6}
                      maxLength={2000}
                      required
                    />
                    <div className="input-footer">
                      <div className="char-count">{descricao.length}/2000</div>
                      {erros.descricao && (
                        <div className="error-msg">
                          <i className="bi bi-exclamation-circle"></i> {erros.descricao}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row com Prazo e Orçamento */}
                  <div className="form-row">
                    {/* Prazo */}
                    <div className="form-field">
                      <label className="input-label">
                        <i className="bi bi-calendar"></i>
                        Data Limite
                        <span className="required">*</span>
                      </label>
                      <input
                        type="date"
                        className={`form-control ${erros.prazo ? 'error' : ''}`}
                        value={prazo}
                        onChange={(e) => setPrazo(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                      {erros.prazo && (
                        <div className="error-msg">
                          <i className="bi bi-exclamation-circle"></i> {erros.prazo}
                        </div>
                      )}
                    </div>

                    {/* Orçamento */}
                    <div className="form-field">
                      <label className="input-label">
                        <i className="bi bi-currency-dollar"></i>
                        Orçamento (R$)
                        <span className="required">*</span>
                      </label>
                      <input
                        type="number"
                        className={`form-control ${erros.orcamento ? 'error' : ''}`}
                        placeholder="1500.00"
                        value={orcamento}
                        onChange={(e) => setOrcamento(e.target.value)}
                        min="0"
                        step="0.01"
                        required
                      />
                      {erros.orcamento && (
                        <div className="error-msg">
                          <i className="bi bi-exclamation-circle"></i> {erros.orcamento}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card: Habilidades */}
              <div className="modern-card">
                <div className="card-header">
                  <h2 className="card-title">
                    <i className="bi bi-tools"></i>
                    Habilidades Necessárias
                  </h2>
                  <span className="optional-badge">Opcional</span>
                </div>

                <div className="card-body">
                  <div className="skills-container">
                    {/* Input de Nova Habilidade */}
                    <div className="skills-input-wrapper">
                      <i className="bi bi-search skills-input-icon"></i>
                      <input
                        type="text"
                        className="skills-input"
                        placeholder="Digite uma habilidade (ex: React, Python, Figma)..."
                        value={novaHabilidade}
                        onChange={(e) => setNovaHabilidade(e.target.value)}
                        onKeyPress={handleKeyPress}
                      />
                    </div>

                    {/* Habilidades Selecionadas */}
                    {habilidades.length > 0 && (
                      <div className="selected-skills">
                        {habilidades.map((hab, index) => (
                          <span key={index} className="skill-badge">
                            {hab}
                            <button 
                              type="button" 
                              className="skill-remove"
                              onClick={() => handleRemoverHabilidade(hab)}
                              title={`Remover ${hab}`}
                            >
                              <i className="bi bi-x"></i>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Sugestões Populares */}
                    <div className="popular-skills">
                      <div className="popular-skills-header">
                        <i className="bi bi-star"></i>
                        Sugestões Populares
                      </div>
                      <div className="popular-skills-list">
                        {["JavaScript", "Python", "React", "Node.js", "Design Gráfico", "WordPress", "SEO", "Marketing Digital"].map(sug => (
                          !habilidades.includes(sug) && (
                            <button
                              key={sug}
                              type="button"
                              className="popular-skill-tag"
                              onClick={() => {
                                setHabilidades([...habilidades, sug]);
                              }}
                            >
                              {sug}
                            </button>
                          )
                        ))}
                      </div>
                    </div>

                    {erros.habilidades && (
                      <div className="error-msg">
                        <i className="bi bi-exclamation-circle"></i> {erros.habilidades}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card: Anexos - CORRIGIDO */}
              <div className="modern-card">
                <div className="card-header">
                  <h2 className="card-title">
                    <i className="bi bi-paperclip"></i>
                    Arquivos e Anexos
                  </h2>
                  <span className="optional-badge">Opcional</span>
                </div>

                <div className="card-body">
                  {/* Arquivo Atual - CORRIGIDO */}
                  {anexoAtualUrl && !removerAnexo && (
                    <div className="current-file-section">
                      <h4 className="subsection-title">
                        <i className="bi bi-file-check"></i>
                        Arquivo Atual
                      </h4>
                      <div className="file-selected-info current">
                        <div className="file-success-icon">
                          <i className="bi bi-file-earmark-text"></i>
                        </div>
                        <div className="file-details">
                          <span className="file-name">
                            {anexoAtualNome}
                          </span>
                          <small className="file-size">Arquivo anexado</small>
                          <a 
                            href={anexoAtualUrl}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="file-link"
                            onClick={(e) => {
                              if (!anexoAtualUrl || anexoAtualUrl === 'null') {
                                e.preventDefault();
                                alert('Arquivo não disponível');
                              }
                            }}
                          >
                            <i className="bi bi-eye"></i>
                            Visualizar arquivo
                          </a>
                        </div>
                        <button
                          type="button"
                          className="file-remove"
                          onClick={() => { 
                            setRemoverAnexo(true); 
                            setNovoAnexo(null); 
                          }}
                          title="Remover arquivo"
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Área de Upload */}
                  <div className="file-upload-area"
                       onDragOver={handleDragOver}
                       onDragLeave={handleDragLeave}
                       onDrop={handleDrop}
                  >
                    <input
                      id="file-input"
                      type="file"
                      className="file-input"
                      onChange={handleAnexoChange}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip,.xlsx,.xls"
                    />
                    
                    <label htmlFor="file-input" className="file-upload-label">
                      <div className="file-upload-placeholder">
                        <div className="upload-icon">
                          <i className="bi bi-cloud-upload"></i>
                        </div>
                        
                        <div className="upload-text">
                          <span className="upload-title">
                            {novoAnexo ? 'Arquivo Selecionado' : (anexoAtualUrl && !removerAnexo ? 'Substituir Arquivo' : 'Adicionar Arquivo')}
                          </span>
                          <span className="upload-subtitle">
                            Clique aqui ou arraste um arquivo
                          </span>
                        </div>

                        {novoAnexo && (
                          <div className="file-selected-info">
                            <div className="file-success-icon">
                              <i className="bi bi-file-check"></i>
                            </div>
                            <div className="file-details">
                              <span className="file-name">{novoAnexo.name}</span>
                              <small className="file-size">({(novoAnexo.size / 1024 / 1024).toFixed(2)} MB)</small>
                            </div>
                            <button
                              type="button"
                              className="file-remove"
                              onClick={(e) => {
                                e.preventDefault();
                                setNovoAnexo(null);
                              }}
                            >
                              <i className="bi bi-x"></i>
                            </button>
                          </div>
                        )}

                        <div className="file-types">
                          PDF, DOC, DOCX, JPG, PNG, ZIP, XLSX (máx. 10MB)
                        </div>
                      </div>
                    </label>
                  </div>

                  {removerAnexo && (
                    <div className="removal-warning">
                      <i className="bi bi-exclamation-triangle"></i>
                      <span>O arquivo atual será removido ao salvar as alterações</span>
                      <button
                        type="button"
                        className="btn btn-outline btn-small"
                        onClick={() => setRemoverAnexo(false)}
                      >
                        Cancelar remoção
                      </button>
                    </div>
                  )}

                  {erros.anexo && (
                    <div className="error-msg">
                      <i className="bi bi-exclamation-circle"></i> {erros.anexo}
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Sidebar Direita - Preview e Ações */}
          <div className="form-sidebar-column">
            
            {/* Preview do Trabalho */}
            <div className="modern-card preview-card">
              <div className="card-header">
                <h2 className="card-title">
                  <i className="bi bi-eye"></i>
                  Preview do Trabalho
                </h2>
              </div>
              <div className="card-body">
                <div className="preview-content">
                  <h3 className="preview-title">
                    {titulo || "Título do trabalho aparecerá aqui..."}
                  </h3>
                  <p className="preview-description">
                    {descricao ? 
                      (descricao.length > 150 ? descricao.substring(0, 150) + "..." : descricao)
                      : "A descrição do trabalho será mostrada aqui conforme você digita..."
                    }
                  </p>
                  <div className="preview-details">
                    <div className="preview-detail">
                      <i className="bi bi-calendar"></i>
                      <span>Prazo: {prazo ? new Date(prazo).toLocaleDateString('pt-BR') : "Não definido"}</span>
                    </div>
                    <div className="preview-detail">
                      <i className="bi bi-currency-dollar"></i>
                      <span>Orçamento: {orcamento ? `R$ ${parseFloat(orcamento).toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : "Não definido"}</span>
                    </div>
                    <div className="preview-detail">
                      <i className="bi bi-tools"></i>
                      <span>Habilidades: {habilidades.length} selecionadas</span>
                    </div>
                    <div className="preview-detail">
                      <i className="bi bi-paperclip"></i>
                      <span>Anexo: {(anexoAtualUrl && !removerAnexo) || novoAnexo ? "Sim" : "Nenhum"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ações do Formulário */}
            <div className="modern-card">
              <div className="card-body">
                <div className="form-actions">
                  <button
                    type="submit"
                    className={`gradient-btn btn-large ${carregando ? 'loading' : ''}`}
                    onClick={handleSubmit}
                    disabled={carregando}
                  >
                    {carregando ? (
                      <>
                        <div className="loading-spinner"></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg"></i>
                        Salvar Alterações
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => navigate("/trabalhos")}
                    disabled={carregando}
                  >
                    <i className="bi bi-x"></i>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}