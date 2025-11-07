// src/Servicos/Api.js
import axios from "axios";

const IS_PROD = process.env.NODE_ENV === "production";
const SUSP_HEADER = "x-blocked-by-suspension";
const SUSP_KEY = "account_suspended";

// 🔧 Base da API
const api = axios.create({
  baseURL: "https://web-production-385bb.up.railway.app/api",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// --- Helpers para token ---
export function setAuthToken(token) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}
function getAuthToken() {
  return localStorage.getItem("token");
}

// --- Helpers do modo leitura ---
export function getSuspendedFlag() {
  return localStorage.getItem(SUSP_KEY) === "1";
}
export function setSuspendedFlag(value) {
  if (value) localStorage.setItem(SUSP_KEY, "1");
  else localStorage.removeItem(SUSP_KEY);
}
function notifySuspension(message = "Sua conta está desativada (modo leitura).") {
  try {
    // Evento global: ouça em qualquer lugar do app (window.addEventListener)
    window.dispatchEvent(new CustomEvent("account:suspended", { detail: { message } }));
  } catch {}
  if (!IS_PROD) console.warn("🚫 Modo leitura acionado:", message);
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

// 🔹 Interceptor de resposta: logs + tratamento 401/403 suspensão
api.interceptors.response.use(
  (response) => {
    const url = response?.config?.url || "";

    if (!IS_PROD) {
      console.log("✅ Resposta OK:", { status: response.status, url });
      if (url.includes("/usuarios/me/")) console.log("👤 ME (payload):", response.data);
      if (url.includes("/perfil_publico/")) console.log("🪪 Perfil Público (payload):", response.data);
    }

    // Se resposta OK, e eventualmente estava marcado como suspenso mas voltou a funcionar,
    // limpamos o flag quando vier de endpoints de reativação (opcional)
    return response;
  },
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url;
    const headers = error?.response?.headers || {};
    const data = error?.response?.data;

    if (error.response) {
      if (!IS_PROD) {
        console.error("❌ Erro HTTP:", { status, url, data });
      }

      // 🔒 401 → token inválido/expirado
      if (status === 401) {
        const pathname = window.location.pathname || "/";
        const publicPaths = ["/login", "/cadastro", "/esqueci-senha", "/reset-password", "/reset-password/"];
        setAuthToken(null); // limpa o token
        const isPublic = publicPaths.some((p) => pathname.startsWith(p));
        if (!isPublic) window.location.href = "/login";
      }

      // 🚫 403 por conta desativada (modo leitura)
      const blockedBySuspension = String(headers[SUSP_HEADER]) === "true";
      if (status === 403 && blockedBySuspension) {
        // Guarda flag local (permite esconder botões de ação no UI)
        setSuspendedFlag(true);

        // Mensagem amigável (backend manda {"detail": "..."} pelo middleware)
        const msg =
          (data && (data.detail || data.message || data.erro || data.error)) ||
          "Sua conta está desativada (modo leitura).";

        // Dispara evento global para UI mostrar toast/alerta
        notifySuspension(msg);

        // Não redireciono automaticamente: deixo a UI decidir.
        // Se quiser redirecionar para /minha-conta, ative a linha abaixo:
        // if (!window.location.pathname.startsWith("/minha-conta")) window.location.href = "/minha-conta";
      }
    } else if (error.request) {
      if (!IS_PROD) console.error("📡 Servidor não respondeu:", error.request);
    } else {
      if (!IS_PROD) console.error("⚙️ Erro na configuração:", error.message);
    }

    return Promise.reject(error);
  }
);

// ===== Helpers de conta (endpoints de alternância) =====
// Observação: esses endpoints serão criados no backend em /usuarios/views.py
export async function desativarConta() {
  const resp = await api.post("/usuarios/me/desativar/");
  // Se deu certo, já marcamos flag local
  setSuspendedFlag(true);
  return resp?.data;
}

export async function reativarConta() {
  const resp = await api.post("/usuarios/me/reativar/");
  // Se deu certo, limpamos flag local
  setSuspendedFlag(false);
  return resp?.data;
}

export default api;
