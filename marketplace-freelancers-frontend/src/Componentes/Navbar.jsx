import React, { useContext, useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import { FiLogOut, FiUser, FiSettings } from "react-icons/fi";
import {
  FaShieldAlt,
  FaExclamationTriangle,
  FaHome,
  FaBriefcase,
  FaFileAlt,
  FaHandshake,
  FaStar,
} from "react-icons/fa";
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

  // ✅ Foto de perfil (com fallback)
  const fotoPerfil =
    usuarioLogado?.foto_perfil && usuarioLogado.foto_perfil.trim() !== ""
      ? usuarioLogado.foto_perfil
      : "";

  const navegarPara = (rota) => {
    navigate(rota);
    setMenuAberto(false);
  };

  // ===================== JSX =====================
  return (
    <nav className="navbar">
      {/* Logo */}
      <div
        className="nav-brand"
        role="button"
        onClick={() => navegarPara("/home")}
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && navegarPara("/home")}
      >
        <img
          src="/profreelabr.png"
          alt="Logo do ProFreelaBR"
          className="logo-img"
        />
      </div>

      {/* LINKS DE NAVEGAÇÃO */}
      <div className="nav-links">
        <div className="nav-links-main">
          <button
            onClick={() => navegarPara("/trabalhos")}
            className={rotaAtiva("/trabalhos")}
            title="Trabalhos"
          >
            <FaBriefcase />
            <span>Trabalhos</span>
          </button>

          {/* Propostas */}
          {(usuarioLogado.tipo === "freelancer" ||
            usuarioLogado.tipo === "contratante") && (
            <button
              onClick={() => navegarPara("/propostas")}
              className={rotaAtiva("/propostas")}
              title={
                usuarioLogado.tipo === "freelancer"
                  ? "Minhas Propostas"
                  : "Propostas Recebidas"
              }
            >
              <FaFileAlt />
              <span>Propostas</span>
            </button>
          )}

          {/* Contratos */}
          {(usuarioLogado.tipo === "freelancer" ||
            usuarioLogado.tipo === "contratante") && (
            <button
              onClick={() => navegarPara("/contratos")}
              className={rotaAtiva("/contratos")}
              title="Contratos"
            >
              <FaHandshake />
              <span>Contratos</span>
            </button>
          )}

          {/* Avaliações */}
          {(usuarioLogado.tipo === "freelancer" ||
            usuarioLogado.tipo === "contratante") && (
            <button
              onClick={() => navegarPara("/avaliacoes")}
              className={rotaAtiva("/avaliacoes")}
              title="Avaliações"
            >
              <FaStar />
              <span>Avaliações</span>
            </button>
          )}

          {/* Denúncias */}
          {usuarioLogado.is_superuser ? (
            <button
              onClick={() => navegarPara("/painel-denuncias")}
              className={rotaAtiva("/painel-denuncias")}
              title="Painel de Denúncias"
            >
              <FaShieldAlt />
              <span>Denúncias</span>
            </button>
          ) : (
            <button
              onClick={() => navegarPara("/minhas-denuncias")}
              className={rotaAtiva("/minhas-denuncias")}
              title="Minhas Denúncias"
            >
              <FaExclamationTriangle />
              <span>Denúncias</span>
            </button>
          )}
        </div>
      </div>

      {/* AÇÕES À DIREITA */}
      <div className="nav-actions">
        {/* Notificações */}
        <NotificacoesDropdown />

        {/* Menu do Usuário */}
        <div className="menu-usuario" ref={menuRef}>
          {fotoPerfil ? (
            <img
              src={fotoPerfil}
              alt="Foto de perfil"
              className="avatar"
              role="button"
              tabIndex={0}
              onClick={() => setMenuAberto(!menuAberto)}
              onKeyDown={(e) =>
                e.key === "Enter" && setMenuAberto(!menuAberto)
              }
            />
          ) : (
            <div
              className="avatar"
              role="button"
              tabIndex={0}
              onClick={() => setMenuAberto(!menuAberto)}
              onKeyDown={(e) =>
                e.key === "Enter" && setMenuAberto(!menuAberto)
              }
              title={usuarioLogado?.nome || usuarioLogado?.username}
            >
              {usuarioLogado?.nome
                ? usuarioLogado.nome[0].toUpperCase()
                : (usuarioLogado?.username || "?")[0].toUpperCase()}
            </div>
          )}

          {menuAberto && (
            <div className="menu-dropdown">
              <div className="usuario-nome">
                {usuarioLogado?.nome || usuarioLogado?.username}
                <div
                  style={{
                    fontSize: "0.8rem",
                    opacity: "0.7",
                    fontWeight: "400",
                  }}
                >
                  {usuarioLogado?.tipo === "freelancer"
                    ? "Freelancer"
                    : usuarioLogado?.tipo === "contratante"
                    ? "Contratante"
                    : usuarioLogado?.is_superuser
                    ? "Administrador"
                    : "Usuário"}
                </div>
              </div>

              <button onClick={() => navegarPara("/dashboard")}>
                <FaHome />
                Dashboard
              </button>

              <button onClick={() => navegarPara("/conta")}>
                <FiSettings />
                Configurações da Conta
              </button>

              <button onClick={() => navegarPara(`/perfil/${usuarioLogado.id}`)}>
                <FiUser />
                Ver Meu Perfil
              </button>

              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("userId");
                  navigate("/login", { replace: true });
                }}
              >
                <FiLogOut />
                Sair da Conta
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
