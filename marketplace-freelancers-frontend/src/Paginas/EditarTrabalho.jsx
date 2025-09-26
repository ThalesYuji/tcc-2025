// src/Paginas/EditarTrabalho.jsx
import React, { useState, useEffect } from "react";
import api from "../Servicos/Api";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/EditarTrabalho.css";

const BASE_URL = "http://localhost:8000";

export default function EditarTrabalho() {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prazo, setPrazo] = useState("");
  const [orcamento, setOrcamento] = useState("");
  const [habilidades, setHabilidades] = useState([]);
  const [novaHabilidade, setNovaHabilidade] = useState("");

  const [anexoAtual, setAnexoAtual] = useState(null);
  const [novoAnexo, setNovoAnexo] = useState(null);
  const [removerAnexo, setRemoverAnexo] = useState(false);

  const [erros, setErros] = useState({});
  const [sucesso, setSucesso] = useState("");
  const [erroGeral, setErroGeral] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [carregandoInicial, setCarregandoInicial] = useState(true);

  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    async function carregarTrabalho() {
      try {
        const resp = await api.get(`/trabalhos/${id}/`);
        setTitulo(resp.data.titulo);
        setDescricao(resp.data.descricao);
        setPrazo(resp.data.prazo);
        setOrcamento(resp.data.orcamento);
        setAnexoAtual(resp.data.anexo);

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

  const handleAnexoChange = (e) => {
    setNovoAnexo(e.target.files[0]);
    setRemoverAnexo(false);
  };

  // Estado de loading inicial
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

  // Estado de erro geral
  if (erroGeral && !carregandoInicial) {
    return (
      <div className="editar-trabalho-page">
        <div className="page-container">
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <h3 className="error-title">Erro ao Carregar</h3>
            <p className="error-message">{erroGeral}</p>
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
      <div className="page-container">
        
        {/* Header igual às outras páginas */}
        <div className="editar-header">
          <h1 className="editar-title">
            <div className="editar-title-icon">
              <i className="bi bi-pencil-square"></i>
            </div>
            Editar Trabalho
          </h1>
          <p className="editar-subtitle">
            Atualize as informações do seu projeto
          </p>
        </div>

        {/* Toolbar de ações */}
        <div className="editar-toolbar">
          <div className="toolbar-left">
            <button 
              className="btn-voltar"
              onClick={() => navigate("/trabalhos")}
            >
              <i className="bi bi-arrow-left"></i>
              Voltar aos Trabalhos
            </button>
            <div className="toolbar-info">
              <h3>Editando: {titulo || "Trabalho"}</h3>
              <p>Faça as alterações necessárias nos campos abaixo</p>
            </div>
          </div>
        </div>

        {/* Mensagem de sucesso */}
        {sucesso && (
          <div className="success-message">
            <i className="bi bi-check-circle"></i>
            {sucesso}
          </div>
        )}

        {/* Formulário */}
        <div className="editar-form-container">
          <div className="editar-form-card">
            <form onSubmit={handleSubmit} className="editar-form">
              
              {/* Seção: Informações Básicas */}
              <div className="form-section">
                <h3 className="form-section-title">
                  <i className="bi bi-info-circle"></i>
                  Informações Básicas
                </h3>

                <div className="form-group">
                  <label className="form-label">Título do Trabalho</label>
                  <input
                    type="text"
                    className={`form-control ${erros.titulo ? 'form-control-error' : ''}`}
                    placeholder="Digite o título do trabalho..."
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    required
                  />
                  {erros.titulo && <div className="field-error">{erros.titulo}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label">Descrição</label>
                  <textarea
                    className={`form-control ${erros.descricao ? 'form-control-error' : ''}`}
                    placeholder="Descreva detalhadamente o trabalho..."
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    rows={4}
                    required
                  />
                  {erros.descricao && <div className="field-error">{erros.descricao}</div>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Data de Prazo</label>
                    <input
                      type="date"
                      className={`form-control ${erros.prazo ? 'form-control-error' : ''}`}
                      value={prazo}
                      onChange={(e) => setPrazo(e.target.value)}
                      required
                    />
                    {erros.prazo && <div className="field-error">{erros.prazo}</div>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Orçamento (R$)</label>
                    <input
                      type="number"
                      className={`form-control ${erros.orcamento ? 'form-control-error' : ''}`}
                      placeholder="0,00"
                      value={orcamento}
                      onChange={(e) => setOrcamento(e.target.value)}
                      min="0"
                      step="0.01"
                      required
                    />
                    {erros.orcamento && <div className="field-error">{erros.orcamento}</div>}
                  </div>
                </div>
              </div>

              {/* Seção: Habilidades */}
              <div className="form-section">
                <h3 className="form-section-title">
                  <i className="bi bi-tools"></i>
                  Habilidades Necessárias
                </h3>

                <div className="habilidades-container">
                  {habilidades.length > 0 && (
                    <div className="habilidades-list">
                      {habilidades.map((hab, index) => (
                        <span key={index} className="habilidade-tag">
                          {hab}
                          <button 
                            type="button" 
                            className="habilidade-remove"
                            onClick={() => handleRemoverHabilidade(hab)}
                            aria-label={`Remover ${hab}`}
                          >
                            <i className="bi bi-x"></i>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="habilidade-input-container">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Digite uma habilidade e pressione Enter..."
                      value={novaHabilidade}
                      onChange={(e) => setNovaHabilidade(e.target.value)}
                      onKeyPress={handleKeyPress}
                    />
                    <button
                      type="button"
                      className="btn-add-habilidade"
                      onClick={handleAdicionarHabilidade}
                      disabled={!novaHabilidade.trim()}
                    >
                      <i className="bi bi-plus"></i>
                      Adicionar
                    </button>
                  </div>
                </div>
                {erros.habilidades && <div className="field-error">{erros.habilidades}</div>}
              </div>

              {/* Seção: Arquivo Anexo */}
              <div className="form-section">
                <h3 className="form-section-title">
                  <i className="bi bi-paperclip"></i>
                  Arquivo Anexo
                </h3>

                <div className="anexo-container">
                  {/* Anexo atual */}
                  {anexoAtual && !removerAnexo && (
                    <div className="anexo-atual">
                      <div className="anexo-info">
                        <div className="anexo-icon">
                          <i className="bi bi-file-earmark"></i>
                        </div>
                        <div className="anexo-details">
                          <h4>Arquivo atual</h4>
                          <a 
                            href={`${BASE_URL}${anexoAtual}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            {anexoAtual.split("/").pop()}
                          </a>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-remove-anexo"
                        onClick={() => { 
                          setRemoverAnexo(true); 
                          setNovoAnexo(null); 
                        }}
                      >
                        <i className="bi bi-trash"></i>
                        Remover
                      </button>
                    </div>
                  )}

                  {/* Upload area */}
                  <div className="upload-area">
                    <div className="upload-dropzone" onClick={() => document.getElementById('file-input').click()}>
                      <input
                        id="file-input"
                        type="file"
                        className="file-input"
                        onChange={handleAnexoChange}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
                      />
                      
                      <div className="upload-icon">
                        <i className="bi bi-cloud-upload"></i>
                      </div>
                      
                      <div className="upload-text">
                        <h4>
                          {novoAnexo ? 'Arquivo selecionado' : 
                           anexoAtual && !removerAnexo ? 'Substituir arquivo' : 
                           'Selecionar arquivo'}
                        </h4>
                        <p>Clique para selecionar ou arraste um arquivo aqui</p>
                        <p>PDF, DOC, DOCX, JPG, PNG, ZIP (máx. 10MB)</p>
                      </div>
                      
                      {novoAnexo && (
                        <div className="selected-file">
                          <i className="bi bi-file-check"></i>
                          {novoAnexo.name}
                        </div>
                      )}
                      
                      {removerAnexo && (
                        <div className="selected-file" style={{ color: 'var(--cor-erro)' }}>
                          <i className="bi bi-trash"></i>
                          Arquivo será removido
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {erros.anexo && <div className="field-error">{erros.anexo}</div>}
              </div>

              {/* Ações do formulário */}
              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate("/trabalhos")}
                  disabled={carregando}
                >
                  <i className="bi bi-x"></i>
                  Cancelar
                </button>
                
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={carregando}
                >
                  {carregando ? (
                    <>
                      <div className="btn-spinner"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check"></i>
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