import api from "./axiosInstance";

export const createPaymentApi = async (data: {
  orderId: string;
  amount: number;
  paymentMethod: string;
  discountAmount?: number;
  discountReason?: string;
  notes?: string;
  status?: string;
  completedAt?: string;
}) => {
  const response = await api.post("/payments", data);
  return response.data.data;
};

export const getPaymentsByOrderApi = async (orderId: string) => {
  const response = await api.get(`/payments/order/${orderId}`);
  return response.data.data;
};

export default {
  createPaymentApi,
  getPaymentsByOrderApi,
};
