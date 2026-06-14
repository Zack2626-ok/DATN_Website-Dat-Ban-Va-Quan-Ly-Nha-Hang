import api from "./axiosInstance";
import type { LoginPayload, RegisterPayload, AuthResponse, User } from "../interfaces/auth";

/**
 * Đăng nhập — lưu token vào localStorage, trả về AuthResponse
 */
export const loginApi = async (body: LoginPayload): Promise<AuthResponse> => {
  const res = await api.post<AuthResponse>("/auth/login", body);
  localStorage.setItem("accessToken", res.data.accessToken);
  localStorage.setItem("refreshToken", res.data.refreshToken);

  return res.data;
};

/**
 * Tạo tài khoản nhân viên — chỉ admin/manager gọi được
 */
export const registerApi = async (body: RegisterPayload): Promise<User> => {
  const res = await api.post("/auth/register", body);
  return res.data;
};

/**
 * Lấy thông tin user đang đăng nhập từ server
 */
export const getMeApi = async (): Promise<User> => {
  const { data } = await api.get<{ data: User }>("/auth/me");
  return data.data;
};