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
      // Chỉ xóa token nhân viên, không xóa customer_token
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("resmanagerState");
      window.location.href = "/auth/login";
    }
    return Promise.reject(err);
  },
);

export default api;
