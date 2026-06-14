import type { UserRole } from "../constants/roles";

export type { UserRole };

export interface User {
  id:         number;
  full_name:  string;
  email:      string;
  role:       UserRole;
  phone:      string | null;
  avatar_url: string | null;
}

export interface LoginPayload {
  email:    string;
  password: string;
}

export interface RegisterPayload {
  full_name: string;
  email:     string;
  password:  string;
  role_name: UserRole;
  phone?:    string;
}

export interface AuthResponse {
  accessToken:  string;
  refreshToken: string;
  user:         User;
}