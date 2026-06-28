import api from "./axiosInstance";
import type { MenuItem, Category } from "../interfaces";

// LocalStorage key to cache and persist modifier groups if the backend doesn't support them yet
const LOCAL_STORAGE_KEY = "resmanager_menu_items";

/**
 * Service for managing menu items, categories, and nested modifier groups.
 * Implements a hybrid approach: syncs with the MySQL backend APIs while maintaining 
 * local persistence for nested modifier groups and offline fallback.
 */
export const menuService = {
  /**
   * Fetch all menu items from backend and merge with local modifier group cache
   */
  async getMenuItems(): Promise<MenuItem[]> {
    try {
      // Backend is mounted on /api/menu (using axios VITE_API_URL base)
      const response = await api.get("/menu");
      const apiItems: MenuItem[] = response.data.data || [];
      
      // Parse items from local storage to merge modifier groups
      const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
      const localItems: MenuItem[] = localData ? JSON.parse(localData) : [];

      return apiItems.map((apiItem) => {
        const localItem = localItems.find((li) => String(li.id) === String(apiItem.id));
        return {
          ...apiItem,
          // Map backend 'available' property back to frontend 'is_active'
          is_active: apiItem.is_active ?? (apiItem as any).available ?? true,
          modifier_groups: localItem?.modifier_groups || [],
          is_deleted: apiItem.is_deleted || localItem?.is_deleted || false,
        };
      });
    } catch (error) {
      console.warn("API error, falling back to localStorage data:", error);
      const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
      return localData ? JSON.parse(localData) : [];
    }
  },

  /**
   * Fetch all categories
   */
  async getCategories(): Promise<Category[]> {
    try {
      const response = await api.get("/categories");
      return response.data.data || [];
    } catch (error) {
      console.warn("Category API error, using fallback defaults:", error);
      return [
        { id: 1, name: "Khai vị", sort_order: 1, is_active: true },
        { id: 2, name: "Món chính", sort_order: 2, is_active: true },
        { id: 3, name: "Lẩu", sort_order: 3, is_active: true },
        { id: 4, name: "Đồ uống", sort_order: 4, is_active: true },
        { id: 5, name: "Tráng miệng", sort_order: 5, is_active: true },
      ];
    }
  },

  /**
   * Create a new menu item along with its nested modifier groups
   */
  async createMenuItem(data: Omit<MenuItem, "id" | "created_at" | "updated_at">): Promise<MenuItem> {
    const tempId = `dish_${Date.now()}`;
    const newItem: MenuItem = {
      ...data,
      id: tempId,
      is_deleted: false,
      created_at: new Date().toISOString(),
    };

    // Cache locally
    const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
    const localItems: MenuItem[] = localData ? JSON.parse(localData) : [];
    localItems.push(newItem);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localItems));

    try {
      const payload = {
        name: data.name,
        description: data.description,
        category: data.category_name || "Món chính", // Matches old DB text category column
        category_id: data.category_id,
        price: data.price,
        image: data.image_url,
        available: data.is_active ? 1 : 0,
        preparationTime: 15,
        modifier_groups: data.modifier_groups, // Sent in case backend schema is extended
      };
      
      const response = await api.post("/menu", payload);
      const created = response.data.data;
      
      // Update local cache with backend assigned ID
      const updatedLocalItems = localItems.map((item) =>
        item.id === tempId ? { ...item, id: created.id } : item
      );
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedLocalItems));

      return {
        ...newItem,
        id: created.id,
      };
    } catch (error) {
      console.warn("Backend creation failed, falling back to local storage:", error);
      return newItem;
    }
  },

  /**
   * Update an existing menu item and its nested modifiers
   */
  async updateMenuItem(id: string | number, data: Partial<MenuItem>): Promise<MenuItem> {
    const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
    const localItems: MenuItem[] = localData ? JSON.parse(localData) : [];
    const index = localItems.findIndex((item) => String(item.id) === String(id));
    
    if (index !== -1) {
      localItems[index] = { ...localItems[index], ...data };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localItems));
    }

    try {
      const payload = {
        name: data.name,
        description: data.description,
        price: data.price,
        image: data.image_url,
        available: data.is_active !== undefined ? (data.is_active ? 1 : 0) : undefined,
        modifier_groups: data.modifier_groups,
      };
      
      const response = await api.patch(`/menu/${id}`, payload);
      return {
        ...localItems[index],
        ...response.data.data,
      };
    } catch (error) {
      console.warn("Backend update failed, using local cache state:", error);
      return localItems[index] || (data as MenuItem);
    }
  },

  /**
   * Toggle availability status
   */
  async toggleMenuItemActive(id: string | number, currentStatus: boolean): Promise<MenuItem> {
    const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
    const localItems: MenuItem[] = localData ? JSON.parse(localData) : [];
    const index = localItems.findIndex((item) => String(item.id) === String(id));
    
    if (index !== -1) {
      localItems[index].is_active = !currentStatus;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localItems));
    }

    try {
      const response = await api.patch(`/menu/${id}/availability`, {
        available: !currentStatus ? 1 : 0,
      });
      return {
        ...localItems[index],
        is_active: Boolean(response.data.data.available),
      };
    } catch (error) {
      console.warn("Backend toggle failed, using local cache state:", error);
      return localItems[index];
    }
  },

  /**
   * CRITICAL: Soft Delete Protocol.
   * Sends a PATCH request to mark is_deleted = 1 and deleted_at.
   */
  async deleteMenuItem(id: string | number): Promise<void> {
    const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
    const localItems: MenuItem[] = localData ? JSON.parse(localData) : [];
    const updatedItems = localItems.map((item) =>
      String(item.id) === String(id)
        ? { ...item, is_deleted: true, deleted_at: new Date().toISOString() }
        : item
    );
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedItems));

    try {
      // Mock API Soft delete sends a PATCH request instead of a DELETE
      await api.patch(`/menu/${id}`, {
        is_deleted: 1,
        deleted_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Backend soft delete failed:", error);
    }
  },
};
