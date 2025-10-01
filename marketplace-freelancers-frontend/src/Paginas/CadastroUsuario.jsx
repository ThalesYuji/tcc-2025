  import React, { useState } from "react";
  import axios from "axios";
  import { useNavigate } from "react-router-dom";
  import "../styles/CadastroUsuario.css";

  // Ícones
  import { FaUser, FaEnvelope, FaLock, FaPhone, FaIdCard, FaBuilding, FaImage } from "react-icons/fa";

  export default function CadastroUsuario() {
    const [form, setForm] = useState({
      nome: "",
      email: "",
      senha: "",
      confirmarSenha: "",
      tipo: "freelancer",
      cpf: "",
      cnpj: "",
      telefone: "",
      foto_perfil: null,
    });

    const [erros, setErros] = useState({});
    const [erroGeral, setErroGeral] = useState("");
    const [sucesso, setSucesso] = useState("");
    const navigate = useNavigate();

    // 🔹 Máscaras (telefone, CPF, CNPJ)
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

    function formatarCPF(valor) {
      if (!valor) return "";
      let numeros = valor.replace(/\D/g, "");
      if (numeros.length > 11) numeros = numeros.slice(0, 11);
      return numeros.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2}).*/, "$1.$2.$3-$4");
    }

    function formatarCNPJ(valor) {
      if (!valor) return "";
      let numeros = valor.replace(/\D/g, "");
      if (numeros.length > 14) numeros = numeros.slice(0, 14);
      return numeros.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2}).*/,
        "$1.$2.$3/$4-$5"
      );
    }

    function handleChange(e) {
      const { name, value, files } = e.target;
      if (name === "foto_perfil") {
        setForm({ ...form, [name]: files[0] });
      } else if (name === "telefone") {
        setForm({ ...form, [name]: formatarTelefone(value) });
      } else if (name === "cpf") {
        setForm({ ...form, [name]: formatarCPF(value) });
      } else if (name === "cnpj") {
        setForm({ ...form, [name]: formatarCNPJ(value) });
      } else {
        setForm({ ...form, [name]: value });
      }
    }

    function validarSenhaLocal(senha) {
      const errosSenha = [];
      if (senha.length < 8) errosSenha.push("mínimo de 8 caracteres");
      if (!/[A-Z]/.test(senha)) errosSenha.push("letra maiúscula");
      if (!/[a-z]/.test(senha)) errosSenha.push("letra minúscula");
      if (!/[0-9]/.test(senha)) errosSenha.push("número");
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(senha)) errosSenha.push("símbolo especial");
      return errosSenha;
    }

    async function handleSubmit(e) {
      e.preventDefault();
      setErros({});
      setErroGeral("");
      setSucesso("");

      if (form.senha !== form.confirmarSenha) {
        setErros({ confirmarSenha: "As senhas não coincidem." });
        return;
      }

      const errosSenha = validarSenhaLocal(form.senha);
      if (errosSenha.length > 0) {
        setErros({ password: `A senha deve conter: ${errosSenha.join(", ")}` });
        return;
      }

      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value && key !== "confirmarSenha") formData.append(key, value);
      });
      formData.append("password", form.senha);

      try {
        await axios.post("http://localhost:8000/api/usuarios/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setSucesso("Cadastro realizado com sucesso! Redirecionando...");
        setTimeout(() => navigate("/login"), 1500);
      } catch (err) {
        if (err.response && err.response.data) {
          const backendErros = err.response.data;
          let novosErros = {};

          // 🔹 Normaliza qualquer formato de erro
          Object.entries(backendErros).forEach(([campo, mensagem]) => {
            if (Array.isArray(mensagem)) {
              novosErros[campo] = mensagem.join(" ");
            } else if (typeof mensagem === "object") {
              novosErros[campo] = Object.values(mensagem).join(" ");
            } else if (typeof mensagem === "string") {
              novosErros[campo] = mensagem;
            }
          });

          setErros(novosErros);

          if (backendErros.detail) setErroGeral(backendErros.detail);
          if (backendErros.non_field_errors) setErroGeral(backendErros.non_field_errors.join(" "));
        } else {
          setErroGeral("Erro ao cadastrar usuário. Verifique os campos.");
        }
      }
    }

    return (
      <div className="login-bg">
        <div className="login-content">
          {/* Lado esquerdo */}
          <div className="login-left">
            <img src="/profreelabr.png" alt="Logo ProFreelaBR" className="login-logo" />
            <h1 className="login-title">Crie sua conta no ProFreelaBR</h1>
            <h2 className="login-subtitle">
              Faça parte da maior comunidade de freelancers do Brasil
            </h2>
            <p>
              Cadastre-se grátis, preencha seus dados e comece agora mesmo a
              transformar seu talento em oportunidades!
            </p>
          </div>

          {/* Lado direito */}
          <div className="login-right"> 
            <div className="login-box">  {/* REMOVIDO "card" */}
              <h3>Cadastrar</h3>
              <form
                onSubmit={handleSubmit}
                encType="multipart/form-data"
                className="form-cadastro-doisblocos"
              >
                {/* BLOCO 1 */}
                <h4>Dados de Acesso</h4>
                <div className="form-row">
                  <div className="input-group">
                    <FaUser className="input-icon" />
                    <input
                      type="text"
                      name="nome"
                      placeholder="Nome completo"
                      value={form.nome}
                      onChange={handleChange}
                      required
                      className={`input ${erros.nome ? "input-erro" : ""}`}
                    />
                  </div>
                  <div className="input-group">
                    <FaEnvelope className="input-icon" />
                    <input
                      type="email"
                      name="email"
                      placeholder="E-mail"
                      value={form.email}
                      onChange={handleChange}
                      required
                      className={`input ${erros.email ? "input-erro" : ""}`}
                    />
                  </div>
                </div>
                {erros.nome && <div className="error-msg">{erros.nome}</div>}
                {erros.email && <div className="error-msg">{erros.email}</div>}

                <div className="form-row">
                  <div className="input-group">
                    <FaLock className="input-icon" />
                    <input
                      type="password"
                      name="senha"
                      placeholder="Senha"
                      value={form.senha}
                      onChange={handleChange}
                      required
                      className={`input ${erros.password ? "input-erro" : ""}`}
                    />
                  </div>
                  <div className="input-group">
                    <FaLock className="input-icon" />
                    <input
                      type="password"
                      name="confirmarSenha"
                      placeholder="Confirmar senha"
                      value={form.confirmarSenha}
                      onChange={handleChange}
                      required
                      className={`input ${erros.confirmarSenha ? "input-erro" : ""}`}
                    />
                  </div>
                </div>
                {erros.password && <div className="error-msg">{erros.password}</div>}
                {erros.confirmarSenha && <div className="error-msg">{erros.confirmarSenha}</div>}

                {/* BLOCO 2 */}
                <h4>Perfil e Documentos</h4>
                <div className="form-row">
                  <select
                    name="tipo"
                    value={form.tipo}
                    onChange={handleChange}
                    required
                    className={`select-input ${erros.tipo ? "input-erro" : ""}`}
                  >
                    <option value="freelancer">Freelancer</option>
                    <option value="cliente">Cliente</option>
                  </select>
                </div>
                {erros.tipo && <div className="error-msg">{erros.tipo}</div>}

                <div className="form-row">
                  <div className="input-group">
                    <FaPhone className="input-icon" />
                    <input
                      type="text"
                      name="telefone"
                      placeholder="Telefone"
                      value={form.telefone}
                      onChange={handleChange}
                      required
                      maxLength="15"
                      className={`input ${erros.telefone ? "input-erro" : ""}`}
                    />
                  </div>
                </div>
                {erros.telefone && <div className="error-msg">{erros.telefone}</div>}

                <div className="form-row">
                  <div className="input-group">
                    <FaIdCard className="input-icon" />
                    <input
                      type="text"
                      name="cpf"
                      placeholder="CPF"
                      value={form.cpf}
                      onChange={handleChange}
                      required
                      maxLength="14"
                      className={`input ${erros.cpf ? "input-erro" : ""}`}
                    />
                  </div>
                  {form.tipo === "cliente" && (
                    <div className="input-group">
                      <FaBuilding className="input-icon" />
                      <input
                        type="text"
                        name="cnpj"
                        placeholder="CNPJ"
                        value={form.cnpj}
                        onChange={handleChange}
                        required
                        maxLength="18"
                        className={`input ${erros.cnpj ? "input-erro" : ""}`}
                      />
                    </div>
                  )}
                </div>
                {erros.cpf && <div className="error-msg">{erros.cpf}</div>}
                {erros.cnpj && <div className="error-msg">{erros.cnpj}</div>}

                {/* Upload de imagem */}
                <div className="form-row form-col">
                  <label className="input-label">
                    <FaImage className="me-2" /> Foto de Perfil (opcional):
                  </label>
                  <label htmlFor="foto_perfil" className="file-label">
                    Selecionar arquivo
                  </label>
                  <input
                    id="foto_perfil"
                    type="file"
                    name="foto_perfil"
                    onChange={handleChange}
                    accept="image/*"
                    className="input-file"
                  />
                  {form.foto_perfil && (
                    <span className="file-name">{form.foto_perfil.name}</span>
                  )}
                  {erros.foto_perfil && (
                    <div className="error-msg">{erros.foto_perfil}</div>
                  )}
                </div>

                <button type="submit" className="btn btn-primary">Cadastrar</button>

                {sucesso && <div className="success-msg">{sucesso}</div>}
                {erroGeral && <div className="error-msg">{erroGeral}</div>}
              </form>

              <p className="cadastro-link">
                Já tem uma conta? <a href="/login">Entrar</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
