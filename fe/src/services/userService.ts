import type { User, Role } from "../interfaces";
import api from "./axiosInstance";

/**
 * User Service - Handles REST APIs for managing restaurant staff accounts and RBAC roles.
 * Connects directly to the Express backend.
 */
export const userService = {
  /**
   * Fetch all roles from the database
   */
  getRoles: async (): Promise<{ data: Role[] }> => {
    const response = await api.get("/users/roles");
    return { data: response.data.data || [] };
  },

  /**
   * Fetch all users who are not soft-deleted
   */
  getUsers: async (): Promise<{ data: User[] }> => {
    const response = await api.get("/users");
    return { data: response.data.data || [] };
  },

  /**
   * Create a new user profile
   */
  createUser: async (
    userData: Omit<User, "id" | "created_at" | "updated_at" | "is_deleted" | "deleted_at" | "last_login" | "role"> & { password?: string }
  ): Promise<{ data: User }> => {
    const response = await api.post("/users/create", userData);
    return { data: response.data.data };
  },

  /**
   * Update an existing user profile (Simulates PATCH request)
   */
  updateUser: async (
    id: number | string,
    userData: Partial<Omit<User, "id" | "created_at" | "is_deleted" | "deleted_at" | "last_login" | "role"> & { password?: string }>
  ): Promise<{ data: User }> => {
    const response = await api.patch(`/users/${id}/update`, userData);
    return { data: response.data.data };
  },

  /**
   * Soft delete a user profile (PATCH update is_deleted = 1)
   */
  deleteUser: async (id: number | string): Promise<{ data: boolean }> => {
    await api.patch(`/users/${id}/delete`);
    return { data: true };
  },
};
