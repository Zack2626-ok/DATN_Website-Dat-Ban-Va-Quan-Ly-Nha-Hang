import api from "./axiosInstance";

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface BankTransferPaymentSession {
  paymentId: number;
  invoiceId: number;
  amount: number;
  paymentReference: string;
  expiresAt: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  qrUrl: string;
  demoModeEnabled: boolean;
}

export interface BankTransferDemoResult {
  status: "completed" | "duplicate" | "expired" | "not_found" | "amount_mismatch" | "already_paid";
  invoiceId?: number;
  tableId?: number;
  amount?: number;
}

/** Tạo một phiên chuyển khoản chờ webhook và nhận URL VietQR động. */
export const initiateBankTransferPayment = async (
  orderId: string | number,
): Promise<BankTransferPaymentSession> => {
  const response = await api.post<ApiResponse<BankTransferPaymentSession>>(
    "/v1/payments/bank-transfer/initiate",
    { orderId },
  );

  if (!response.data.success) {
    throw new Error(response.data.message || "Không thể tạo mã QR chuyển khoản.");
  }

  return response.data.data;
};

/** Mô phỏng tiền chuyển khoản về tài khoản khi backend đang bật chế độ demo local. */
export const simulateBankTransferPayment = async (
  paymentId: number,
): Promise<BankTransferDemoResult> => {
  const response = await api.post<ApiResponse<BankTransferDemoResult>>(
    `/v1/payments/bank-transfer/${paymentId}/simulate`,
  );

  if (!response.data.success) {
    throw new Error(response.data.message || "Không thể mô phỏng tiền về.");
  }

  return response.data.data;
};
