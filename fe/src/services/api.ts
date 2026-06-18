import axios from "axios";
import type { Order } from "../interfaces";

const API_BASE_URL = "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

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

