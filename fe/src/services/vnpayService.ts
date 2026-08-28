import api from "./axiosInstance";

export interface CreateVnPayParams {
  orderId: number | string;
  invoiceId?: number | string;
  vatRate?: number;
  voucherCode?: string;
  voucherAmount?: number;
  pointsUsed?: number;
}

export interface VnPaySessionResponse {
  paymentUrl: string;
  qrUrl: string;
  txnRef: string;
  amount: number;
  orderId: number;
}

/**
 * Gọi API backend để khởi tạo link & mã QR VNPay Sandbox chuẩn chữ ký SHA512
 */
export const initiateVnPayPayment = async (params: CreateVnPayParams): Promise<VnPaySessionResponse> => {
  const response = await api.post("/v1/payments/vnpay/create-url", params);
  if (!response.data.success) {
    throw new Error(response.data.message || "Không thể tạo mã thanh toán VNPay.");
  }
  return response.data.data;
};

/**
 * Gọi API mô phỏng thanh toán thành công VNPay Sandbox
 */
export const simulateVnPayPaymentSuccess = async (params: CreateVnPayParams): Promise<void> => {
  const response = await api.post("/v1/payments/vnpay/simulate", params);
  if (!response.data.success) {
    throw new Error(response.data.message || "Không thể mô phỏng thanh toán VNPay.");
  }
};
