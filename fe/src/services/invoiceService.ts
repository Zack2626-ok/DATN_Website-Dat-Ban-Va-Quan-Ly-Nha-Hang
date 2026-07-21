import api from "./axiosInstance";
import type {
  Invoice,
  PaymentRequest,
  SplitBillEqualRequest,
  SplitBillByItemsRequest,
  MergeBillRequest,
  PaymentRecord,
} from "../interfaces/invoice";

const BASE = "/invoices";

export const getInvoicesApi = async (params?: {
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<Invoice[]> => {
  const response = await api.get(BASE, { params });
  return response.data.data;
};

export const getInvoiceByIdApi = async (id: string): Promise<Invoice> => {
  const response = await api.get(`${BASE}/${id}`);
  return response.data.data;
};

export const processPaymentApi = async (
  invoiceId: string,
  data: PaymentRequest,
): Promise<{ payment: PaymentRecord; order: Invoice }> => {
  const response = await api.post(`${BASE}/${invoiceId}/pay`, data);
  return response.data.data;
};

export const payPartialApi = async (
  invoiceId: string,
  data: PaymentRequest & { amount: number },
): Promise<{ payment: PaymentRecord; totalPaid: number; remaining: number }> => {
  const response = await api.post(`${BASE}/${invoiceId}/pay-partial`, data);
  return response.data.data;
};

export const cancelInvoiceApi = async (
  invoiceId: string,
  reason?: string,
): Promise<void> => {
  await api.patch(`${BASE}/${invoiceId}/cancel`, { reason });
};

export const splitBillEqualApi = async (
  invoiceId: string,
  data: SplitBillEqualRequest,
): Promise<{ originalOrderId: string; splitBills: Invoice[] }> => {
  const response = await api.post(`${BASE}/${invoiceId}/split-equal`, data);
  return response.data.data;
};

export const splitBillByItemsApi = async (
  invoiceId: string,
  data: SplitBillByItemsRequest,
): Promise<{ originalOrderId: string; splitBills: Invoice[] }> => {
  const response = await api.post(`${BASE}/${invoiceId}/split-items`, data);
  return response.data.data;
};

export const mergeBillsApi = async (
  data: MergeBillRequest,
): Promise<{ mergedOrder: Invoice; mergedFrom: string[] }> => {
  const response = await api.post(`${BASE}/merge`, data);
  return response.data.data;
};

export const getInvoicePaymentsApi = async (
  invoiceId: string,
): Promise<PaymentRecord[]> => {
  const response = await api.get(`${BASE}/${invoiceId}/payments`);
  return response.data.data;
};

export const getPaymentHistoryApi = async (params?: {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  paymentMethod?: string;
}): Promise<PaymentRecord[]> => {
  const response = await api.get(`${BASE}/payment-history`, { params });
  return response.data.data;
};
