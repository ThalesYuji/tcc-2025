// src/Servicos/Api.js
import axios from "axios";

const IS_PROD = process.env.NODE_ENV === "production";
const SUSP_HEADER = "x-blocked-by-suspension";
const SUSP_KEY = "account_suspended";

// =============================================================
// 🔧 BASE DA API
// =============================================================
const api = axios.create({
  baseURL: "https://web-production-385bb.up.railway.app/api",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// =============================================================
// 🔐 TOKEN
// =============================================================
export function setAuthToken(token) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

function getAuthToken() {
  return localStorage.getItem("token");
}

// =============================================================
// 🚫 MODO LEITURA (SUSPENSÃO)
// =============================================================
export function getSuspendedFlag() {
  return localStorage.getItem(SUSP_KEY) === "1";
}

export function setSuspendedFlag(value) {
  if (value) localStorage.setItem(SUSP_KEY, "1");
  else localStorage.removeItem(SUSP_KEY);
}

function notifySuspension(message = "Sua conta está desativada (modo leitura).") {
  try {
    window.dispatchEvent(
      new CustomEvent("account:suspended", { detail: { message } })
    );
  } catch {}
  if (!IS_PROD) console.warn("🚫 Modo leitura acionado:", message);
}

// =============================================================
// 🔄 INTERCEPTOR DE REQUEST
// =============================================================
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// =============================================================
// 🔄 INTERCEPTOR DE RESPOSTA
// =============================================================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const headers = error?.response?.headers || {};
    const data = error?.response?.data;

    // 401 — token expirado
    if (status === 401) {
      setAuthToken(null);
      const cur = window.location.pathname;
      if (!["/login", "/cadastro", "/esqueci-senha"].includes(cur)) {
        window.location.href = "/login";
      }
    }

    // 403 — conta bloqueada por suspensão
    const blocked = String(headers[SUSP_HEADER]) === "true";
    if (status === 403 && blocked) {
      setSuspendedFlag(true);
      const msg =
        data?.detail ||
        data?.message ||
        data?.erro ||
        data?.error ||
        "Sua conta está desativada (modo leitura).";

      notifySuspension(msg);
    }

    return Promise.reject(error);
  }
);

// =============================================================
// 🧍 CONTROLE DE CONTA
// =============================================================
export async function desativarConta() {
  const resp = await api.post("/usuarios/me/desativar/");
  setSuspendedFlag(true);
  return resp?.data;
}

export async function reativarConta() {
  const resp = await api.post("/usuarios/me/reativar/");
  setSuspendedFlag(false);
  return resp?.data;
}

// =============================================================
// 🛡️ DENÚNCIAS — MODERAÇÃO
// =============================================================
export async function marcarDenunciaComoAnalisando(id) {
  const resp = await api.patch(`/denuncias/${id}/marcar-analisando/`);
  return resp.data;
}

export async function marcarDenunciaComoProcedente(id, resposta_admin = "") {
  const resp = await api.patch(`/denuncias/${id}/marcar-procedente/`, {
    resposta_admin,
  });
  return resp.data;
}

export async function marcarDenunciaComoImprocedente(id, resposta_admin = "") {
  const resp = await api.patch(`/denuncias/${id}/marcar-improcedente/`, {
    resposta_admin,
  });
  return resp.data;
}

// =============================================================
// 🔥 PUNIÇÕES — ADMIN
// =============================================================
export async function aplicarAdvertencia(usuario_id, motivo, denuncia_id = null) {
  const resp = await api.post("/punicoes/advertir/", {
    usuario_id,
    motivo,
    denuncia_id,
  });
  return resp.data;
}

export async function aplicarSuspensao(usuario_id, motivo, dias, denuncia_id = null) {
  const resp = await api.post("/punicoes/suspender/", {
    usuario_id,
    motivo,
    dias,
    denuncia_id,
  });
  return resp.data;
}

export async function aplicarBanimento(usuario_id, motivo, denuncia_id = null) {
  const resp = await api.post("/punicoes/banir/", {
    usuario_id,
    motivo,
    denuncia_id,
  });
  return resp.data;
}

export async function removerSuspensao(usuario_id) {
  const resp = await api.post("/punicoes/remover-suspensao/", {
    usuario_id,
  });
  return resp.data;
}

// =============================================================
// 📌 HISTÓRICO DE PUNIÇÕES
// =============================================================

// 🔹 Listar tudo
export async function listarHistoricoPunicoes() {
  const resp = await api.get("/punicoes/historico/");
  return resp.data;
}

// 🔹 Listar por usuário
export async function listarPunicoesPorUsuario(usuario_id) {
  const resp = await api.get(`/punicoes/historico/${usuario_id}/`);
  return resp.data;
}

// 🔹 Remover punição (DELETE correto)
export async function removerPunicao(punicao_id) {
  const resp = await api.delete(`/punicoes/remover/${punicao_id}/`);
  return resp.data;
}

export default api;
