import axios from "axios";

const customerApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

customerApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("customer_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

customerApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes("/customer/login")) {
      localStorage.removeItem("customer_token");
      localStorage.removeItem("customer_info");
      window.location.href = "/auth/login";
    }
    return Promise.reject(err);
  },
);

export default customerApi;
