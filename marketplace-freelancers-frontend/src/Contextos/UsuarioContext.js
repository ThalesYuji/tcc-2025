import React, { createContext, useEffect, useState } from "react";
import { getUsuarioLogado } from "../Servicos/Auth";

export const UsuarioContext = createContext();

export function UsuarioProvider({ children }) {
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      getUsuarioLogado()
        .then(user => {
          setUsuarioLogado(user);
          localStorage.setItem("userId", user.id); // salva ID no localStorage pro resto do app
        })
        .catch(() => {
          setUsuarioLogado(null);
          localStorage.removeItem("token");
          localStorage.removeItem("userId");
        })
        .finally(() => setCarregando(false));
    } else {
      setUsuarioLogado(null);
      localStorage.removeItem("userId");
      setCarregando(false);
    }
  }, []);

  return (
    <UsuarioContext.Provider value={{ usuarioLogado, setUsuarioLogado, carregando }}>
      {children}
    </UsuarioContext.Provider>
  );
}
