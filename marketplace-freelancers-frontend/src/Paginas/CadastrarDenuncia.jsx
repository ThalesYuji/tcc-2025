// src/Paginas/CadastrarDenuncia.jsx - Redesign Seguindo Padrão dos Trabalhos
import React, { useContext, useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import api from "../Servicos/Api";
import "../styles/CadastrarDenuncia.css";

export default function CadastrarDenuncia() {
  const { usuarioLogado } = useContext(UsuarioContext);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Estados do formulário
  const [motivo, setMotivo] = useState("");
  const [provas, setProvas] = useState([]);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [denunciado, setDenunciado] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  
  const fileInputRef = useRef(null);
  const token = localStorage.getItem("token");

  // Buscar informações do usuário denunciado
  useEffect(() => {
    const idDenunciado = location.state?.denunciado;
    if (!idDenunciado) {
      setErro("Usuário a ser denunciado não foi informado.");
      setCarregando(false);
      return;
    }
    
    async function buscarUsuario() {
      try {
        const res = await api.get(`/usuarios/${idDenunciado}/`);
        setDenunciado(res.data);
      } catch {
        setErro("Erro ao buscar informações do usuário denunciado.");
      } finally {
        setCarregando(false);
      }
    }
    
    buscarUsuario();
  }, [location.state]);

  // Manipular arquivos selecionados
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Validar tipo e tamanho dos arquivos
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      return isValidType && isValidSize;
    });
    
    if (validFiles.length !== files.length) {
      setErro("Alguns arquivos foram ignorados. Apenas imagens até 10MB são aceitas.");
      setTimeout(() => setErro(""), 5000);
    }
    
    setProvas(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remover arquivo específico
  const removerArquivo = (index) => {
    setProvas(prev => prev.filter((_, i) => i !== index));
  };

  // Limpar mensagens de erro/sucesso
  const limparMensagens = () => {
    setErro("");
    setSucesso("");
  };

  // Submeter formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    limparMensagens();
    
    // Validações
    if (!motivo.trim()) {
      setErro("Por favor, descreva o motivo da denúncia.");
      return;
    }
    
    if (motivo.trim().length < 20) {
      setErro("O motivo da denúncia deve ter pelo menos 20 caracteres.");
      return;
    }
    
    if (provas.length === 0) {
      setErro("Você deve anexar pelo menos uma prova (imagem).");
      return;
    }

    setEnviando(true);

    const formData = new FormData();
    formData.append("denunciado", denunciado.id);
    formData.append("motivo", motivo.trim());
    provas.forEach((file) => formData.append("provas", file));

    try {
      await api.post("/denuncias/", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      
      setSucesso("Denúncia enviada com sucesso! Você será redirecionado em instantes.");
      setMotivo("");
      setProvas([]);
      
      setTimeout(() => navigate("/dashboard"), 3000);
    } catch (err) {
      if (err.response?.data?.detail) {
        setErro(err.response.data.detail);
      } else if (err.response?.data) {
        const mensagem = Object.values(err.response.data)[0];
        setErro(typeof mensagem === "string" ? mensagem : "Erro ao enviar a denúncia.");
      } else {
        setErro("Erro inesperado. Tente novamente.");
      }
    } finally {
      setEnviando(false);
    }
  };

  // Cancelar e voltar
  const handleCancelar = () => {
    navigate(-1);
  };

  // Drag and drop handlers
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
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (validFiles.length !== files.length) {
      setErro("Alguns arquivos foram ignorados. Apenas imagens são aceitas.");
      setTimeout(() => setErro(""), 5000);
    }
    
    setProvas(prev => [...prev, ...validFiles]);
  };

  // Loading state
  if (carregando) {
    return (
      <div className="denuncia-page">
        <div className="denuncia-container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <h3>Carregando informações</h3>
            <p>Buscando dados do usuário...</p>
          </div>
        </div>
      </div>
    );
  }

  // Verificações de segurança
  if (!usuarioLogado) {
    return (
      <div className="denuncia-page">
        <div className="denuncia-container">
          <div className="error-state">
            <i className="bi bi-shield-x"></i>
            <h3>Acesso Negado</h3>
            <p>Usuário não autenticado.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!denunciado && erro) {
    return (
      <div className="denuncia-page">
        <div className="denuncia-container">
          <div className="error-state">
            <i className="bi bi-person-x"></i>
            <h3>Usuário Não Encontrado</h3>
            <p>{erro}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!denunciado) {
    return (
      <div className="denuncia-page">
        <div className="denuncia-container">
          <div className="error-state">
            <i className="bi bi-person-x"></i>
            <h3>Usuário Não Encontrado</h3>
            <p>Usuário para denúncia não foi encontrado.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="denuncia-page">
      <div className="denuncia-container">
        
        {/* Header - Seguindo padrão dos trabalhos */}
        <div className="denuncia-header">
          <h1 className="denuncia-title">
            <div className="denuncia-title-icon">
              <i className="bi bi-shield-exclamation"></i>
            </div>
            <span>Enviar Denúncia</span>
          </h1>
          <p className="denuncia-subtitle">
            Reporte comportamentos inadequados de forma segura e responsável
          </p>
        </div>

        {/* Card do Usuário Denunciado - Seguindo padrão dos cards */}
        <div className="usuario-denunciado">
          <div className="usuario-header">
            <div className="section-header">
              <div className="section-icon">
                <i className="bi bi-person-exclamation"></i>
              </div>
              <div className="section-info">
                <h3 className="section-title">Usuário que será denunciado</h3>
                <p className="section-subtitle">Informações do usuário reportado</p>
              </div>
            </div>
          </div>
          
          <div className="usuario-body">
            <div className="usuario-info">
              <div className="info-item">
                <span className="info-label">Nome</span>
                <span className="info-value">{denunciado.nome}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Tipo de Conta</span>
                <span className="info-value">
                  {denunciado.tipo === "freelancer" ? "Freelancer" : "Cliente"}
                </span>
              </div>
              {denunciado.email && (
                <div className="info-item">
                  <span className="info-label">E-mail</span>
                  <span className="info-value">{denunciado.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Alerta Informativo - Seguindo padrão das propostas */}
        <div className="info-alert">
          <i className="bi bi-info-circle"></i>
          <div className="info-alert-content">
            <h4>Use este recurso com responsabilidade</h4>
            <p>Forneça descrição detalhada, provas claras e contexto suficiente para análise. Denúncias falsas podem resultar em penalidades.</p>
          </div>
        </div>

        {/* Formulário Principal - Seguindo padrão dos cards */}
        <div className="denuncia-form-card">
          
          {/* Header do formulário */}
          <div className="form-header">
            <div className="form-header-info">
              <div className="form-header-icon">
                <i className="bi bi-chat-text"></i>
              </div>
              <div className="form-header-text">
                <h3>Formulário de Denúncia</h3>
                <p>Preencha as informações necessárias para sua denúncia</p>
              </div>
            </div>
          </div>

          {/* Mensagens - Seguindo padrão das propostas */}
          {(erro || sucesso) && (
            <div className="denuncia-messages">
              {erro && (
                <div className="alert-error">
                  <i className="bi bi-exclamation-circle"></i>
                  {erro}
                </div>
              )}
              {sucesso && (
                <div className="alert-success">
                  <i className="bi bi-check-circle"></i>
                  {sucesso}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="denuncia-form">
            
            {/* Campo de Motivo */}
            <div className="form-group">
              <label htmlFor="motivo" className="form-label">
                <i className="bi bi-chat-text"></i>
                Motivo da denúncia
                <span className="required">*</span>
              </label>
              <textarea
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="denuncia-textarea"
                placeholder="Descreva detalhadamente o que aconteceu. Seja específico sobre datas, situações e comportamentos inadequados. Quanto mais detalhes, melhor será nossa análise."
                disabled={enviando}
                maxLength={2000}
              />
              <div className="textarea-counter">
                {motivo.length}/2000 caracteres • Mínimo: 20 caracteres
              </div>
            </div>

            {/* Upload de Provas */}
            <div className="form-group">
              <label className="form-label">
                <i className="bi bi-camera"></i>
                Provas (imagens)
                <span className="required">*</span>
              </label>
              
              <div 
                className="file-upload-area"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="file-upload-content">
                  <div className="upload-icon">
                    <i className="bi bi-cloud-upload"></i>
                  </div>
                  <div className="upload-text">
                    <h4>Clique ou arraste imagens aqui</h4>
                    <p>Formatos aceitos: JPG, PNG • Máximo: 10MB por arquivo</p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  multiple
                  onChange={handleFileChange}
                  className="file-input"
                  disabled={enviando}
                />
              </div>

              {/* Preview dos Arquivos */}
              {provas.length > 0 && (
                <div className="preview-provas">
                  <h4>
                    <i className="bi bi-check-circle"></i>
                    {provas.length} arquivo{provas.length > 1 ? 's' : ''} selecionado{provas.length > 1 ? 's' : ''}
                  </h4>
                  <div className="files-grid">
                    {provas.map((file, index) => (
                      <div key={index} className="file-preview">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Prova ${index + 1}`}
                          onLoad={(e) => URL.revokeObjectURL(e.target.src)}
                        />
                        <div className="file-name">{file.name}</div>
                        <button
                          type="button"
                          className="remove-file"
                          onClick={(e) => {
                            e.stopPropagation();
                            removerArquivo(index);
                          }}
                          title="Remover arquivo"
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </form>

          {/* Footer do formulário */}
          <div className="form-footer">
            <div className="form-actions">
              <button
                type="button"
                className="btn-cancelar"
                onClick={handleCancelar}
                disabled={enviando}
              >
                <i className="bi bi-arrow-left"></i>
                Cancelar
              </button>
              
              <button
                type="submit"
                className="btn-denuncia"
                onClick={handleSubmit}
                disabled={enviando || !motivo.trim() || motivo.trim().length < 20 || provas.length === 0}
              >
                {enviando ? (
                  <>
                    <div className="loading-spinner small"></div>
                    Enviando denúncia...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send"></i>
                    Enviar Denúncia
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}