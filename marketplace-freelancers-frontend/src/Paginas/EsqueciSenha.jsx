import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "../styles/EsqueciSenha.css";
import { FaEnvelope, FaCheckCircle, FaArrowLeft } from "react-icons/fa";

export default function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState(null);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensagem(null);
    setErro(null);

    if (!email.trim()) {
      setErro("Por favor, informe seu e-mail.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErro("Por favor, informe um e-mail válido.");
      return;
    }

    setCarregando(true);
    try {
      await axios.post("http://127.0.0.1:8000/api/password-reset/", { 
        email: email.trim() 
      });
      
      setMensagem(true);
    } catch (err) {
      const errorMsg = 
        err?.response?.data?.email?.[0] ||
        err?.response?.data?.detail ||
        "Erro ao solicitar redefinição. Tente novamente.";
      setErro(errorMsg);
    } finally {
      setCarregando(false);
    }
  };

  const erroCampo = erro ? "input-erro" : "";

  return (
    <div className="esqueci-bg">
      <div className="esqueci-container">
        <div className="esqueci-card fade-in">
          {/* Logo */}
          <div className="esqueci-logo-wrapper">
            <img
              src="/profreelabr.png"
              alt="Logo ProFreelaBR"
              className="esqueci-logo"
            />
          </div>

          {/* Conteúdo dinâmico */}
          {mensagem ? (
            // Tela de Sucesso
            <div className="sucesso-container">
              <FaCheckCircle className="sucesso-icon" />
              <h2 className="sucesso-titulo">Verifique sua caixa de entrada</h2>
              <p className="sucesso-texto">
                Enviamos um e-mail para <strong>{email}</strong> com
                as instruções para redefinir sua senha.
              </p>
              
              <div className="dicas-box">
                <p className="dicas-titulo">Não recebeu o e-mail?</p>
                <ul className="dicas-lista">
                  <li>Verifique sua caixa de spam ou lixo eletrônico</li>
                  <li>Aguarde alguns minutos e tente novamente</li>
                  <li>Certifique-se de que o e-mail está correto</li>
                </ul>
              </div>

              <Link to="/login" className="btn-voltar-login">
                Voltar para Login
              </Link>
            </div>
          ) : (
            // Formulário
            <>
              <h2 className="esqueci-titulo">Esqueci minha senha</h2>
              <p className="esqueci-descricao">
                Digite seu e-mail para receber o link de redefinição
              </p>

              <form onSubmit={handleSubmit} className="esqueci-form">
                <div className="form-group">
                  <div className="input-container">
                    <FaEnvelope className="input-icon" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Seu e-mail cadastrado"
                      required
                      className={erroCampo}
                      disabled={carregando}
                    />
                  </div>
                  {erro && <div className="erro-texto">{erro}</div>}
                </div>

                <button
                  type="submit"
                  className="btn-enviar"
                  disabled={carregando}
                >
                  {carregando ? "Enviando..." : "Enviar link de recuperação"}
                </button>
              </form>

              <Link to="/login" className="link-voltar">
                <FaArrowLeft />
                <span>Voltar para o Login</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}