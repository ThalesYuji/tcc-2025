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
    if (form.foto_perfil) formData.append("foto_perfil", form.foto_perfil);

    try {
      const resp = await api.patch(`/usuarios/${usuarioLogado.id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUsuarioLogado((user) => ({
        ...user,
        nome: resp.data.nome,
        telefone: resp.data.telefone,
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
      await api.patch(`/usuarios/${usuarioLogado.id}/`, { notificacao_email: novoValor });
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
      await api.post(`/usuarios/${usuarioLogado.id}/alterar_senha/`, {
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
      const resp = await api.post(`/usuarios/${usuarioLogado.id}/excluir_conta/`, { senha: senhaExcluir });
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
    <div className="conta-page-wrapper">
      <div className="conta-card-novo">
        <div className="conta-avatar-absolute">
          <img src={previewFoto} alt="Foto de perfil" className="conta-avatar" />
        </div>

        {editando ? (
          <form onSubmit={handleSalvar} className="conta-form-editar">
            <label>Nome:<input type="text" name="nome" value={form.nome} onChange={handleChange} required /></label>
            <label>Telefone:<input type="text" name="telefone" value={form.telefone} onChange={handleChange} required /></label>
            <label>Foto de perfil:<input type="file" name="foto_perfil" accept="image/*" ref={fileInputRef} onChange={handleChange} /></label>
            <div className="conta-form-botoes">
              <button type="submit" disabled={carregando}>{carregando ? "Salvando..." : "Salvar"}</button>
              <button type="button" onClick={handleCancelar} disabled={carregando}>Cancelar</button>
            </div>
            {erro && <div className="error-msg">{erro}</div>}
            {feedback && <div className="success-msg">{feedback}</div>}
          </form>
        ) : (
          <>
            <ul className="conta-detalhes-lista">
              <li><strong>Nome:</strong> {usuarioLogado.nome}</li>
              <li><strong>Email:</strong> {usuarioLogado.email}</li>
              <li><strong>Tipo:</strong> {usuarioLogado.tipo === "freelancer" ? "Freelancer" : "Cliente"}</li>
              <li><strong>CPF:</strong> {usuarioLogado.cpf}</li>
              {usuarioLogado.cnpj && <li><strong>CNPJ:</strong> {usuarioLogado.cnpj}</li>}
              <li><strong>Telefone:</strong> {formatarTelefone(usuarioLogado.telefone)}</li>
              {typeof notaMedia !== "undefined" && (
                <li><strong>Média de avaliação:</strong> {notaMedia ? notaMedia.toFixed(2) + " / 5" : "Sem avaliações"}</li>
              )}
            </ul>
            <button className="conta-editar-btn" onClick={handleEditar}>Editar Informações</button>
            <button className="conta-ver-publico-btn" onClick={() => window.open(`/perfil/${usuarioLogado.id}`, "_blank")}>Ver meu perfil público</button>
          </>
        )}

        {/* Preferência de notificação */}
        <div className="conta-notificacao-bloco">
          <label><input type="checkbox" checked={!!notificacaoEmail} onChange={handleToggleNotificacao} disabled={carregandoNotificacao} /> Receber notificações por e-mail</label>
          {feedbackNotificacao && <div className="success-msg">{feedbackNotificacao}</div>}
        </div>

        {feedbackTrocaSenha && <div className="success-msg conta-feedback-global">{feedbackTrocaSenha}</div>}

        {/* Troca de senha */}
        <div className="conta-trocar-senha-bloco">
          <button className="conta-btn-trocar" onClick={() => setExibirTrocaSenha((v) => !v)}>
            {exibirTrocaSenha ? "Fechar Alteração de Senha" : "Alterar Senha"}
          </button>
          {exibirTrocaSenha && (
            <form onSubmit={handleTrocarSenha} className="conta-form-troca-senha">
              <label>Senha atual:<input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} required /></label>
              <label>Nova senha:<input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} required /></label>
              <label>Confirmar nova senha:<input type="password" value={confirmarNovaSenha} onChange={(e) => setConfirmarNovaSenha(e.target.value)} required /></label>
              <div className="conta-form-botoes">
                <button type="submit" disabled={carregandoSenha}>{carregandoSenha ? "Salvando..." : "Salvar nova senha"}</button>
                <button type="button" onClick={() => setExibirTrocaSenha(false)} disabled={carregandoSenha} className="btn-cancelar">Cancelar</button>
              </div>
              {erroSenha && <div className="error-msg">{erroSenha}</div>}
              {feedbackSenha && <div className="success-msg">{feedbackSenha}</div>}
            </form>
          )}
        </div>

        {/* Avaliações */}
        <div className="conta-avaliacoes-recebidas">
          <h4>Avaliações Recebidas</h4>
          {avaliacoes.length === 0 ? (
            <div className="conta-avaliacao-vazia">Nenhuma avaliação recebida ainda.</div>
          ) : (
            avaliacoes.map((av) => (
              <div key={av.id} className="conta-avaliacao-item">
                <span><strong>Nota:</strong> {av.nota} / 5</span>
                <span><strong>Comentário:</strong> {av.comentario || "Sem comentário"}</span>
                <span><strong>De:</strong> {av.avaliador?.nome || "Usuário"}</span>
              </div>
            ))
          )}
        </div>

        {/* Exclusão de conta */}
        <div className="conta-excluir-bloco">
          <button className="conta-excluir-btn" onClick={() => setShowModalExcluir(true)}>Excluir Conta</button>
        </div>

        {/* Modal de exclusão */}
        {showModalExcluir && (
          <div className="modal-overlay">
            <div className="modal-box">
              <h3>Excluir Conta</h3>
              <p>Digite sua senha para confirmar a exclusão:</p>
              <form onSubmit={handleExcluirConta}>
                <input type="password" value={senhaExcluir} onChange={(e) => setSenhaExcluir(e.target.value)} placeholder="Sua senha" required />
                <div className="modal-botoes">
                  <button type="submit" disabled={excluindo} className="btn-excluir">{excluindo ? "Excluindo..." : "Confirmar Exclusão"}</button>
                  <button type="button" onClick={() => setShowModalExcluir(false)} className="btn-cancelar">Cancelar</button>
                </div>
                {erroExcluir && <div className="error-msg">{erroExcluir}</div>}
                {feedbackExcluir && <div className="success-msg">{feedbackExcluir}</div>}
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
