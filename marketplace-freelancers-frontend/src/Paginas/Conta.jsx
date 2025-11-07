// src/Paginas/Conta.jsx
// Versão simplificada: sem "Modo Foco" (removido), mantendo:
// - Perfil (editar nome/telefone/bio/foto)
// - Avaliações recebidas (freelancer)
// - Segurança (alterar senha)
// - Zona de perigo (excluir conta + modal acessível)

import React, { useContext, useState, useRef, useEffect } from "react";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import api from "../Servicos/Api";
import "../styles/Conta.css";

export default function Conta() {
  const { usuarioLogado, setUsuarioLogado } = useContext(UsuarioContext);

  // ------------------------ Estado do Perfil ------------------------
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

  // Avaliações (somente para freelancer)
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [notaMedia, setNotaMedia] = useState(usuarioLogado?.nota_media);

  // --------------------- Exclusão de Conta (Modal) ------------------
  const [showModalExcluir, setShowModalExcluir] = useState(false);
  const [senhaExcluir, setSenhaExcluir] = useState("");
  const [excluindo, setExcluindo] = useState(false);
  const [feedbackExcluir, setFeedbackExcluir] = useState("");
  const [erroExcluir, setErroExcluir] = useState("");
  const modalRef = useRef(null); // acessibilidade do modal

  // ---------------------- Troca de Senha ----------------------------
  const [exibirTrocaSenha, setExibirTrocaSenha] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
  const [erroSenha, setErroSenha] = useState("");
  const [carregandoSenha, setCarregandoSenha] = useState(false);

  // Arquivo de foto
  const fileInputRef = useRef(null);

  // ---------------------- Buscar Avaliações -------------------------
  useEffect(() => {
    async function buscarAvaliacoes() {
      try {
        // Endpoint específico (se existir)
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
        // Fallback: busca geral e filtra
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

  // --------------- Travar rolagem ao abrir o modal ------------------
  useEffect(() => {
    if (showModalExcluir) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showModalExcluir]);

  // --------- Acessibilidade: trap de foco dentro do modal -----------
  useEffect(() => {
    if (!showModalExcluir || !modalRef.current) return;

    const focusables = modalRef.current.querySelectorAll(
      'button, [href], input, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    first?.focus();

    function onKeyDown(e) {
      if (e.key === "Escape") {
        setShowModalExcluir(false);
      }
      if (e.key === "Tab" && focusables.length) {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showModalExcluir]);

  // ------------------------- Handlers Perfil ------------------------
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

  // ------------------------- Troca de Senha -------------------------
  async function handleTrocarSenha(e) {
    e.preventDefault();
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

  // -------------------------- Excluir Conta -------------------------
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

  // ----------------------------- JSX -------------------------------
  return (
    <div className="conta-page">
      <div className="conta-container">
        {/* Header com avatar e info básica */}
        <div className="conta-header-profile">
          <div className="profile-banner">
            <div className="banner-gradient"></div>
          </div>

          <div className="profile-header-content">
            {/* Avatar + botão alterar foto */}
            <div className="profile-avatar-wrapper">
              <div className="avatar-ring">
                <img src={previewFoto} alt="Foto de perfil" className="profile-avatar-large" />
              </div>
              {editando && (
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
              />
            </div>

            {/* Nome, e-mail e badges */}
            <div className="profile-info-header">
              <h1 className="profile-name">{usuarioLogado.nome}</h1>
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

            {/* Ação rápida: abrir perfil público em nova aba */}
            <div className="profile-actions-header">
              <button
                className="btn-secondary-outline"
                onClick={() => window.open(`/perfil/${usuarioLogado.id}`, "_blank")}
              >
                <i className="bi bi-eye"></i>
                Ver Perfil Público
              </button>
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

        {/* Grid principal */}
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
                  <button className="btn-icon-header" onClick={handleEditar}>
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
                      />
                    </div>

                    <div className="form-actions-inline">
                      <button type="submit" className="btn-primary" disabled={carregando}>
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

          {/* Coluna Direita - Segurança e Zona de Perigo */}
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
                        />
                      </div>
                      {erroSenha && (
                        <div className="alert-mini alert-error">
                          <i className="bi bi-exclamation-circle"></i>
                          {erroSenha}
                        </div>
                      )}
                      <button type="submit" className="btn-primary btn-full" disabled={carregandoSenha}>
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
              ref={modalRef}
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

      </div>
    </div>
  );
}

/* ===================== Helpers locais ===================== */

// Foto de perfil ou placeholder
function getPreviewFoto(usuario) {
  const foto = usuario?.foto_perfil;
  if (foto && typeof foto === "string" && foto.trim() !== "") return foto;
  return "/icone-usuario.png";
}

// Formata telefone (BR)
function formatarTelefone(valor) {
  if (!valor) return "";
  let numeros = valor.replace(/\D/g, "");
  if (numeros.length > 11) numeros = numeros.slice(0, 11);
  if (numeros.length > 10) return numeros.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
  if (numeros.length > 6)  return numeros.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
  if (numeros.length > 2)  return numeros.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
  return numeros.replace(/^(\d*)/, "($1");
}

// Formata CPF (###.###.###-##)
function formatarCPF(valor) {
  if (!valor) return "";
  let numeros = String(valor).replace(/\D/g, "");
  if (numeros.length <= 11) {
    return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  return valor;
}

// Formata CNPJ (##.###.###/####-##)
function formatarCNPJ(valor) {
  if (!valor) return "";
  let numeros = String(valor).replace(/\D/g, "");
  if (numeros.length <= 14) {
    return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return valor;
}
