// src/Servicos/Api.js
import axios from "axios";

const IS_PROD = process.env.NODE_ENV === "production";

// 🔧 Base da API (comporta bem URLs começando com "/")
const api = axios.create({
  baseURL: "https://web-production-385bb.up.railway.app/api",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// --- Helpers para token (opcionais, mas úteis) ---
export function setAuthToken(token) {
  if (token) {
    localStorage.setItem("token", token);
  } else {
    localStorage.removeItem("token");
  }
}
function getAuthToken() {
  return localStorage.getItem("token");
}

// 🔹 Interceptor de requisição: adiciona JWT e faz log
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;

    if (!IS_PROD) {
      console.log("📡 Requisição:", {
        method: (config.method || "").toUpperCase(),
        url: config.url,
        fullURL: `${config.baseURL || ""}${config.url || ""}`,
        hasToken: !!token,
      });
    }
    return config;
  },
  (error) => {
    if (!IS_PROD) console.error("❌ Erro no interceptor de request:", error);
    return Promise.reject(error);
  }
);

// 🔹 Interceptor de resposta: logs úteis e tratamento de 401
api.interceptors.response.use(
  (response) => {
    const url = response?.config?.url || "";

    if (!IS_PROD) {
      console.log("✅ Resposta OK:", { status: response.status, url });
      // Loga o corpo de endpoints úteis para depuração do perfil
      if (url.includes("/usuarios/me/")) {
        console.log("👤 ME (payload):", response.data);
      }
      if (url.includes("/perfil_publico/")) {
        console.log("🪪 Perfil Público (payload):", response.data);
      }
    }
    return response;
  },
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url;

    if (error.response) {
      // Erro HTTP do backend
      if (!IS_PROD) {
        console.error("❌ Erro HTTP:", {
          status,
          url,
          data: error.response.data,
        });
      }

      // Token expirado / inválido -> desloga (com whitelist de rotas públicas)
      if (status === 401) {
        const pathname = window.location.pathname || "/";
        const publicPaths = [
          "/login",
          "/cadastro",
          "/esqueci-senha",
          "/reset-password",
          "/reset-password/", // compat
        ];
        setAuthToken(null); // limpa o token

        // Evita redirecionar se já estiver numa rota pública
        const isPublic = publicPaths.some((p) => pathname.startsWith(p));
        if (!isPublic) {
          window.location.href = "/login";
        }
      }
    } else if (error.request) {
      // Servidor não respondeu
      if (!IS_PROD) console.error("📡 Servidor não respondeu:", error.request);
    } else {
      // Erro na configuração da requisição
      if (!IS_PROD) console.error("⚙️ Erro na configuração:", error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
