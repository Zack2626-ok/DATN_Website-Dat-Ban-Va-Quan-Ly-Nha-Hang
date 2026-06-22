import api from "./axiosInstance";
import type { MenuItem, Category } from "../interfaces";

/**
 * Service for Menu and Category related API calls
 */
export const menuService = {
  /**
   * Get all menu items
   */
  async getMenuItems(): Promise<MenuItem[]> {
    try {
      const response = await api.get("/menu-items");
      return response.data.data || [];
    } catch (error) {
      console.error("Error fetching menu items:", error);
      throw error;
    }
  },

  /**
   * Get all categories
   */
  async getCategories(): Promise<Category[]> {
    try {
      const response = await api.get("/categories");
      return response.data.data || [];
    } catch (error) {
      console.error("Error fetching categories:", error);
      throw error;
    }
  },

  /**
   * Create a new menu item
   */
  async createMenuItem(data: Omit<MenuItem, "id" | "created_at" | "updated_at">): Promise<MenuItem> {
    try {
      const response = await api.post("/menu-items", data);
      return response.data.data;
    } catch (error) {
      console.error("Error creating menu item:", error);
      throw error;
    }
  },

  /**
   * Update an existing menu item
   */
  async updateMenuItem(id: string | number, data: Partial<MenuItem>): Promise<MenuItem> {
    try {
      const response = await api.put(`/menu-items/${id}`, data);
      return response.data.data;
    } catch (error) {
      console.error("Error updating menu item:", error);
      throw error;
    }
  },

  /**
   * Toggle menu item active status
   */
  async toggleMenuItemActive(id: string | number): Promise<MenuItem> {
    try {
      const response = await api.patch(`/menu-items/${id}/toggle-active`);
      return response.data.data;
    } catch (error) {
      console.error("Error toggling menu item status:", error);
      throw error;
    }
  },

  /**
   * Delete a menu item (soft delete)
   */
  async deleteMenuItem(id: string | number): Promise<void> {
    try {
      await api.delete(`/menu-items/${id}`);
    } catch (error) {
      console.error("Error deleting menu item:", error);
      throw error;
    }
  },
};
