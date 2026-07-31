import api from "./axiosInstance";

export interface PermissionRow {
  id: number;
  key: string;
  name: string;
  description: string;
  roles: Record<string, boolean>;
}

export interface PermissionUpdate {
  permission_key: string;
  role_name: string;
  is_allowed: boolean;
}

/**
 * RBAC Service - Quản lý ma trận phân quyền theo vai trò (chỉ Admin được gọi).
 */
export const rbacService = {
  /** Lấy ma trận phân quyền hiện tại từ DB */
  getPermissionMatrix: async (): Promise<PermissionRow[]> => {
    const response = await api.get("/rbac/permissions");
    return response.data.data || [];
  },

  /** Lưu hàng loạt thay đổi ma trận phân quyền */
  updatePermissionMatrix: async (updates: PermissionUpdate[]): Promise<PermissionRow[]> => {
    const response = await api.patch("/rbac/permissions", { updates });
    return response.data.data || [];
  },
};
