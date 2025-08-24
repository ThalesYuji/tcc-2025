import api from "./Api";

// Função para buscar dados do usuário logado
export async function getUsuarioLogado() {
  const response = await api.get("/usuarios/me/");
  return response.data;
}
