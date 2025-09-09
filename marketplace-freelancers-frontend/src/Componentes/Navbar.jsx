import React, { useContext, useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import { FiLogOut, FiUser, FiSettings } from "react-icons/fi";
import { FaShieldAlt, FaExclamationTriangle } from "react-icons/fa";
import NotificacoesDropdown from "../Componentes/NotificacoesDropdown";
import "../styles/Navbar.css";

export default function Navbar() {
  const { usuarioLogado } = useContext(UsuarioContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef();

  useEffect(() => {
    function handleClickFora(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, []);

  if (!usuarioLogado) return null;

  const rotaAtiva = (rota) =>
    location.pathname === rota ? "nav-btn active" : "nav-btn";

  const fotoPerfil = usuarioLogado?.foto_perfil || "/icone-usuario.png";

  return (
    <nav className="navbar">
      {/* Logo */}
      <div
        className="nav-brand"
        role="button"
        onClick={() => navigate("/dashboard")}
      >
        <img
          src="/profreelabr.png"
          alt="Logo do ProFreelaBR"
          className="logo-img"
        />
      </div>

      {/* Links */}
      <div className="nav-links">
        <button
          onClick={() => navigate("/dashboard")}
          className={rotaAtiva("/dashboard")}
        >
          Dashboard
        </button>
        <button
          onClick={() => navigate("/trabalhos")}
          className={rotaAtiva("/trabalhos")}
        >
          Trabalhos
        </button>

        {(usuarioLogado.tipo === "freelancer" ||
          usuarioLogado.tipo === "cliente") && (
          <button
            onClick={() => navigate("/propostas")}
            className={rotaAtiva("/propostas")}
          >
            {usuarioLogado.tipo === "freelancer"
              ? "Minhas Propostas"
              : "Propostas Recebidas"}
          </button>
        )}

        {(usuarioLogado.tipo === "freelancer" ||
          usuarioLogado.tipo === "cliente") && (
          <button
            onClick={() => navigate("/contratos")}
            className={rotaAtiva("/contratos")}
          >
            Contratos
          </button>
        )}

        {(usuarioLogado.tipo === "freelancer" ||
          usuarioLogado.tipo === "cliente") && (
          <button
            onClick={() => navigate("/avaliacoes")}
            className={rotaAtiva("/avaliacoes")}
          >
            Minhas Avaliações
          </button>
        )}

        {/* Denúncias */}
        {usuarioLogado.is_superuser ? (
          <button
            onClick={() => navigate("/painel-denuncias")}
            className={rotaAtiva("/painel-denuncias")}
          >
            <FaShieldAlt style={{ marginRight: 6 }} />
            Painel Denúncias
          </button>
        ) : (
          <button
            onClick={() => navigate("/minhas-denuncias")}
            className={rotaAtiva("/minhas-denuncias")}
          >
            <FaExclamationTriangle style={{ marginRight: 6 }} />
            Minhas Denúncias
          </button>
        )}

        {/* Notificações */}
        <NotificacoesDropdown />

        {/* Menu do usuário */}
        <div className="menu-usuario" ref={menuRef}>
          <img
            src={fotoPerfil}
            alt="Foto de perfil do usuário"
            className="avatar"
            role="button"
            onClick={() => setMenuAberto(!menuAberto)}
          />
          {menuAberto && (
            <div className="menu-dropdown">
              <div className="usuario-nome">{usuarioLogado?.nome}</div>

              <button onClick={() => navigate("/conta")}>
                <FiSettings /> Conta
              </button>

              <button onClick={() => navigate(`/perfil/${usuarioLogado.id}`)}>
                <FiUser /> Ver perfil
              </button>

              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("userId");
                  navigate("/login", { replace: true }); // 🔹 mais seguro
                }}
              >
                <FiLogOut /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
