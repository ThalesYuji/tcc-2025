// src/Paginas/Conta.jsx - Redesign Moderno
import React, { useContext, useState, useRef, useEffect } from "react";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import api from "../Servicos/Api";
import "../styles/Conta.css";

export default function Conta() {
  const { usuarioLogado, setUsuarioLogado } = useContext(UsuarioContext);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({
    nome: usuarioLogado?.nome || "",
    telefone: usuarioLogado?.telefone || "",
    bio: usuarioLogado?.bio || "",
    foto_perfil: null,
  });
  const [previewFoto, setPreviewFoto] = useState(getPreviewFoto(usuarioLogado));
  const [feedback, setFeedback] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [notaMedia, setNotaMedia] = useState(usuarioLogado?.nota_media);

  // Notificações
  const [notificacaoEmail, setNotificacaoEmail] = useState(usuarioLogado?.notificacao_email ?? true);
  const [carregandoNotificacao, setCarregandoNotificacao] = useState(false);
  const [feedbackNotificacao, setFeedbackNotificacao] = useState("");

  // Exclusão de conta
  const [showModalExcluir, setShowModalExcluir] = useState(false);
  const [senhaExcluir, setSenhaExcluir] = useState("");
  const [excluindo, setExcluindo] = useState(false);
  const [feedbackExcluir, setFeedbackExcluir] = useState("");
  const [erroExcluir, setErroExcluir] = useState("");

  // Troca de senha
  const [exibirTrocaSenha, setExibirTrocaSenha] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
  const [feedbackSenha, setFeedbackSenha] = useState("");
  const [erroSenha, setErroSenha] = useState("");
  const [carregandoSenha, setCarregandoSenha] = useState(false);

  // Feedback global da troca de senha
  const [feedbackTrocaSenha, setFeedbackTrocaSenha] = useState("");

  const fileInputRef = useRef(null);

  function formatarTelefone(valor) {
    if (!valor) return "";
    let numeros = valor.replace(/\D/g, "");
    if (numeros.length > 11) numeros = numeros.slice(0, 11);
    if (numeros.length > 10) return numeros.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    if (numeros.length > 6) return numeros.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    if (numeros.length > 2) return numeros.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
    return numeros.replace(/^(\d*)/, "($1");
  }

  useEffect(() => {
    async function buscarAvaliacoes() {
      try {
        const resp = await api.get("/avaliacoes/");
        const recebidas = resp.data.filter((a) => a.avaliado.id === usuarioLogado.id);
        setAvaliacoes(recebidas);
        if (recebidas.length > 0) {
          const media = recebidas.reduce((soma, a) => soma + a.nota, 0) / recebidas.length;
          setNotaMedia(media);
        } else {
          setNotaMedia(null);
        }
      } catch {
        setAvaliacoes([]);
      }
    }
    if (usuarioLogado) buscarAvaliacoes();
  }, [usuarioLogado]);

  function handleEditar() {
    setEditando(true);
    setForm({
      nome: usuarioLogado.nome,
      telefone: formatarTelefone(usuarioLogado.telefone || ""),
      bio: usuarioLogado.bio || "",
      foto_perfil: null,
    });
    setPreviewFoto(getPreviewFoto(usuarioLogado));
    setErro("");
    setFeedback("");
  }

  function handleChange(e) {
    const { name, value, files } = e.target;
    if (name === "foto_perfil" && files && files[0]) {
      setForm((f) => ({ ...f, foto_perfil: files[0] }));
      setPreviewFoto(URL.createObjectURL(files[0]));
    } else if (name === "telefone") {
      setForm((f) => ({ ...f, telefone: formatarTelefone(value) }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  }

  function handleCancelar() {
    setEditando(false);
    setErro("");
    setFeedback("");
    setForm({
      nome: usuarioLogado.nome,
      telefone: formatarTelefone(usuarioLogado.telefone || ""),
      bio: usuarioLogado.bio || "",
      foto_perfil: null,
    });
    setPreviewFoto(getPreviewFoto(usuarioLogado));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function getPreviewFoto(usuario) {
    const foto = usuario?.foto_perfil;
    if (foto && foto !== "" && foto !== null) return foto;
    return "/icone-usuario.png";
  }

  async function handleSalvar(e) {
    e.preventDefault();
    setCarregando(true);
    setErro("");
    setFeedback("");
    const formData = new FormData();
    formData.append("nome", form.nome);
    formData.append("telefone", form.telefone.replace(/\D/g, ""));
    formData.append("bio", form.bio);
    if (form.foto_perfil) formData.append("foto_perfil", form.foto_perfil);

    try {
      const resp = await api.patch(`/usuarios/me/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUsuarioLogado((user) => ({
        ...user,
        nome: resp.data.nome,
        telefone: resp.data.telefone,
        bio: resp.data.bio,
        foto_perfil: resp.data.foto_perfil,
      }));
      setPreviewFoto(getPreviewFoto(resp.data));
      setEditando(false);
      setFeedback("Dados atualizados com sucesso!");
    } catch (err) {
      let msg = "Erro ao atualizar dados.";
      if (err.response?.data) {
        const backendErros = err.response.data;
        msg = backendErros.detail || msg;
        if (typeof backendErros === "object") {
          msg =
            Object.values(backendErros)
              .map((m) => (Array.isArray(m) ? m.join(" ") : m))
              .join(" ") || msg;
        }
      }
      setErro(msg);
    }
    setCarregando(false);
  }

  async function handleToggleNotificacao(e) {
    const novoValor = e.target.checked;
    setCarregandoNotificacao(true);
    setFeedbackNotificacao("");
    try {
      await api.patch(`/usuarios/me/`, { notificacao_email: novoValor });
      setNotificacaoEmail(novoValor);
      setFeedbackNotificacao("Preferência de notificação atualizada!");
      setTimeout(() => setFeedbackNotificacao(""), 4000);
    } catch {
      setFeedbackNotificacao("Erro ao atualizar preferência.");
    }
    setCarregandoNotificacao(false);
  }

  async function handleTrocarSenha(e) {
    e.preventDefault();
    setCarregandoSenha(true);
    setErroSenha("");
    setFeedbackSenha("");

    try {
      await api.post(`/usuarios/me/alterar_senha/`, {
        senha_atual: senhaAtual,
        nova_senha: novaSenha,
        confirmar_nova_senha: confirmarNovaSenha,
      });
      setFeedbackTrocaSenha("Senha alterada com sucesso!");
      setErroSenha("");
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarNovaSenha("");
      setExibirTrocaSenha(false);
    } catch (err) {
      let msg = "Erro ao alterar senha.";
      if (err.response?.data) {
        const backendErros = err.response.data;
        if (typeof backendErros === "object") {
          msg =
            Object.values(backendErros)
              .map((m) => (Array.isArray(m) ? m.join(" ") : m))
              .join(" ") || msg;
        } else if (typeof backendErros === "string") {
          msg = backendErros;
        }
      }
      setErroSenha(msg);
    }
    setCarregandoSenha(false);
  }

  async function handleExcluirConta(e) {
    e.preventDefault();
    setExcluindo(true);
    setErroExcluir("");
    setFeedbackExcluir("");
    try {
      const resp = await api.post(`/usuarios/me/excluir_conta/`, { senha: senhaExcluir });
      setFeedbackExcluir(resp.data.mensagem || "Conta excluída com sucesso.");
      setTimeout(() => {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }, 1500);
    } catch (err) {
      let msg = "Erro ao excluir conta.";
      if (err.response?.data) {
        const backendErros = err.response.data;
        if (backendErros.erro) msg = backendErros.erro;
        if (typeof backendErros === "object") {
          msg =
            Object.values(backendErros)
              .map((m) => (Array.isArray(m) ? m.join(" ") : m))
              .join(" ") || msg;
        }
      }
      setErroExcluir(msg);
    }
    setExcluindo(false);
  }

  if (!usuarioLogado) return null;

  return (
    <div className="conta-container">
      <div className="conta-main">
        
        {/* Header */}
        <div className="conta-header">
          <h1 className="conta-title">
            <div className="conta-icon">
              <i className="bi bi-person-circle"></i>
            </div>
            Minha Conta
          </h1>
          <p className="conta-subtitle">
            Gerencie suas informações pessoais e configurações
          </p>
        </div>

        {/* Feedback Global */}
        {feedback && (
          <div className="feedback-msg success">
            <i className="bi bi-check-circle"></i>
            {feedback}
          </div>
        )}
        
        {erro && (
          <div className="feedback-msg error">
            <i className="bi bi-exclamation-circle"></i>
            {erro}
          </div>
        )}

        {feedbackTrocaSenha && (
          <div className="feedback-msg success">
            <i className="bi bi-check-circle"></i>
            {feedbackTrocaSenha}
          </div>
        )}

        <div className="conta-content">
          
          {/* Card Principal - Informações Pessoais */}
          <div className="conta-card">
            <div className="card-header">
              <div className="card-header-content">
                <div className="card-icon">
                  <i className="bi bi-person"></i>
                </div>
                <div>
                  <h2>Informações Pessoais</h2>
                  <p>Seus dados básicos e informações de contato</p>
                </div>
              </div>
              {!editando && (
                <button className="btn-icon" onClick={handleEditar} title="Editar informações">
                  <i className="bi bi-pencil"></i>
                </button>
              )}
            </div>

            <div className="card-body">
              {/* Avatar */}
              <div className="profile-avatar-section">
                <div className="avatar-container" onClick={() => editando && fileInputRef.current?.click()}>
                  <img src={previewFoto} alt="Foto de perfil" className="profile-avatar" />
                  {editando && (
                    <div className="avatar-badge">
                      <i className="bi bi-camera"></i>
                    </div>
                  )}
                </div>
                {editando && (
                  <input
                    type="file"
                    name="foto_perfil"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleChange}
                    style={{ display: 'none' }}
                  />
                )}
              </div>

              {editando ? (
                <form onSubmit={handleSalvar} className="profile-form">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Nome completo</label>
                      <input
                        type="text"
                        name="nome"
                        value={form.nome}
                        onChange={handleChange}
                        className="form-control"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Telefone</label>
                      <input
                        type="text"
                        name="telefone"
                        value={form.telefone}
                        onChange={handleChange}
                        className="form-control"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Bio</label>
                    <textarea
                      name="bio"
                      value={form.bio}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Escreva uma breve descrição sobre você"
                      rows="3"
                    />
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={carregando}>
                      {carregando ? (
                        <>
                          <div className="spinner"></div>
                          Salvando...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check"></i>
                          Salvar Alterações
                        </>
                      )}
                    </button>
                    <button type="button" onClick={handleCancelar} className="btn btn-ghost" disabled={carregando}>
                      <i className="bi bi-x"></i>
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div className="profile-info">
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">Nome</span>
                      <span className="info-value">{usuarioLogado.nome}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Email</span>
                      <span className="info-value">{usuarioLogado.email}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Tipo</span>
                      <span className="info-value">
                        <span className={`user-type ${usuarioLogado.tipo}`}>
                          {usuarioLogado.tipo === "freelancer" ? "Freelancer" : "Cliente"}
                        </span>
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">CPF</span>
                      <span className="info-value">{usuarioLogado.cpf}</span>
                    </div>
                    {usuarioLogado.cnpj && (
                      <div className="info-item">
                        <span className="info-label">CNPJ</span>
                        <span className="info-value">{usuarioLogado.cnpj}</span>
                      </div>
                    )}
                    <div className="info-item">
                      <span className="info-label">Telefone</span>
                      <span className="info-value">{formatarTelefone(usuarioLogado.telefone)}</span>
                    </div>
                    {usuarioLogado.bio && (
                      <div className="info-item full-width">
                        <span className="info-label">Bio</span>
                        <span className="info-value">{usuarioLogado.bio}</span>
                      </div>
                    )}
                    {typeof notaMedia !== "undefined" && (
                      <div className="info-item">
                        <span className="info-label">Avaliação</span>
                        <span className="info-value rating">
                          {notaMedia ? (
                            <>
                              <div className="stars">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <i
                                    key={star}
                                    className={`bi ${star <= Math.round(notaMedia) ? 'bi-star-fill' : 'bi-star'}`}
                                  />
                                ))}
                              </div>
                              <span>{notaMedia.toFixed(2)}</span>
                            </>
                          ) : (
                            "Sem avaliações"
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="profile-actions">
                    <button
                      className="btn btn-outline"
                      onClick={() => window.open(`/perfil/${usuarioLogado.id}`, "_blank")}
                    >
                      <i className="bi bi-eye"></i>
                      Ver Perfil Público
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card de Configurações */}
          <div className="conta-card">
            <div className="card-header">
              <div className="card-header-content">
                <div className="card-icon">
                  <i className="bi bi-gear"></i>
                </div>
                <div>
                  <h2>Configurações</h2>
                  <p>Preferências e configurações da conta</p>
                </div>
              </div>
            </div>

            <div className="card-body">
              {/* Notificações */}
              <div className="config-section">
                <h3>Notificações</h3>
                <div className="toggle-group">
                  <label className="toggle-item">
                    <input
                      type="checkbox"
                      checked={!!notificacaoEmail}
                      onChange={handleToggleNotificacao}
                      disabled={carregandoNotificacao}
                    />
                    <div className="toggle-slider"></div>
                    <div className="toggle-content">
                      <span className="toggle-title">Notificações por e-mail</span>
                      <span className="toggle-description">Receber atualizações sobre contratos e mensagens</span>
                    </div>
                  </label>
                  {feedbackNotificacao && (
                    <div className="config-feedback">
                      <i className="bi bi-check-circle"></i>
                      {feedbackNotificacao}
                    </div>
                  )}
                </div>
              </div>

              {/* Troca de Senha */}
              <div className="config-section">
                <h3>Segurança</h3>
                <button
                  className="btn btn-ghost"
                  onClick={() => setExibirTrocaSenha(!exibirTrocaSenha)}
                >
                  <i className="bi bi-shield-lock"></i>
                  {exibirTrocaSenha ? "Cancelar Alteração" : "Alterar Senha"}
                </button>

                {exibirTrocaSenha && (
                  <div className="password-form-wrapper">
                    <form onSubmit={handleTrocarSenha} className="password-form">
                      <div className="form-group">
                        <label>Senha atual</label>
                        <input
                          type="password"
                          value={senhaAtual}
                          onChange={(e) => setSenhaAtual(e.target.value)}
                          className="form-control"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Nova senha</label>
                        <input
                          type="password"
                          value={novaSenha}
                          onChange={(e) => setNovaSenha(e.target.value)}
                          className="form-control"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Confirmar nova senha</label>
                        <input
                          type="password"
                          value={confirmarNovaSenha}
                          onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                          className="form-control"
                          required
                        />
                      </div>
                      <div className="form-actions">
                        <button type="submit" className="btn btn-primary" disabled={carregandoSenha}>
                          {carregandoSenha ? (
                            <>
                              <div className="spinner"></div>
                              Alterando...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-check"></i>
                              Alterar Senha
                            </>
                          )}
                        </button>
                      </div>
                      {erroSenha && (
                        <div className="feedback-msg error">
                          <i className="bi bi-exclamation-circle"></i>
                          {erroSenha}
                        </div>
                      )}
                      {feedbackSenha && (
                        <div className="feedback-msg success">
                          <i className="bi bi-check-circle"></i>
                          {feedbackSenha}
                        </div>
                      )}
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card de Avaliações */}
          <div className="conta-card">
            <div className="card-header">
              <div className="card-header-content">
                <div className="card-icon">
                  <i className="bi bi-star"></i>
                </div>
                <div>
                  <h2>Avaliações Recebidas</h2>
                  <p>Feedback dos seus clientes e parceiros</p>
                </div>
              </div>
            </div>

            <div className="card-body">
              {avaliacoes.length === 0 ? (
                <div className="empty-state">
                  <i className="bi bi-star"></i>
                  <h3>Nenhuma avaliação ainda</h3>
                  <p>Complete seus primeiros trabalhos para receber avaliações</p>
                </div>
              ) : (
                <div className="avaliacoes-list">
                  {avaliacoes.map((av) => (
                    <div key={av.id} className="avaliacao-item">
                      <div className="avaliacao-header">
                        <div className="avaliacao-rating">
                          <div className="stars">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <i
                                key={star}
                                className={`bi ${star <= av.nota ? 'bi-star-fill' : 'bi-star'}`}
                              />
                            ))}
                          </div>
                          <span className="rating-text">{av.nota}/5</span>
                        </div>
                        <span className="avaliador">Por {av.avaliador?.nome || "Usuário"}</span>
                      </div>
                      {av.comentario && (
                        <div className="avaliacao-comentario">
                          <p>"{av.comentario}"</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Card de Zona de Perigo */}
          <div className="conta-card danger-zone">
            <div className="card-header">
              <div className="card-header-content">
                <div className="card-icon danger">
                  <i className="bi bi-exclamation-triangle"></i>
                </div>
                <div>
                  <h2>Zona de Perigo</h2>
                  <p>Ações irreversíveis da conta</p>
                </div>
              </div>
            </div>

            <div className="card-body">
              <div className="danger-section">
                <div className="danger-content">
                  <h3>Excluir Conta</h3>
                  <p>Esta ação é irreversível. Todos os seus dados serão permanentemente removidos.</p>
                </div>
                <button
                  className="btn btn-danger"
                  onClick={() => setShowModalExcluir(true)}
                >
                  <i className="bi bi-trash"></i>
                  Excluir Conta
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Modal de Exclusão */}
        {showModalExcluir && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Confirmar Exclusão da Conta</h3>
                <button className="modal-close" onClick={() => setShowModalExcluir(false)}>
                  <i className="bi bi-x"></i>
                </button>
              </div>
              <div className="modal-body">
                <div className="warning-message">
                  <i className="bi bi-exclamation-triangle"></i>
                  <p>Esta ação é <strong>irreversível</strong>. Todos os seus dados, contratos e avaliações serão permanentemente excluídos.</p>
                </div>
                <form onSubmit={handleExcluirConta}>
                  <div className="form-group">
                    <label>Digite sua senha para confirmar:</label>
                    <input
                      type="password"
                      value={senhaExcluir}
                      onChange={(e) => setSenhaExcluir(e.target.value)}
                      className="form-control"
                      placeholder="Sua senha atual"
                      required
                    />
                  </div>
                  <div className="modal-actions">
                    <button type="submit" className="btn btn-danger" disabled={excluindo}>
                      {excluindo ? (
                        <>
                          <div className="spinner"></div>
                          Excluindo...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-trash"></i>
                          Confirmar Exclusão
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setShowModalExcluir(false)}
                      disabled={excluindo}
                    >
                      Cancelar
                    </button>
                  </div>
                  {erroExcluir && (
                    <div className="feedback-msg error">
                      <i className="bi bi-exclamation-circle"></i>
                      {erroExcluir}
                    </div>
                  )}
                  {feedbackExcluir && (
                    <div className="feedback-msg success">
                      <i className="bi bi-check-circle"></i>
                      {feedbackExcluir}
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}