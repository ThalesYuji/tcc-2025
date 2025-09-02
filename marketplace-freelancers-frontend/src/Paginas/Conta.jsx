import React, { useContext, useState, useRef } from "react";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import api from "../Servicos/Api";

export default function Conta() {
  const { usuarioLogado, setUsuarioLogado } = useContext(UsuarioContext);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({
    nome: usuarioLogado?.nome || "",
    telefone: usuarioLogado?.telefone || "",
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

  // Feedback global da troca de senha (aparece fora do menu/modal)
  const [feedbackTrocaSenha, setFeedbackTrocaSenha] = useState("");

  const fileInputRef = useRef(null);

  // Função de máscara para telefone
  function formatarTelefone(valor) {
    if (!valor) return "";
    let numeros = valor.replace(/\D/g, "");
    if (numeros.length > 11) numeros = numeros.slice(0, 11);

    if (numeros.length > 10) {
      return numeros.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    } else if (numeros.length > 6) {
      return numeros.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    } else if (numeros.length > 2) {
      return numeros.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
    } else {
      return numeros.replace(/^(\d*)/, "($1");
    }
  }

  // Carrega avaliações recebidas ao abrir a tela
  React.useEffect(() => {
    async function buscarAvaliacoes() {
      try {
        const resp = await api.get("/avaliacoes/");
        const recebidas = resp.data.filter(
          (a) => a.avaliado.id === usuarioLogado.id
        );
        setAvaliacoes(recebidas);
        if (recebidas.length > 0) {
          const media =
            recebidas.reduce((soma, a) => soma + a.nota, 0) /
            recebidas.length;
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
      foto_perfil: null,
    });
    setPreviewFoto(getPreviewFoto(usuarioLogado));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function getPreviewFoto(usuario) {
    const foto = usuario?.foto_perfil;
    if (foto && foto !== "" && foto !== null) {
      return foto; // já vem como URL completa do backend
    }
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
    if (form.foto_perfil) {
      formData.append("foto_perfil", form.foto_perfil);
    }
    try {
      // PATCH para o usuário logado
      const resp = await api.patch(`/usuarios/${usuarioLogado.id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUsuarioLogado((user) => ({
        ...user,
        nome: resp.data.nome,
        telefone: resp.data.telefone,
        foto_perfil: resp.data.foto_perfil,
      }));

      // 🔹 Atualiza o preview também
      setPreviewFoto(getPreviewFoto(resp.data));
      setEditando(false);
      setFeedback("Dados atualizados com sucesso!");
      setCarregando(false);
    } catch (err) {
      if (err.response && err.response.data) {
        const backendErros = err.response.data;
        let msg = backendErros.detail || "Erro ao atualizar dados.";
        if (typeof backendErros === "object") {
          msg =
            Object.values(backendErros)
              .map((m) => (Array.isArray(m) ? m.join(" ") : m))
              .join(" ") || msg;
        }
        setErro(msg);
      } else {
        setErro("Erro ao atualizar dados.");
      }
      setCarregando(false);
    }
  }

  // PATCH notificação
  async function handleToggleNotificacao(e) {
    const novoValor = e.target.checked;
    setCarregandoNotificacao(true);
    setFeedbackNotificacao("");
    try {
      await api.patch(`/usuarios/${usuarioLogado.id}/`, {
        notificacao_email: novoValor,
      });
      setNotificacaoEmail(novoValor);
      setFeedbackNotificacao("Preferência de notificação atualizada!");
      setTimeout(() => setFeedbackNotificacao(""), 4000);
    } catch {
      setFeedbackNotificacao("Erro ao atualizar preferência.");
    }
    setCarregandoNotificacao(false);
  }

  // Troca de senha
  async function handleTrocarSenha(e) {
    e.preventDefault();
    setCarregandoSenha(true);
    setErroSenha("");
    setFeedbackSenha("");

    try {
      await api.post(`/usuarios/${usuarioLogado.id}/alterar_senha/`, {
        senha_atual: senhaAtual,
        nova_senha: novaSenha,
        confirmar_nova_senha: confirmarNovaSenha,
      });
      setFeedbackTrocaSenha("Senha alterada com sucesso!");
      setTimeout(() => setFeedbackTrocaSenha(""), 5000);
      setErroSenha("");
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarNovaSenha("");
      setExibirTrocaSenha(false);
    } catch (err) {
      let msg = "Erro ao alterar senha.";
      if (err.response && err.response.data) {
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

  // Exclusão de conta real
  async function handleExcluirConta(e) {
    e.preventDefault();
    setExcluindo(true);
    setErroExcluir("");
    setFeedbackExcluir("");
    try {
      const resp = await api.post(
        `/usuarios/${usuarioLogado.id}/excluir_conta/`,
        { senha: senhaExcluir }
      );
      setFeedbackExcluir(resp.data.mensagem || "Conta excluída com sucesso.");
      setTimeout(() => {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }, 1500);
    } catch (err) {
      let msg = "Erro ao excluir conta.";
      if (err.response && err.response.data) {
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
    <div className="conta-page-wrapper">
      <div className="conta-card-novo">
        <div className="conta-avatar-absolute">
          <img
            src={previewFoto}
            alt="Foto de perfil"
            className="conta-avatar"
          />
        </div>
        {editando ? (
          <form onSubmit={handleSalvar} className="conta-form-editar">
            <label>
              Nome:
              <input
                type="text"
                name="nome"
                value={form.nome}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Telefone:
              <input
                type="text"
                name="telefone"
                value={form.telefone}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Foto de perfil:
              <input
                type="file"
                name="foto_perfil"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleChange}
              />
            </label>
            <div className="conta-form-botoes">
              <button type="submit" disabled={carregando}>
                {carregando ? "Salvando..." : "Salvar"}
              </button>
              <button type="button" onClick={handleCancelar} disabled={carregando}>
                Cancelar
              </button>
            </div>
            {erro && <div className="error-msg">{erro}</div>}
            {feedback && <div className="success-msg">{feedback}</div>}
          </form>
        ) : (
          <>
            <ul className="conta-detalhes-lista">
              <li>
                <strong>Nome:</strong> {usuarioLogado.nome}
              </li>
              <li>
                <strong>Email:</strong> {usuarioLogado.email}
              </li>
              <li>
                <strong>Tipo:</strong>{" "}
                {usuarioLogado.tipo === "freelancer" ? "Freelancer" : "Cliente"}
              </li>
              <li>
                <strong>CPF:</strong> {usuarioLogado.cpf}
              </li>
              {usuarioLogado.cnpj && (
                <li>
                  <strong>CNPJ:</strong> {usuarioLogado.cnpj}
                </li>
              )}
              <li>
                <strong>Telefone:</strong> {formatarTelefone(usuarioLogado.telefone)}
              </li>
              {typeof notaMedia !== "undefined" && (
                <li>
                  <strong>Média de avaliação:</strong>{" "}
                  {notaMedia ? notaMedia.toFixed(2) + " / 5" : "Sem avaliações"}
                </li>
              )}
            </ul>
            <button className="conta-editar-btn" onClick={handleEditar}>
              Editar Informações
            </button>
            <button
              className="conta-ver-publico-btn"
              style={{
                width: "100%",
                marginTop: 8,
                marginBottom: 4,
                background: "#f5faff",
                color: "#1976d2",
                borderRadius: 10,
                border: "1.2px solid #1976d2",
                padding: "11px 0",
                fontWeight: 700,
                fontSize: "1.11rem",
                cursor: "pointer",
                transition: "filter .17s"
              }}
              onClick={() => window.open(`/perfil/${usuarioLogado.id}`, "_blank")}
            >
              Ver meu perfil público
            </button>
          </>
        )}

        {/* Preferência de notificação */}
        <div style={{ margin: "22px 0 8px 0" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              checked={!!notificacaoEmail}
              onChange={handleToggleNotificacao}
              disabled={carregandoNotificacao}
              style={{ width: 18, height: 18 }}
            />
            Receber notificações por e-mail
          </label>
          {feedbackNotificacao && (
            <div className="success-msg" style={{ marginTop: 6 }}>
              {feedbackNotificacao}
            </div>
          )}
        </div>

        {/* --- Feedback global da troca de senha --- */}
        {feedbackTrocaSenha && (
          <div className="success-msg" style={{ margin: "16px 0 10px 0", fontWeight: 600 }}>
            {feedbackTrocaSenha}
          </div>
        )}

        {/* --- Bloco de troca de senha --- */}
        <div className="conta-trocar-senha-bloco" style={{ marginTop: 32 }}>
          <button
            style={{
              background: "#223146",
              color: "#fff",
              padding: "8px 20px",
              borderRadius: "7px",
              border: "none",
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 6,
            }}
            onClick={() => setExibirTrocaSenha((v) => !v)}
          >
            {exibirTrocaSenha ? "Fechar Alteração de Senha" : "Alterar Senha"}
          </button>
          {exibirTrocaSenha && (
            <form
              onSubmit={handleTrocarSenha}
              style={{
                marginTop: 10,
                background: "#f5f5f5",
                border: "1px solid #ddd",
                padding: 16,
                borderRadius: 8,
                maxWidth: 400,
              }}
            >
              <label>
                Senha atual:
                <input
                  type="password"
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  required
                />
              </label>
              <label>
                Nova senha:
                <input
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  required
                />
              </label>
              <label>
                Confirmar nova senha:
                <input
                  type="password"
                  value={confirmarNovaSenha}
                  onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                  required
                />
              </label>
              <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                <button type="submit" disabled={carregandoSenha}>
                  {carregandoSenha ? "Salvando..." : "Salvar nova senha"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExibirTrocaSenha(false);
                    setErroSenha("");
                    setFeedbackSenha("");
                    setSenhaAtual("");
                    setNovaSenha("");
                    setConfirmarNovaSenha("");
                  }}
                  disabled={carregandoSenha}
                  style={{ background: "#bbb", color: "#223146" }}
                >
                  Cancelar
                </button>
              </div>
              {erroSenha && (
                <div className="error-msg" style={{ marginTop: 6 }}>
                  {erroSenha}
                </div>
              )}
              {feedbackSenha && (
                <div className="success-msg" style={{ marginTop: 6 }}>
                  {feedbackSenha}
                </div>
              )}
            </form>
          )}
        </div>

        {/* Lista de avaliações recebidas */}
        <div className="conta-avaliacoes-recebidas">
          <h4>Avaliações Recebidas</h4>
          {avaliacoes.length === 0 && (
            <div style={{ color: "#888", fontStyle: "italic" }}>
              Nenhuma avaliação recebida ainda.
            </div>
          )}
          {avaliacoes.map((av) => (
            <div key={av.id} className="conta-avaliacao-item">
              <span>
                <strong>Nota:</strong> {av.nota} / 5
              </span>
              <span>
                <strong>Comentário:</strong> {av.comentario || "Sem comentário"}
              </span>
              <span>
                <strong>De:</strong> {av.avaliador?.nome || "Usuário"}
              </span>
            </div>
          ))}
        </div>

        {/* Exclusão real de conta */}
        <div style={{ marginTop: 28 }}>
          <button
            className="conta-excluir-btn"
            style={{
              background: "#f23d3d",
              color: "#fff",
              borderRadius: 7,
              border: "none",
              padding: "8px 18px",
              fontWeight: 700,
              cursor: "pointer",
            }}
            onClick={() => setShowModalExcluir(true)}
          >
            Excluir Conta
          </button>
        </div>

        {/* Modal de exclusão */}
        {showModalExcluir && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(30,30,40,0.48)",
              zIndex: 9000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: 14,
                padding: "28px 30px 22px 30px",
                boxShadow: "0 8px 32px #1976d244",
                minWidth: 330,
                maxWidth: "92vw",
                zIndex: 9999,
                display: "flex",
                flexDirection: "column",
                alignItems: "center"
              }}
            >
              <h3 style={{marginBottom: 6, fontWeight: 800, color: "#223146"}}>Excluir Conta</h3>
              <p style={{marginBottom: 12, color: "#555", fontSize: "1.06rem"}}>Digite sua senha para confirmar a exclusão:</p>
              <form onSubmit={handleExcluirConta} style={{width: "100%"}}>
                <input
                  type="password"
                  value={senhaExcluir}
                  onChange={(e) => setSenhaExcluir(e.target.value)}
                  placeholder="Sua senha"
                  required
                  style={{
                    width: "100%",
                    marginBottom: 16,
                    padding: "11px 15px",
                    fontSize: 17,
                    border: "1.5px solid #e7eaf3",
                    borderRadius: 8,
                    outline: "none"
                  }}
                />
                <div style={{display: "flex", gap: 12, width: "100%"}}>
                  <button
                    type="submit"
                    disabled={excluindo}
                    style={{
                      background: "#f23d3d",
                      color: "#fff",
                      border: "none",
                      borderRadius: 7,
                      padding: "10px 18px",
                      fontWeight: 700,
                      fontSize: 15,
                      width: "50%",
                      cursor: "pointer"
                    }}
                  >
                    {excluindo ? "Excluindo..." : "Confirmar Exclusão"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModalExcluir(false);
                      setSenhaExcluir("");
                      setErroExcluir("");
                      setFeedbackExcluir("");
                    }}
                    style={{
                      background: "#bbb",
                      color: "#223146",
                      border: "none",
                      borderRadius: 7,
                      padding: "10px 18px",
                      fontWeight: 700,
                      fontSize: 15,
                      width: "50%",
                      cursor: "pointer"
                    }}
                  >
                    Cancelar
                  </button>
                </div>
                {erroExcluir && (
                  <div className="error-msg" style={{marginTop: 8}}>
                    {erroExcluir}
                  </div>
                )}
                {feedbackExcluir && (
                  <div className="success-msg" style={{marginTop: 8}}>
                    {feedbackExcluir}
                  </div>
                )}
                
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
