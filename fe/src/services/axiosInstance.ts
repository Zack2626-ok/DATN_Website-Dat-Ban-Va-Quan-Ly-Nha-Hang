import axios from "axios";

/**
 * Axios instance duy nhất cho toàn app.
 * Tự động gắn Authorization header và xử lý 401.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes("/auth/login")) {
      localStorage.clear();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

export default api;
