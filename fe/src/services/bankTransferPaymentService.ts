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
}

/** Tạo một phiên chuyển khoản chờ webhook và nhận URL VietQR động. */
export const initiateBankTransferPayment = async (
  invoiceId: string | number,
): Promise<BankTransferPaymentSession> => {
  const response = await api.post<ApiResponse<BankTransferPaymentSession>>(
    "/v1/payments/bank-transfer/initiate",
    { invoiceId },
  );

  if (!response.data.success) {
    throw new Error(response.data.message || "Không thể tạo mã QR chuyển khoản.");
  }

  return response.data.data;
};
