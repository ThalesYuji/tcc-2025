import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "../styles/ResetarSenha.css";
import { FaLock, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

export default function ResetarSenha() {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mensagem, setMensagem] = useState(null);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro(null);
    setMensagem(null);

    // Validações
    if (!senha || !confirmarSenha) {
      setErro("Preencha todos os campos.");
      return;
    }

    if (senha.length < 8) {
      setErro("A senha deve ter no mínimo 8 caracteres.");
      return;
    }

    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    setCarregando(true);
    try {
      await axios.post("http://127.0.0.1:8000/api/password-reset-confirm/", {
        uid,
        token,
        new_password: senha,
      });

      setMensagem("Senha redefinida com sucesso!");
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      const errorMsg =
        err?.response?.data?.detail ||
        err?.response?.data?.new_password?.[0] ||
        "Erro ao redefinir senha. Link inválido ou expirado.";
      setErro(errorMsg);
    } finally {
      setCarregando(false);
    }
  };

  const erroCampo = erro ? "input-erro" : "";

  return (
    <div className="resetar-bg">
      <div className="resetar-container">
        <div className="resetar-card fade-in">
          {/* Logo e Cabeçalho */}
          <div className="resetar-header">
            <img
              src="/profreelabr.png"
              alt="Logo ProFreelaBR"
              className="resetar-logo"
            />
            <h2 className="resetar-title">Redefinir Senha</h2>
            <p className="resetar-subtitle">
              {mensagem
                ? "Senha alterada com sucesso!"
                : "Crie uma nova senha segura para sua conta"}
            </p>
          </div>

          {/* Mensagem de Sucesso */}
          {mensagem ? (
            <div className="sucesso-box">
              <FaCheckCircle className="sucesso-icon" />
              <h3>Tudo pronto!</h3>
              <p>{mensagem}</p>
              <p className="sucesso-info">
                Você será redirecionado para o login automaticamente...
              </p>
            </div>
          ) : (
            // Formulário
            <form onSubmit={handleSubmit} className="resetar-form">
              {/* Mensagem de Erro Geral */}
              {erro && (
                <div className="alert-erro">
                  <FaExclamationTriangle className="alert-icon" />
                  <span>{erro}</span>
                </div>
              )}

              {/* Nova Senha */}
              <div className="input-group">
                <label className="input-label">Nova Senha</label>
                <div className="input-wrapper">
                  <FaLock className="input-icon" />
                  <input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    required
                    minLength={8}
                    className={erroCampo}
                    disabled={carregando}
                  />
                </div>
              </div>

              {/* Confirmar Senha */}
              <div className="input-group">
                <label className="input-label">Confirmar Senha</label>
                <div className="input-wrapper">
                  <FaLock className="input-icon" />
                  <input
                    type="password"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    placeholder="Digite a senha novamente"
                    required
                    minLength={8}
                    className={erroCampo}
                    disabled={carregando}
                  />
                </div>
              </div>

              {/* Dicas de Senha */}
              <div className="senha-dicas">
                <p className="dica-titulo">Sua senha deve conter:</p>
                <ul className="dica-lista">
                  <li className={senha.length >= 8 ? "valido" : ""}>
                    Mínimo de 8 caracteres
                  </li>
                  <li className={senha && confirmarSenha && senha === confirmarSenha ? "valido" : ""}>
                    Senhas coincidem
                  </li>
                </ul>
              </div>

              {/* Botão */}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={carregando}
              >
                {carregando ? "Alterando..." : "Alterar Senha"}
              </button>
            </form>
          )}

          {/* Link de volta ao login */}
          <div className="link-voltar">
            <Link to="/login">Voltar para o Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}