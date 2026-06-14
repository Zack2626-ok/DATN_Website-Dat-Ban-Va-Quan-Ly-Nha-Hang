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
