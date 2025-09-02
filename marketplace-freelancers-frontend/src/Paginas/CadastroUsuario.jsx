import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

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

  // Máscara para telefone
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

  // Máscara para CPF
  function formatarCPF(valor) {
    if (!valor) return "";
    let numeros = valor.replace(/\D/g, "");
    if (numeros.length > 11) numeros = numeros.slice(0, 11);
    return numeros.replace(
      /^(\d{3})(\d{3})(\d{3})(\d{0,2}).*/,
      "$1.$2.$3-$4"
    );
  }

  // Máscara para CNPJ
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

    // VALIDAÇÃO DE SENHAS IGUAIS
    if (form.senha !== form.confirmarSenha) {
      setErros({ confirmarSenha: "As senhas não coincidem." });
      return;
    }

    // Validação local da senha
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
        headers: { "Content-Type": "multipart/form-data" }
      });
      setSucesso("Cadastro realizado com sucesso! Redirecionando...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      if (err.response && err.response.data) {
        const backendErros = err.response.data;
        let novosErros = {};
        Object.entries(backendErros).forEach(([campo, mensagem]) => {
          if (
            Array.isArray(mensagem) &&
            mensagem[0] &&
            (
              mensagem[0].toLowerCase().includes("already exists") ||
              mensagem[0].toLowerCase().includes("unique")
            )
          ) {
            if (campo === "email") novosErros[campo] = "E-mail já cadastrado.";
            else if (campo === "cpf") novosErros[campo] = "CPF já cadastrado.";
            else if (campo === "cnpj") novosErros[campo] = "CNPJ já cadastrado.";
            else if (campo === "telefone") novosErros[campo] = "Telefone já cadastrado.";
            else novosErros[campo] = "Valor já cadastrado.";
          } else {
            novosErros[campo] = Array.isArray(mensagem) ? mensagem.join(" ") : mensagem;
          }
        });
        setErros(novosErros);

        if (backendErros.detail) {
          setErroGeral(backendErros.detail);
        } else if (Object.keys(novosErros).length === 0) {
          setErroGeral("Erro ao cadastrar usuário. Verifique os campos.");
        }
      } else {
        setErroGeral("Erro ao cadastrar usuário. Verifique os campos.");
      }
    }
  }

  return (
    <div className="login-bg">
      <div className="login-content">
        <div className="login-left">
          <img src="/profreelabr.png" alt="Logo ProFreelaBR" className="login-logo" />
          <h1 className="login-title">Crie sua conta no ProFreelaBR</h1>
          <h2 className="login-subtitle">Faça parte da maior comunidade de freelancers do Brasil</h2>
          <p>Cadastre-se grátis, preencha seus dados e comece agora mesmo a transformar seu talento em oportunidades!</p>
        </div>
        <div className="login-right">
          <div className="login-box">
            <h3>Cadastrar</h3>
            <form onSubmit={handleSubmit} encType="multipart/form-data" className="form-cadastro-doisblocos">
              {/* BLOCO 1 - DADOS DE ACESSO */}
              <h4>Dados de Acesso</h4>
              <div className="form-row">
                <input
                  type="text"
                  name="nome"
                  placeholder="Nome completo"
                  value={form.nome}
                  onChange={handleChange}
                  required
                  className={erros.nome ? "input-erro" : ""}
                />
                <input
                  type="email"
                  name="email"
                  placeholder="E-mail"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className={erros.email ? "input-erro" : ""}
                />
              </div>
              <div className="form-row">
                <input
                  type="password"
                  name="senha"
                  placeholder="Senha"
                  value={form.senha}
                  onChange={handleChange}
                  required
                  className={erros.password ? "input-erro" : ""}
                />
                <input
                  type="password"
                  name="confirmarSenha"
                  placeholder="Confirmar senha"
                  value={form.confirmarSenha}
                  onChange={handleChange}
                  required
                  className={erros.confirmarSenha ? "input-erro" : ""}
                />
              </div>
              {erros.password && <div className="error-msg">{erros.password}</div>}
              {erros.confirmarSenha && <div className="error-msg">{erros.confirmarSenha}</div>}

              <hr style={{ margin: "16px 0" }} />

              {/* BLOCO 2 - PERFIL/DOCUMENTOS */}
              <h4>Perfil e Documentos</h4>
              <div className="form-row">
                <select
                  name="tipo"
                  value={form.tipo}
                  onChange={handleChange}
                  required
                  className={erros.tipo ? "input-erro" : ""}
                  style={{ minWidth: 120 }}
                >
                  <option value="freelancer">Freelancer</option>
                  <option value="cliente">Cliente</option>
                </select>
                <input
                  type="text"
                  name="telefone"
                  placeholder="Telefone"
                  value={form.telefone}
                  onChange={handleChange}
                  required
                  className={erros.telefone ? "input-erro" : ""}
                  maxLength="15"
                />
              </div>
              <div className="form-row">
                <input
                  type="text"
                  name="cpf"
                  placeholder="CPF"
                  value={form.cpf}
                  onChange={handleChange}
                  required
                  className={erros.cpf ? "input-erro" : ""}
                  maxLength="14"
                />
                {form.tipo === "cliente" && (
                  <input
                    type="text"
                    name="cnpj"
                    placeholder="CNPJ"
                    value={form.cnpj}
                    onChange={handleChange}
                    required
                    className={erros.cnpj ? "input-erro" : ""}
                    maxLength="18"
                  />
                )}
              </div>
              {erros.cpf && <div className="error-msg">{erros.cpf}</div>}
              {erros.cnpj && <div className="error-msg">{erros.cnpj}</div>}
              {erros.telefone && <div className="error-msg">{erros.telefone}</div>}

              <div className="form-row" style={{ flexDirection: "column", gap: 3 }}>
                <label className="input-label">Foto de Perfil (opcional):</label>
                <input
                  type="file"
                  name="foto_perfil"
                  onChange={handleChange}
                  accept="image/*"
                  className={`input-file-box ${erros.foto_perfil ? "input-erro" : ""}`}
                />
                {erros.foto_perfil && <div className="error-msg">{erros.foto_perfil}</div>}
              </div>

              <button type="submit">Cadastrar</button>
              {sucesso && <div className="success-msg">{sucesso}</div>}
              {erroGeral && <div className="error-msg">{erroGeral}</div>}
            </form>
            <p className="cadastro-link">
              Já tem conta? <a href="/login">Entrar</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
