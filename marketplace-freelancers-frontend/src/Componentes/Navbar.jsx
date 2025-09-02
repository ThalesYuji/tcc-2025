import React, { useContext, useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { UsuarioContext } from "../Contextos/UsuarioContext";
import { FiLogOut, FiUser, FiSettings } from "react-icons/fi";
import NotificacoesDropdown from "../Componentes/NotificacoesDropdown";

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

  // 🔹 Agora o backend já envia a URL completa da foto
  const fotoPerfil = usuarioLogado?.foto_perfil || "/icone-usuario.png";

  return (
    <nav className="navbar">
      <div className="nav-brand" onClick={() => navigate("/dashboard")}>
        <img src="/profreelabr.png" alt="Logo ProFreela" className="logo-img" />
      </div>

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

        {/* Botão de Denúncias */}
        {usuarioLogado.is_superuser ? (
          <button
            onClick={() => navigate("/painel-denuncias")}
            className={rotaAtiva("/painel-denuncias")}
          >
            <i className="fas fa-shield-alt me-2"></i>
            Painel Denúncias
          </button>
        ) : (
          <button
            onClick={() => navigate("/minhas-denuncias")}
            className={rotaAtiva("/minhas-denuncias")}
          >
            <i className="fas fa-exclamation-triangle me-2"></i>
            Minhas Denúncias
          </button>
        )}

        <NotificacoesDropdown />

        {/* Menu do avatar */}
        <div className="menu-usuario" ref={menuRef}>
          <img
            src={fotoPerfil}
            alt="Avatar"
            className="avatar"
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
                  window.location.href = "/login";
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
