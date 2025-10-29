// src/Servicos/Api.js
import axios from "axios";

const api = axios.create({
  baseURL: "https://web-production-385bb.up.railway.app/api",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔹 Adiciona token JWT nas requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // 🔍 Debug (ajuda a identificar problemas)
    console.log("📡 Requisição:", {
      method: config.method?.toUpperCase(),
      url: config.url,
      fullURL: `${config.baseURL}${config.url}`,
      hasToken: !!token,
    });
    
    return config;
  },
  (error) => {
    console.error("❌ Erro no interceptor:", error);
    return Promise.reject(error);
  }
);

// 🔹 Trata respostas e erros
api.interceptors.response.use(
  (response) => {
    console.log("✅ Resposta OK:", {
      status: response.status,
      url: response.config.url,
    });
    return response;
  },
  (error) => {
    if (error.response) {
      // Erro HTTP do backend
      console.error("❌ Erro HTTP:", {
        status: error.response.status,
        url: error.config?.url,
        data: error.response.data,
      });

      // Token expirado
      if (error.response.status === 401) {
        localStorage.removeItem("token");
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
      }
    } else if (error.request) {
      // Servidor não respondeu
      console.error("📡 Servidor não respondeu:", error.request);
    } else {
      // Erro na configuração
      console.error("⚙️ Erro:", error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api;