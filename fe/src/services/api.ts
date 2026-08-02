import axiosInstance from "./axiosInstance";
import type { Order } from "../interfaces";

const api = axiosInstance;

/**
 * Send a new order to the backend database
 */
export const createOrderApi = async (orderData: Omit<Order, "createdAt">): Promise<Order & { receiptUrl?: string }> => {
  const response = await api.post("/orders", orderData);
  return response.data.data;
};

/**
 * Fetch all orders from the backend
 */
export const getOrdersApi = async (): Promise<Order[]> => {
  const response = await api.get("/orders");
  return response.data.data;
};

/**
 * Update the status of an order in the database
 */
export const updateOrderStatusApi = async (id: string, status: string): Promise<{ id: string; status: string }> => {
  const response = await api.patch(`/orders/${id}/status`, { status });
  return response.data.data;
};

/**
 * Fetch all active KDS items, optionally filtered by kitchen station
 */
export const getKdsItemsApi = async (station?: string): Promise<any[]> => {
  const response = await api.get("/kds/items", { params: { station } });
  return response.data.data;
};

/**
 * Update the status of an individual KDS item
 */
export const updateKdsItemStatusApi = async (id: string | number, status: string): Promise<any> => {
  const response = await api.patch(`/kds/items/${id}/status`, { status });
  return response.data.data;
};

/**
 * Update the status of multiple KDS items (Batch Cooking)
 */
export const updateKdsBatchStatusApi = async (itemIds: (string | number)[], status: string): Promise<any> => {
  const response = await api.patch("/kds/batch/status", { itemIds, status });
  return response.data.data;
};

/**
 * Recall/Undo the last status change of an item
 */
export const recallKdsItemStatusApi = async (id: string | number): Promise<any> => {
  const response = await api.post(`/kds/items/${id}/recall`);
  return response.data.data;
};

/**
 * Fetch active void/cancellation alerts for KDS
 */
export const getKdsVoidAlertsApi = async (): Promise<any[]> => {
  const response = await api.get("/kds/void-alerts");
  return response.data.data;
};

/**
 * Fetch notifications, optionally filtered by user role
 */
export const getNotificationsApi = async (role?: string): Promise<any[]> => {
  const response = await api.get("/notifications", { params: { role } });
  return response.data.data;
};

/**
 * Mark a notification as read
 */
export const markNotificationAsReadApi = async (id: number): Promise<any> => {
  const response = await api.patch(`/notifications/${id}/read`);
  return response.data.data;
};

/**
 * Clear all notifications (mark as read)
 */
export const clearNotificationsApi = async (role?: string): Promise<any> => {
  const response = await api.post("/notifications/clear", { role });
  return response.data.data;
};

/**
 * Fetch KDS history of completed and returned items
 */
export const getKdsHistoryApi = async (date?: string): Promise<any[]> => {
  const response = await api.get("/kds/history", { params: { date } });
  return response.data.data;
};

/**
 * Fetch all real ingredients from backend
 */
export const getIngredientsApi = async (): Promise<any[]> => {
  const response = await api.get("/inventory/ingredients");
  return response.data.data;
};

export const createIngredientApi = async (data: any): Promise<any> => {
  const response = await api.post("/inventory", data);
  return response.data.data;
};

export const updateIngredientApi = async (id: string | number, data: any): Promise<any> => {
  const response = await api.put(`/inventory/${id}`, data);
  return response.data.data;
};

export const deleteIngredientApi = async (id: string | number): Promise<any> => {
  const response = await api.delete(`/inventory/${id}`);
  return response.data.data;
};

export const updateInventoryQuantityApi = async (id: string | number, payloadOrQuantity: any, type?: "import" | "export" | "adjust", reasonOrSupplier?: string): Promise<any> => {
  let payload;
  if (typeof payloadOrQuantity === 'object') {
    payload = payloadOrQuantity;
  } else {
    payload = { quantity: payloadOrQuantity, type, reasonOrSupplier };
  }
  const response = await api.patch(`/inventory/${id}/quantity`, payload);
  return response.data.data;
};

export const getIngredientBatchesApi = async (id: string | number): Promise<any[]> => {
  const response = await api.get(`/inventory/${id}/batches`);
  return response.data.data;
};

export const wasteExpiredBatchesApi = async (): Promise<any> => {
  const response = await api.post(`/inventory/waste-expired`);
  return response.data.data;
};

export const paySupplierDebtApi = async (id: string, data: { amount: number; note: string; paymentMethod: string }): Promise<any> => {
  const response = await api.patch(`/inventory/suppliers/${id}/pay`, data);
  return response.data.data;
};

/**
 * Fetch real inventory transactions from backend
 */
export const getInventoryTransactionsApi = async (): Promise<any[]> => {
  const response = await api.get("/inventory/transactions");
  return response.data.data;
};

export const uploadInventoryExcelApi = async (file: File): Promise<any> => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post("/inventory/upload-excel", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const getSuppliersApi = async (): Promise<any[]> => {
  const response = await api.get("/inventory/suppliers");
  return response.data.data;
};

export const addSupplierApi = async (data: any): Promise<any> => {
  const response = await api.post("/inventory/suppliers", data);
  return response.data.data;
};

export const updateSupplierApi = async (id: string | number, data: any): Promise<any> => {
  const response = await api.put(`/inventory/suppliers/${id}`, data);
  return response.data.data;
};

export const deleteSupplierApi = async (id: string | number): Promise<any> => {
  const response = await api.delete(`/inventory/suppliers/${id}`);
  return response.data.data;
};
