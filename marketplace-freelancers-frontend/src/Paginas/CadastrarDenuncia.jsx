// src/Paginas/CadastrarDenuncia.jsx
import React, { useContext, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import api from "../Servicos/Api";
import "../styles/CadastrarDenuncia.css";

export default function CadastrarDenuncia() {
  const { usuarioLogado } = useContext(UsuarioContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [denunciado, setDenunciado] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const idDenunciado = location.state?.denunciado;
    if (!idDenunciado) {
      setErro("Usuário a ser denunciado não foi informado.");
      return;
    }

    async function buscarUsuario() {
      try {
        const res = await api.get(`/usuarios/${idDenunciado}/`);
        setDenunciado(res.data);
      } catch {
        setErro("Erro ao buscar informações do usuário denunciado.");
      }
    }

    buscarUsuario();
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    setSucesso("");

    if (!motivo.trim()) {
      setErro("Por favor, descreva o motivo da denúncia.");
      return;
    }

    try {
      await api.post(
        "/denuncias/",
        { denunciado: denunciado.id, motivo: motivo.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSucesso("Denúncia enviada com sucesso!");
      setMotivo("");
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err) {
      if (err.response?.data?.detail) {
        setErro(err.response.data.detail);
      } else if (err.response?.data) {
        const mensagem = Object.values(err.response.data)[0];
        setErro(typeof mensagem === "string" ? mensagem : "Erro ao enviar a denúncia.");
      } else {
        setErro("Erro inesperado. Tente novamente.");
      }
    }
  };

  if (!usuarioLogado) return <div className="main-center">Usuário não autenticado.</div>;
  if (!denunciado) return <div className="main-center">Carregando informações do usuário denunciado...</div>;

  return (
    <div className="main-center">
      <div className="main-box denuncia-box">
        <h2 className="denuncia-title">🚨 Enviar Denúncia</h2>

        <p><strong>Você está denunciando:</strong></p>
        <ul>
          <li><b>Nome:</b> {denunciado.nome}</li>
          <li><b>Tipo de Conta:</b> {denunciado.tipo === "freelancer" ? "Freelancer" : "Cliente"}</li>
        </ul>

        <form onSubmit={handleSubmit} className="denuncia-form">
          <label htmlFor="motivo"><strong>Motivo da denúncia:</strong></label>
          <textarea
            id="motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={5}
            placeholder="Descreva aqui o motivo da denúncia..."
            className="denuncia-textarea"
          />

          {erro && <div className="error-msg">{erro}</div>}
          {sucesso && <div className="success-msg">{sucesso}</div>}

          <button type="submit" className="btn btn-danger denuncia-btn">
            Enviar Denúncia
          </button>
        </form>
      </div>
    </div>
  );
}
