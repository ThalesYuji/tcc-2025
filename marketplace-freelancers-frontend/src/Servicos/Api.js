import axios from "axios";

const api = axios.create({
  baseURL: "https://web-production-385bb.up.railway.app/api",
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (err) => Promise.reject(err)
);

export default api;