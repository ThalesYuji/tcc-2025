import React, { useState } from "react";
import api from "../Servicos/Api";
import { useNavigate, Link } from "react-router-dom";
import "../styles/Login.css";
import { FaEnvelope, FaLock } from "react-icons/fa";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro("");

    if (!email.trim() || !senha) {
      setErro("Preencha o e-mail e a senha.");
      return;
    }

    setCarregando(true);
    try {
      const response = await api.post("/token/", {
        email: email.trim(),
        password: senha,
      });

      localStorage.setItem("token", response.data.access);

      const userResponse = await api.get("/usuarios/me/", {
        headers: { Authorization: `Bearer ${response.data.access}` },
      });

      localStorage.setItem("userId", userResponse.data.id);

      navigate("/home");
      window.location.reload();
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.join(" ");

      if (
        msg === "No active account found with the given credentials" ||
        msg === "Usuário ou senha inválidos." ||
        msg === "Usuário não encontrado." ||
        msg === "Email ou senha inválidos."
      ) {
        setErro("E-mail ou senha incorretos.");
      } else if (msg) {
        setErro(msg);
      } else {
        setErro("Erro ao tentar fazer login. Tente novamente.");
      }
    } finally {
      setCarregando(false);
    }
  };

  const erroCampo = erro ? "input input-erro" : "input";

  return (
    <div className="login-bg">
      <div className="login-content">
        {/* Lado esquerdo (branding) */}
        <div className="login-left">
          <img
            src="/profreelabr.png"
            alt="Logo ProFreelaBR"
            className="login-logo"
          />
          <h1 className="login-title">Bem-vindo ao ProFreelaBR</h1>
          <h2 className="login-subtitle">
            Conecte-se aos melhores freelancers do Brasil
          </h2>
          <p className="login-text">
            Encontre oportunidades, faça networking e transforme seu talento em
            resultados reais.
          </p>
        </div>

        {/* Lado direito (formulário) */}
        <div className="login-right">
          <div className="login-box">
            <h3 className="form-title">Entrar</h3>
            <form onSubmit={handleLogin}>
              <div className="input-group">
                <FaEnvelope className="input-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E-mail"
                  required
                  className={erroCampo}
                />
              </div>

              <div className="input-group">
                <FaLock className="input-icon" />
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Senha"
                  required
                  className={erroCampo}
                />
              </div>

              {/* Link "Esqueci minha senha" */}
              <div className="senha-opcoes">
                <Link to="/esqueci-senha" className="esqueci-senha-link">
                  Esqueci minha senha
                </Link>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={carregando}
              >
                {carregando ? "Entrando..." : "Entrar"}
              </button>

              {/* Mensagem de erro */}
              {erro && <div className="error-msg">{erro}</div>}
            </form>

            <p className="cadastro-link">
              Ainda não tem uma conta? <Link to="/cadastro">Cadastre-se</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}