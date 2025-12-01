import React, { useContext, useState, useRef, useEffect } from "react";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import api from "../Servicos/Api";
import "../styles/Conta.css";

export default function Conta() {
  const { usuarioLogado, setUsuarioLogado } = useContext(UsuarioContext);

  // Flags derivadas
  const suspenso = Boolean(
    usuarioLogado?.modo_leitura || usuarioLogado?.is_suspended_self
  );

  // Estado da página / perfil
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

  // Exclusão de conta
  const [showModalExcluir, setShowModalExcluir] = useState(false);
  const [senhaExcluir, setSenhaExcluir] = useState("");
  const [excluindo, setExcluindo] = useState(false);
  const [feedbackExcluir, setFeedbackExcluir] = useState("");
  const [erroExcluir, setErroExcluir] = useState("");

  // Desativação de conta
  const [showModalDesativar, setShowModalDesativar] = useState(false);
  const [senhaDesativar, setSenhaDesativar] = useState(""); // opcional (apenas confirmação visual)
  const [motivoDesativar, setMotivoDesativar] = useState("");
  const [desativando, setDesativando] = useState(false);
  const [reativando, setReativando] = useState(false);
  const [feedbackDesativar, setFeedbackDesativar] = useState("");
  const [erroDesativar, setErroDesativar] = useState("");

  // Troca de senha
  const [exibirTrocaSenha, setExibirTrocaSenha] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
  const [erroSenha, setErroSenha] = useState("");
  const [carregandoSenha, setCarregandoSenha] = useState(false);

  const fileInputRef = useRef(null);
  const modalRefExcluir = useRef(null);   // A11y do modal excluir
  const modalRefDesativar = useRef(null); // A11y do modal desativar

  // Buscar avaliações públicas
  useEffect(() => {
    async function buscarAvaliacoes() {
      try {
        const resp = await api.get(`/usuarios/${usuarioLogado.id}/avaliacoes_publicas/`);
        const recebidas = Array.isArray(resp.data) ? resp.data : [];
        setAvaliacoes(recebidas);

        if (recebidas.length > 0) {
          const media =
            recebidas.reduce((soma, a) => soma + (Number(a.nota) || 0), 0) /
            recebidas.length;
          setNotaMedia(media);
        } else {
          setNotaMedia(null);
        }
      } catch {
        try {
          const respAll = await api.get("/avaliacoes/");
          const recebidas2 = (Array.isArray(respAll.data) ? respAll.data : []).filter(
            (a) => {
              const avaliadoId = a?.avaliado?.id ?? a?.avaliado;
              return Number(avaliadoId) === Number(usuarioLogado.id);
            }
          );
          setAvaliacoes(recebidas2);
          if (recebidas2.length > 0) {
            const media =
              recebidas2.reduce((soma, a) => soma + (Number(a.nota) || 0), 0) /
              recebidas2.length;
            setNotaMedia(media);
          } else {
            setNotaMedia(null);
          }
        } catch {
          setAvaliacoes([]);
          setNotaMedia(null);
        }
      }
    }
    if (usuarioLogado) buscarAvaliacoes();
  }, [usuarioLogado]);

  // Travar rolagem ao abrir modais
  useEffect(() => {
    const aberto = showModalExcluir || showModalDesativar;
    document.body.style.overflow = aberto ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showModalExcluir, showModalDesativar]);

  // foco nos modais
  useEffect(() => trapFocus(showModalExcluir, modalRefExcluir, () => setShowModalExcluir(false)), [showModalExcluir]);
  useEffect(() => trapFocus(showModalDesativar, modalRefDesativar, () => setShowModalDesativar(false)), [showModalDesativar]);

  // Handlers de perfil
  function handleEditar() {
    if (suspenso) {
      setErro("Sua conta está desativada (modo leitura). Reative para alterar dados.");
      return;
    }
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
    if (foto && typeof foto === "string" && foto.trim() !== "") return foto;
    return "/icone-usuario.png";
  }

  function formatarTelefone(valor) {
    if (!valor) return "";
    let numeros = valor.replace(/\D/g, "");
    if (numeros.length > 11) numeros = numeros.slice(0, 11);
    if (numeros.length > 10) return numeros.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    if (numeros.length > 6)  return numeros.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    if (numeros.length > 2)  return numeros.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
    return numeros.replace(/^(\d*)/, "($1");
  }

  function formatarCPF(valor) {
    if (!valor) return "";
    let numeros = valor.replace(/\D/g, "");
    if (numeros.length <= 11) {
      return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
    return valor;
  }

  function formatarCNPJ(valor) {
    if (!valor) return "";
    let numeros = valor.replace(/\D/g, "");
    if (numeros.length <= 14) {
      return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    }
    return valor;
  }

  async function handleSalvar(e) {
    e.preventDefault();
    if (suspenso) {
      setErro("Sua conta está desativada (modo leitura). Reative para alterar dados.");
      return;
    }
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
        is_active: typeof resp.data.is_active !== "undefined" ? resp.data.is_active : user.is_active,
        modo_leitura: resp.data.modo_leitura,
        is_suspended_self: resp.data.is_suspended_self,
      }));
      setPreviewFoto(getPreviewFoto(resp.data));
      setEditando(false);
      setFeedback("Dados atualizados com sucesso!");
      setTimeout(() => setFeedback(""), 5000);
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

  async function handleTrocarSenha(e) {
    e.preventDefault();
    if (suspenso) {
      setErroSenha("Sua conta está desativada (modo leitura). Reative para alterar dados.");
      return;
    }
    setCarregandoSenha(true);
    setErroSenha("");

    try {
      await api.post(`/usuarios/me/alterar_senha/`, {
        senha_atual: senhaAtual,
        nova_senha: novaSenha,
        confirmar_nova_senha: confirmarNovaSenha,
      });
      setFeedback("Senha alterada com sucesso!");
      setErroSenha("");
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarNovaSenha("");
      setExibirTrocaSenha(false);
      setTimeout(() => setFeedback(""), 5000);
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
      const resp = await api.post('/usuarios/me/excluir_conta/', { senha: senhaExcluir });
      setFeedbackExcluir(resp.data.mensagem || "Conta excluída com sucesso.");
      setTimeout(() => {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }, 1200);
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

  // DESATIVAR — sem logout
  async function handleDesativarConta(e) {
    e.preventDefault();
    setDesativando(true);
    setErroDesativar("");
    setFeedbackDesativar("");

    try {
      await api.post('/usuarios/me/desativar/', {
        motivo: motivoDesativar?.trim() || null,
      });

      const me = await api.get('/usuarios/me/');
      setUsuarioLogado(me.data);
      setFeedbackDesativar("Conta desativada com sucesso. Você está em modo leitura.");
      // fecha modal depois de um feedback
      setTimeout(() => {
        setShowModalDesativar(false);
        setFeedbackDesativar("");
      }, 1200);
    } catch (err) {
      let msg = "Erro ao desativar conta.";
      if (err.response?.data) {
        const backendErros = err.response.data;
        if (backendErros.erro) msg = backendErros.erro;
        if (typeof backendErros === "object") {
          msg = Object.values(backendErros)
            .map((m) => (Array.isArray(m) ? m.join(" ") : m))
            .join(" ") || msg;
        } else if (typeof backendErros === "string") {
          msg = backendErros;
        }
      }
      setErroDesativar(msg);
    }

    setDesativando(false);
  }

  // REATIVAR
  async function handleReativarConta() {
    setReativando(true);
    try {
      await api.post('/usuarios/me/reativar/', {});
      const me = await api.get('/usuarios/me/');
      setUsuarioLogado(me.data);
      setFeedback("Conta reativada com sucesso!");
      setTimeout(() => setFeedback(""), 4000);
    } catch (err) {
      let msg = "Erro ao reativar conta.";
      if (err.response?.data) {
        const backendErros = err.response.data;
        if (typeof backendErros === "object") {
          msg = Object.values(backendErros)
            .map((m) => (Array.isArray(m) ? m.join(" ") : m))
            .join(" ") || msg;
        } else if (typeof backendErros === "string") {
          msg = backendErros;
        }
      }
      setErro(msg);
    }
    setReativando(false);
  }

  if (!usuarioLogado) return null;

  // JSX 
  return (
    <div className="conta-page">
      <div className="conta-container">

        {/* Banner de modo leitura */}
        {suspenso && (
          <div className="alert alert-info" style={{ marginBottom: 16 }}>
            <i className="bi bi-pause-circle"></i>
            <span>
              Sua conta está <strong>desativada</strong> (modo leitura). Você pode navegar,
              mas ações (criar/editar/excluir) serão bloqueadas até reativar.
            </span>
          </div>
        )}

        {/* Header com avatar e info básica */}
        <div className="conta-header-profile">
          <div className="profile-banner">
            <div className="banner-gradient"></div>
          </div>

          <div className="profile-header-content">
            <div className="profile-avatar-wrapper">
              <div className="avatar-ring">
                <img src={previewFoto} alt="Foto de perfil" className="profile-avatar-large" />
              </div>
              {editando && !suspenso && (
                <button
                  className="avatar-edit-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Alterar foto"
                >
                  <i className="bi bi-camera-fill"></i>
                </button>
              )}
              <input
                type="file"
                name="foto_perfil"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleChange}
                style={{ display: 'none' }}
                disabled={suspenso}
              />
            </div>

            <div className="profile-info-header">
              <h1 className="profile-name">
                {usuarioLogado.nome}
                {suspenso && (
                  <span className="badge-inactive" title="Conta desativada">
                    <i className="bi bi-pause-circle-fill"></i> Desativada
                  </span>
                )}
              </h1>
              <p className="profile-email">{usuarioLogado.email}</p>
              <div className="profile-meta">
                <span className={`user-badge ${usuarioLogado.tipo}`}>
                  <i className={`bi ${usuarioLogado.tipo === 'freelancer' ? 'bi-briefcase' : 'bi-building'}`}></i>
                  {usuarioLogado.tipo === "freelancer" ? "Freelancer" : "Contratante"}
                </span>
                {typeof notaMedia !== "undefined" && notaMedia !== null && (
                  <span className="rating-badge">
                    <i className="bi bi-star-fill"></i>
                    {notaMedia.toFixed(1)}
                  </span>
                )}
              </div>
            </div>

            <div className="profile-actions-header">
              <button
                className="btn-secondary-outline"
                onClick={() => window.open(`/perfil/${usuarioLogado.id}`, "_blank")}
              >
                <i className="bi bi-eye"></i>
                Ver Perfil Público
              </button>
              {suspenso && (
                <button
                  className="btn-primary"
                  onClick={handleReativarConta}
                  disabled={reativando}
                  title="Reativar conta"
                  style={{ marginLeft: 8 }}
                >
                  {reativando ? (
                    <>
                      <div className="spinner-small"></div>
                      Reativando...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-play-circle"></i>
                      Reativar Conta
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Feedback Global */}
        {feedback && (
          <div className="alert alert-success">
            <i className="bi bi-check-circle-fill"></i>
            <span>{feedback}</span>
          </div>
        )}

        {erro && (
          <div className="alert alert-error">
            <i className="bi bi-exclamation-circle-fill"></i>
            <span>{erro}</span>
          </div>
        )}

        {/* Layout em grid */}
        <div className="conta-grid">
          {/* Coluna Esquerda - Informações principais */}
          <div className="conta-main-column">
            {/* Card de Informações Pessoais */}
            <div className="card">
              <div className="card-header-simple">
                <h2>
                  <i className="bi bi-person-circle"></i>
                  Informações Pessoais
                </h2>
                {!editando && (
                  <button
                    className="btn-icon-header"
                    onClick={handleEditar}
                    disabled={suspenso}
                    title={suspenso ? "Modo leitura. Reative para editar." : "Editar"}
                  >
                    <i className="bi bi-pencil"></i>
                  </button>
                )}
              </div>

              <div className="card-body">
                {editando ? (
                  <form onSubmit={handleSalvar} className="form-edit">
                    <div className="form-row">
                      <div className="form-field">
                        <label>Nome completo</label>
                        <input
                          type="text"
                          name="nome"
                          value={form.nome}
                          onChange={handleChange}
                          className="input-field"
                          required
                          disabled={suspenso}
                        />
                      </div>

                      <div className="form-field">
                        <label>Telefone</label>
                        <input
                          type="text"
                          name="telefone"
                          value={form.telefone}
                          onChange={handleChange}
                          className="input-field"
                          required
                          disabled={suspenso}
                        />
                      </div>
                    </div>

                    <div className="form-field">
                      <label>Bio</label>
                      <textarea
                        name="bio"
                        value={form.bio}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="Conte um pouco sobre você..."
                        rows="4"
                        disabled={suspenso}
                      />
                    </div>

                    <div className="form-actions-inline">
                      <button type="submit" className="btn-primary" disabled={carregando || suspenso}>
                        {carregando ? (
                          <>
                            <div className="spinner-small"></div>
                            Salvando...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check-lg"></i>
                            Salvar Alterações
                          </>
                        )}
                      </button>
                      <button type="button" onClick={handleCancelar} className="btn-ghost" disabled={carregando}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="info-list">
                    <div className="info-row">
                      <span className="info-label">
                        <i className="bi bi-person"></i>
                        Nome
                      </span>
                      <span className="info-value">{usuarioLogado.nome}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">
                        <i className="bi bi-envelope"></i>
                        Email
                      </span>
                      <span className="info-value">{usuarioLogado.email}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">
                        <i className="bi bi-phone"></i>
                        Telefone
                      </span>
                      <span className="info-value">{formatarTelefone(usuarioLogado.telefone || "")}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">
                        <i className="bi bi-credit-card"></i>
                        CPF
                      </span>
                      <span className="info-value">{formatarCPF(usuarioLogado.cpf)}</span>
                    </div>
                    {usuarioLogado.cnpj && (
                      <div className="info-row">
                        <span className="info-label">
                          <i className="bi bi-building"></i>
                          CNPJ
                        </span>
                        <span className="info-value">{formatarCNPJ(usuarioLogado.cnpj)}</span>
                      </div>
                    )}
                    {usuarioLogado.bio && (
                      <div className="info-row-full">
                        <span className="info-label">
                          <i className="bi bi-chat-left-text"></i>
                          Bio
                        </span>
                        <p className="info-value-bio">{usuarioLogado.bio}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Card de Avaliações (só para freelancer) */}
            {usuarioLogado.tipo === 'freelancer' && (
              <div className="card">
                <div className="card-header-simple">
                  <h2>
                    <i className="bi bi-star-fill"></i>
                    Avaliações Recebidas
                  </h2>
                  {avaliacoes.length > 0 && (
                    <span className="badge-count">{avaliacoes.length}</span>
                  )}
                </div>

                <div className="card-body">
                  {avaliacoes.length === 0 ? (
                    <div className="empty-message">
                      <i className="bi bi-star"></i>
                      <p>Você ainda não recebeu avaliações</p>
                    </div>
                  ) : (
                    <div className="reviews-list">
                      {avaliacoes.slice(0, 5).map((av) => (
                        <div key={av.id} className="review-item">
                          <div className="review-header">
                            <div className="review-stars">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <i
                                  key={star}
                                  className={`bi ${star <= av.nota ? 'bi-star-fill' : 'bi-star'}`}
                                />
                              ))}
                            </div>
                            <span className="review-author">{av.avaliador?.nome || "Anônimo"}</span>
                          </div>
                          {av.comentario && (
                            <p className="review-comment">"{av.comentario}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Coluna Direita - Configurações e ações */}
          <div className="conta-sidebar-column">
            {/* Card de Segurança */}
            <div className="card">
              <div className="card-header-simple">
                <h2>
                  <i className="bi bi-shield-lock"></i>
                  Segurança
                </h2>
              </div>

              <div className="card-body">
                <div className="setting-section-single">
                  <button
                    className="btn-text-full"
                    onClick={() => setExibirTrocaSenha(!exibirTrocaSenha)}
                    disabled={suspenso}
                    title={suspenso ? "Modo leitura. Reative para alterar senha." : "Alterar senha"}
                  >
                    <i className="bi bi-key"></i>
                    <span>{exibirTrocaSenha ? "Cancelar Alteração" : "Alterar Senha"}</span>
                    <i className={`bi ${exibirTrocaSenha ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                  </button>

                  {exibirTrocaSenha && (
                    <form onSubmit={handleTrocarSenha} className="password-form">
                      <div className="form-field">
                        <label>Senha atual</label>
                        <input
                          type="password"
                          value={senhaAtual}
                          onChange={(e) => setSenhaAtual(e.target.value)}
                          className="input-field"
                          required
                          disabled={suspenso}
                        />
                      </div>
                      <div className="form-field">
                        <label>Nova senha</label>
                        <input
                          type="password"
                          value={novaSenha}
                          onChange={(e) => setNovaSenha(e.target.value)}
                          className="input-field"
                          required
                          disabled={suspenso}
                        />
                      </div>
                      <div className="form-field">
                        <label>Confirmar senha</label>
                        <input
                          type="password"
                          value={confirmarNovaSenha}
                          onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                          className="input-field"
                          required
                          disabled={suspenso}
                        />
                      </div>
                      {erroSenha && (
                        <div className="alert-mini alert-error">
                          <i className="bi bi-exclamation-circle"></i>
                          {erroSenha}
                        </div>
                      )}
                      <button type="submit" className="btn-primary btn-full" disabled={carregandoSenha || suspenso}>
                        {carregandoSenha ? (
                          <>
                            <div className="spinner-small"></div>
                            Alterando senha...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check-lg"></i>
                            Confirmar Alteração
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>

            {/* Card de Status da Conta */}
            <div className="card">
              <div className="card-header-simple">
                <h2>
                  <i className="bi bi-person-gear"></i>
                  Status da Conta
                </h2>
              </div>
              <div className="card-body">
                <div className="account-status-box">
                  <div className={`status-info-wrapper ${!suspenso ? "active" : "inactive"}`}>
                    <div className="status-icon-circle">
                      <i className={`bi ${!suspenso ? "bi-check-circle-fill" : "bi-pause-circle-fill"}`}></i>
                    </div>
                    <div className="status-content">
                      <div className="status-title">
                        {!suspenso ? "Conta Ativa" : "Conta Desativada"}
                      </div>
                      <div className="status-desc">
                        {!suspenso
                          ? "Sua conta está ativa e funcionando normalmente."
                          : "Sua conta está desativada. Reative para voltar a usar todos os recursos."}
                      </div>
                    </div>
                  </div>

                  <div className="status-actions">
                    {!suspenso ? (
                      <button
                        className="btn-warning-outline btn-full"
                        onClick={() => setShowModalDesativar(true)}
                        title="Desativar temporariamente a conta"
                      >
                        <i className="bi bi-pause-circle"></i>
                        Desativar Conta Temporariamente
                      </button>
                    ) : (
                      <button
                        className="btn-primary btn-full"
                        onClick={handleReativarConta}
                        disabled={reativando}
                        title="Reativar conta"
                      >
                        {reativando ? (
                          <>
                            <div className="spinner-small"></div>
                            Reativando...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-play-circle"></i>
                            Reativar Minha Conta
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Card de Zona de Perigo */}
            <div className="card card-danger">
              <div className="card-header-simple">
                <h2>
                  <i className="bi bi-exclamation-triangle"></i>
                  Zona de Perigo
                </h2>
              </div>

              <div className="card-body">
                <div className="danger-info">
                  <h3>Excluir Conta</h3>
                  <p>Esta ação é permanente e não pode ser desfeita.</p>
                </div>
                <button
                  className="btn-danger-outline"
                  onClick={() => setShowModalExcluir(true)}
                >
                  <i className="bi bi-trash"></i>
                  Excluir Minha Conta
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Exclusão */}
        {showModalExcluir && (
          <div
            className="modal-overlay"
            aria-hidden="false"
            onClick={() => setShowModalExcluir(false)}
          >
            <div
              className="modal-box"
              ref={modalRefExcluir}
              role="dialog"
              aria-modal="true"
              aria-labelledby="excluirTitulo"
              aria-describedby="excluirDescricao"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3 id="excluirTitulo">Confirmar Exclusão</h3>
                <button
                  className="modal-close-btn"
                  aria-label="Fechar modal"
                  onClick={() => setShowModalExcluir(false)}
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
              <div className="modal-content">
                <div className="warning-box" id="excluirDescricao">
                  <i className="bi bi-exclamation-triangle-fill"></i>
                  <p>Esta ação é <strong>irreversível</strong>. Todos os seus dados serão permanentemente excluídos.</p>
                </div>
                <form onSubmit={handleExcluirConta}>
                  <div className="form-field">
                    <label>Digite sua senha para confirmar:</label>
                    <input
                      type="password"
                      value={senhaExcluir}
                      onChange={(e) => setSenhaExcluir(e.target.value)}
                      className="input-field"
                      placeholder="Senha atual"
                      required
                    />
                  </div>
                  {erroExcluir && (
                    <div className="alert-mini alert-error">
                      <i className="bi bi-exclamation-circle"></i>
                      {erroExcluir}
                    </div>
                  )}
                  {feedbackExcluir && (
                    <div className="alert-mini alert-success">
                      <i className="bi bi-check-circle"></i>
                      {feedbackExcluir}
                    </div>
                  )}
                  <div className="modal-actions">
                    <button type="submit" className="btn-danger" disabled={excluindo}>
                      {excluindo ? (
                        <>
                          <div className="spinner-small"></div>
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
                      className="btn-ghost"
                      onClick={() => setShowModalExcluir(false)}
                      disabled={excluindo}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Desativação */}
        {showModalDesativar && (
          <div
            className="modal-overlay"
            aria-hidden="false"
            onClick={() => setShowModalDesativar(false)}
          >
            <div
              className="modal-box"
              ref={modalRefDesativar}
              role="dialog"
              aria-modal="true"
              aria-labelledby="desativarTitulo"
              aria-describedby="desativarDescricao"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3 id="desativarTitulo">Desativar Conta</h3>
                <button
                  className="modal-close-btn"
                  aria-label="Fechar modal"
                  onClick={() => setShowModalDesativar(false)}
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
              <div className="modal-content">
                <div className="warning-box" id="desativarDescricao">
                  <i className="bi bi-pause-circle-fill"></i>
                  <p>Sua conta ficará <strong>inativa</strong> até que você a reative. Você pode voltar quando quiser.</p>
                </div>
                <form onSubmit={handleDesativarConta}>
                  <div className="form-field">
                    <label>Digite sua senha para confirmar (opcional):</label>
                    <input
                      type="password"
                      value={senhaDesativar}
                      onChange={(e) => setSenhaDesativar(e.target.value)}
                      className="input-field"
                      placeholder="Senha atual"
                    />
                  </div>

                  <div className="form-field">
                    <label>Motivo (opcional):</label>
                    <input
                      type="text"
                      value={motivoDesativar}
                      onChange={(e) => setMotivoDesativar(e.target.value)}
                      className="input-field"
                      placeholder="Ex.: Pausa de fim de ano"
                    />
                  </div>

                  {erroDesativar && (
                    <div className="alert-mini alert-error">
                      <i className="bi bi-exclamation-circle"></i>
                      {erroDesativar}
                    </div>
                  )}
                  {feedbackDesativar && (
                    <div className="alert-mini alert-success">
                      <i className="bi bi-check-circle"></i>
                      {feedbackDesativar}
                    </div>
                  )}
                  <div className="modal-actions">
                    <button type="submit" className="btn-warning" disabled={desativando}>
                      {desativando ? (
                        <>
                          <div className="spinner-small"></div>
                          Desativando...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-pause-circle"></i>
                          Confirmar Desativação
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setShowModalDesativar(false)}
                      disabled={desativando}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function trapFocus(ativo, modalRef, onClose) {
  if (!ativo || !modalRef.current) return () => {};
  const el = modalRef.current;
  const focusables = el.querySelectorAll('button, [href], input, textarea, [tabindex]:not([tabindex="-1"])');
  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  first?.focus();

  function onKeyDown(e) {
    if (e.key === "Escape") onClose?.();
    if (e.key === "Tab" && focusables.length) {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  document.addEventListener("keydown", onKeyDown);
  return () => document.removeEventListener("keydown", onKeyDown);
}
