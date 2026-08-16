import jwt from "jsonwebtoken";

const QR_SECRET = process.env.QR_SECRET || "resmanager-secret-qr-key-2024";

export interface SessionPayload {
  tableId: number | string;
  sessionId: string;
}

export const qrUtils = {
  // Tạo JWT token cho một phiên (Session) của bàn
  generateSessionToken: (tableId: number | string, sessionId: string, expiresIn: any = "4h"): string => {
    return jwt.sign(
      { tableId, sessionId },
      QR_SECRET,
      { expiresIn }
    );
  },

  // Xác thực token lấy từ QR Code
  verifySessionToken: (token: string): SessionPayload | null => {
    try {
      const decoded = jwt.verify(token, QR_SECRET) as SessionPayload;
      return decoded;
    } catch (err) {
      console.error("Invalid QR Token:", err);
      return null;
    }
  },

  // Tạo URL QR Code đầy đủ
  // FE_URL là đường dẫn đến web client của bạn
  generateQRCodeUrl: (tableId: number | string, token: string): string => {
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    return `${baseUrl}/order?table_id=${tableId}&token=${token}`;
  }
};
