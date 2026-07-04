import type { Hall, EventPackage } from "../interfaces";
import api from "../../../../services/axiosInstance";

/**
 * EventConfigService - Quản lý API cho Sảnh Tiệc (Halls) và Gói Set Menu (Event Packages)
 */
export const eventConfigService = {
  // ===== Sảnh Tiệc (Halls) =====
  getHalls: async (): Promise<{ data: Hall[] }> => {
    const response = await api.get("/events/halls");
    return { data: response.data.data || [] };
  },

  createHall: async (hallData: Omit<Hall, "id" | "is_active">): Promise<{ data: Hall }> => {
    const response = await api.post("/events/halls/create", hallData);
    return { data: response.data.data };
  },

  updateHall: async (id: number | string, hallData: Partial<Omit<Hall, "id">>): Promise<{ data: Hall }> => {
    const response = await api.patch(`/events/halls/${id}/update`, hallData);
    return { data: response.data.data };
  },

  toggleHallActive: async (id: number | string, is_active: number): Promise<{ data: boolean }> => {
    const response = await api.patch(`/events/halls/${id}/toggle`, { is_active });
    return { data: response.data.success };
  },

  // ===== Gói Set Menu Tiệc (Event Packages) =====
  getEventPackages: async (): Promise<{ data: EventPackage[] }> => {
    const response = await api.get("/events/packages");
    return { data: response.data.data || [] };
  },

  createEventPackage: async (
    pkgData: Omit<EventPackage, "id" | "is_active" | "items"> & { items: { menu_item_id: number; quantity: number }[] }
  ): Promise<{ data: EventPackage }> => {
    const response = await api.post("/events/packages/create", pkgData);
    return { data: response.data.data };
  },

  updateEventPackage: async (
    id: number | string,
    pkgData: Partial<Omit<EventPackage, "id" | "is_active" | "items">> & { items?: { menu_item_id: number; quantity: number }[] }
  ): Promise<{ data: EventPackage }> => {
    const response = await api.patch(`/events/packages/${id}/update`, pkgData);
    return { data: response.data.data };
  },

  togglePackageActive: async (id: number | string, is_active: number): Promise<{ data: boolean }> => {
    const response = await api.patch(`/events/packages/${id}/toggle`, { is_active });
    return { data: response.data.success };
  },
};
export default eventConfigService;
