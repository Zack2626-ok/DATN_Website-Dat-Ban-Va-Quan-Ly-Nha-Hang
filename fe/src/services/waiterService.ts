import api from "./axiosInstance";

export interface WaiterMenuItem {
  id: number;
  category_id: number;
  category_name: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  kitchen_station: "hot_kitchen" | "bar" | "cold_kitchen";
  is_featured: number;
  is_active: number;
}

export interface WaiterCategory {
  id: number;
  name: string;
  sort_order: number;
  is_active: number;
}

export interface WaiterOrderItem {
  id: number;
  order_id: number;
  menu_item_id: number;
  item_name: string;
  image_url?: string;
  quantity: number;
  unit_price: number;
  seat_number?: number | null;
  course_number: number;
  kitchen_note?: string;
  status: "pending" | "cooking" | "done" | "cancelled" | "voided";
  voided_at?: string | null;
  void_reason?: string | null;
  created_at: string;
}

export interface WaiterOrder {
  id: number;
  table_id?: number | null;
  customer_id?: number | null;
  created_by: number;
  waiter_name?: string;
  order_type: "dine_in" | "takeaway" | "delivery";
  split_label?: string | null;
  status: "open" | "serving" | "pending_payment" | "completed" | "cancelled";
  note?: string;
  created_at: string;
  closed_at?: string | null;
}

export const getWaiterMenuItems = async (categoryId?: number): Promise<WaiterMenuItem[]> => {
  const url = categoryId ? `/v1/waiter/menu?category_id=${categoryId}` : "/v1/waiter/menu";
  const response = await api.get(url);
  return response.data.data || [];
};

export const getWaiterCategories = async (): Promise<WaiterCategory[]> => {
  const response = await api.get("/v1/waiter/categories");
  return response.data.data || [];
};

export const getOrdersByTable = async (tableId: number): Promise<WaiterOrder[]> => {
  const response = await api.get(`/v1/waiter/orders/by-table/${tableId}`);
  return response.data.data || [];
};

export const getOrderItems = async (orderId: number): Promise<WaiterOrderItem[]> => {
  const response = await api.get(`/v1/waiter/orders/${orderId}/items`);
  return response.data.data || [];
};

export const createOrder = async (data: {
  table_id?: number | null;
  customer_id?: number | null;
  created_by: number;
  order_type?: "dine_in" | "takeaway" | "delivery";
  note?: string;
  guest_name?: string;
  guest_phone?: string;
  guest_count?: number;
}): Promise<WaiterOrder> => {
  const response = await api.post("/v1/waiter/orders", data);
  return response.data.data;
};

export const addOrderItem = async (
  orderId: number,
  data: {
    menu_item_id: number;
    quantity: number;
    unit_price: number;
    seat_number?: number | null;
    course_number?: number;
    kitchen_note?: string;
  },
): Promise<WaiterOrderItem> => {
  const response = await api.post(`/v1/waiter/orders/${orderId}/items`, data);
  return response.data.data;
};

export const voidOrderItem = async (orderId: number, itemId: number, reason: string): Promise<void> => {
  await api.patch(`/v1/waiter/orders/${orderId}/items/${itemId}/void`, { reason });
};

export const sendItemsToKitchen = async (orderId: number, itemIds: number[]): Promise<void> => {
  await api.post(`/v1/waiter/orders/${orderId}/send-to-kitchen`, { item_ids: itemIds });
};
