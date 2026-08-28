import { VNPay, ignoreLogger, ProductCode, VnpLocale, dateFormat, HashAlgorithm } from "vnpay";

// Cấu hình Sandbox mặc định
const VNPAY_TMN_CODE = process.env.VNPAY_TMN_CODE || "64DFOLZV";
const VNPAY_SECURE_SECRET = process.env.VNPAY_SECURE_SECRET || "O6J4Z89F24EL7WDPFXJEJBX47AGBLQVO";
const VNPAY_HOST = process.env.VNPAY_HOST || "https://sandbox.vnpayment.vn";

export const vnpayInstance = new VNPay({
  tmnCode: VNPAY_TMN_CODE,
  secureSecret: VNPAY_SECURE_SECRET,
  vnpayHost: VNPAY_HOST,
  testMode: true,
  hashAlgorithm: HashAlgorithm.SHA512,
  loggerFn: ignoreLogger,
});

export interface CreateVnPayUrlParams {
  orderId: number | string;
  amount: number; // Đơn vị VNĐ (VD: 150000)
  orderInfo?: string;
  ipAddr?: string;
  returnUrl: string;
}

/**
 * Xây dựng URL thanh toán VNPay Sandbox có chữ ký SHA512
 */
export const buildVnPayPaymentUrl = (params: CreateVnPayUrlParams): { paymentUrl: string; txnRef: string } => {
  const { orderId, amount, orderInfo, ipAddr = "127.0.0.1", returnUrl } = params;

  const now = new Date();
  const timestamp = now.getTime();
  const txnRef = `INV${orderId}_${timestamp}`;

  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const paymentUrl = vnpayInstance.buildPaymentUrl({
    vnp_Amount: Math.round(amount), // vnpay package tự nhân 100
    vnp_IpAddr: ipAddr,
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo || `Thanh toan hoa don #${orderId}`,
    vnp_OrderType: ProductCode.Other,
    vnp_ReturnUrl: returnUrl,
    vnp_Locale: VnpLocale.VN,
    vnp_CreateDate: dateFormat(now),
    vnp_ExpireDate: dateFormat(tomorrow),
  });

  return { paymentUrl, txnRef };
};

/**
 * Xác thực dữ liệu callback/return URL từ VNPay
 */
export const verifyVnPayReturn = (query: any): { isSuccess: boolean; isVerified: boolean; message: string } => {
  try {
    const verifyResult = vnpayInstance.verifyReturnUrl(query);
    return {
      isVerified: verifyResult.isVerified,
      isSuccess: verifyResult.isSuccess && query.vnp_ResponseCode === "00",
      message: verifyResult.isSuccess ? "Thanh toán thành công" : "Thanh toán không thành công",
    };
  } catch (error) {
    return {
      isVerified: false,
      isSuccess: false,
      message: (error as Error).message || "Lỗi xác thực VNPay",
    };
  }
};
