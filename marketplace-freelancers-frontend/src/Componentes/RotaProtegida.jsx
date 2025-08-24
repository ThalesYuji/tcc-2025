import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { UsuarioContext } from "../Contextos/UsuarioContext";

export default function RotaProtegida({ children }) {
  const { usuarioLogado, carregando } = useContext(UsuarioContext);

  if (carregando) return <div>Carregando...</div>;
  if (!usuarioLogado) return <Navigate to="/login" />;
  return children;
}
