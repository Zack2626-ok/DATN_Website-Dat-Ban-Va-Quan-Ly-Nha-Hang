import type { User, Role } from "../interfaces";
import { USER_ROLE, ROLE_LABELS } from "../constants/roles";

// Mock data
const mockRoles: Role[] = [
  { id: 1, name: USER_ROLE.ADMIN, description: ROLE_LABELS[USER_ROLE.ADMIN] },
  { id: 2, name: USER_ROLE.MANAGER, description: ROLE_LABELS[USER_ROLE.MANAGER] },
  { id: 3, name: USER_ROLE.WAITER, description: ROLE_LABELS[USER_ROLE.WAITER] },
  { id: 4, name: USER_ROLE.CASHIER, description: ROLE_LABELS[USER_ROLE.CASHIER] },
  { id: 5, name: USER_ROLE.CHEF, description: ROLE_LABELS[USER_ROLE.CHEF] },
  { id: 6, name: USER_ROLE.SALES_EVENT, description: ROLE_LABELS[USER_ROLE.SALES_EVENT] },
];

const mockUsers: User[] = [
  {
    id: 1,
    role_id: 1,
    full_name: "System Admin",
    email: "admin@gmail.com",
    phone: "0900000001",
    avatar_url: "",
    status: "active",
    is_deleted: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    role: mockRoles[0],
  },
  {
    id: 2,
    role_id: 2,
    full_name: "Restaurant Manager",
    email: "manager@gmail.com",
    phone: "0900000002",
    avatar_url: "",
    status: "active",
    is_deleted: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    role: mockRoles[1],
  },
  {
    id: 3,
    role_id: 4,
    full_name: "Cashier 1",
    email: "cashier@gmail.com",
    phone: "0900000003",
    avatar_url: "",
    status: "active",
    is_deleted: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    role: mockRoles[3],
  },
  {
    id: 4,
    role_id: 3,
    full_name: "Waiter 1",
    email: "waiter1@gmail.com",
    phone: "0900000004",
    avatar_url: "",
    status: "active",
    is_deleted: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    role: mockRoles[2],
  },
  {
    id: 5,
    role_id: 3,
    full_name: "Waiter 2",
    email: "waiter2@gmail.com",
    phone: "0900000005",
    avatar_url: "",
    status: "active",
    is_deleted: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    role: mockRoles[2],
  },
  {
    id: 6,
    role_id: 5,
    full_name: "Chef 1",
    email: "chef1@gmail.com",
    phone: "0900000006",
    avatar_url: "",
    status: "active",
    is_deleted: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    role: mockRoles[4],
  },
  {
    id: 7,
    role_id: 6,
    full_name: "Sales Event 1",
    email: "sales@gmail.com",
    phone: "0900000007",
    avatar_url: "",
    status: "active",
    is_deleted: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    role: mockRoles[5],
  },
];

// Local storage key for mock data persistence
const MOCK_USERS_KEY = "resmanager_mock_users";

// Initialize mock data if not exists
const initializeMockData = () => {
  if (!localStorage.getItem(MOCK_USERS_KEY)) {
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(mockUsers));
  }
};

initializeMockData();

/**
 * User Service - Quản lý người dùng
 */
export const userService = {
  /**
   * Lấy danh sách roles
   */
  getRoles: async (): Promise<{ data: Role[] }> => {
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { data: mockRoles };
  },

  /**
   * Lấy danh sách users
   */
  getUsers: async (): Promise<{ data: User[] }> => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const users = JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || JSON.stringify(mockUsers));
    // Attach role objects
    const usersWithRoles = users.map((user: User) => ({
      ...user,
      role: mockRoles.find((r) => r.id === user.role_id),
    }));
    return { data: usersWithRoles };
  },

  /**
   * Tạo user mới
   */
  createUser: async (userData: Omit<User, "id" | "created_at" | "updated_at" | "is_deleted" | "deleted_at" | "last_login" | "role"> & { password?: string }): Promise<{ data: User }> => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const users = JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || JSON.stringify(mockUsers));
    const newId = Math.max(...users.map((u: User) => u.id), 0) + 1;
    const newUser: User = {
      ...userData,
      id: newId,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    users.push(newUser);
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
    return { data: { ...newUser, role: mockRoles.find((r) => r.id === newUser.role_id) } };
  },

  /**
   * Cập nhật user
   */
  updateUser: async (id: number, userData: Partial<Omit<User, "id" | "created_at" | "is_deleted" | "deleted_at" | "last_login" | "role"> & { password?: string }>): Promise<{ data: User }> => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const users = JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || JSON.stringify(mockUsers));
    const index = users.findIndex((u: User) => u.id === id);
    if (index === -1) throw new Error("User not found");
    users[index] = {
      ...users[index],
      ...userData,
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
    return { data: { ...users[index], role: mockRoles.find((r) => r.id === users[index].role_id) } };
  },

  /**
   * Soft delete user
   */
  deleteUser: async (id: number): Promise<{ data: boolean }> => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const users = JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || JSON.stringify(mockUsers));
    const index = users.findIndex((u: User) => u.id === id);
    if (index === -1) throw new Error("User not found");
    users[index] = {
      ...users[index],
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
    return { data: true };
  },
};
