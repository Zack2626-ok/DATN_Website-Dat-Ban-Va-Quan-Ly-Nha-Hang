import { Request, Response } from "express";
import { query } from "../utils/db";
import { qrUtils } from "../utils/qr";
import { cartUtils } from "../utils/memoryStore";
import { v4 as uuidv4 } from "uuid";

export const sessionController = {
  // POS: Mở phiên bàn & tạo QR mới (Task 2.1.2)
  openTableSession: async (req: Request, res: Response): Promise<void> => {
    try {
      const { tableId } = req.body;
      if (!tableId) {
        res.status(400).json({ error: "Missing tableId" });
        return;
      }

      // Đóng các session cũ của bàn này
      await query(`UPDATE table_sessions SET status = 'closed', end_time = CURRENT_TIMESTAMP WHERE table_id = ? AND status = 'active'`, [tableId]);

      // Tạo session mới
      const sessionId = uuidv4();
      const token = qrUtils.generateSessionToken(tableId, sessionId);
      
      await query(
        `INSERT INTO table_sessions (id, table_id, session_token, status) VALUES (?, ?, ?, 'active')`,
        [sessionId, tableId, token]
      );

      // Cập nhật trạng thái bàn thành reserved hoặc serving
      await query(`UPDATE tables SET status = 'serving' WHERE id = ?`, [tableId]);

      const qrUrl = qrUtils.generateQRCodeUrl(tableId, token);

      res.status(200).json({
        message: "Table session created successfully",
        sessionId,
        token,
        qrUrl
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create table session" });
    }
  },

  // CLIENT: Xác thực QR & Lấy thông tin phiên (Task 2.1.1)
  verifySession: async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.body;
      if (!token) {
        res.status(400).json({ error: "Token is required" });
        return;
      }

      const decoded = qrUtils.verifySessionToken(token);
      if (!decoded) {
        res.status(401).json({ error: "Invalid or expired token" });
        return;
      }

      // Kiểm tra trong DB xem session còn active không
      const sessions = await query<any[]>(`SELECT * FROM table_sessions WHERE id = ? AND status = 'active'`, [decoded.sessionId]);
      if (sessions.length === 0) {
        res.status(403).json({ error: "Session is closed or not found" });
        return;
      }

      // Lấy giỏ hàng từ Redis
      const cart = await cartUtils.getCart(decoded.sessionId);

      res.status(200).json({
        message: "Session is valid",
        session: decoded,
        cart
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error during verification" });
    }
  },

  // POS: Đóng phiên bàn (khi thanh toán xong) (Task 2.1.3)
  closeTableSession: async (req: Request, res: Response): Promise<void> => {
    try {
      const { tableId } = req.body;
      if (!tableId) {
        res.status(400).json({ error: "Missing tableId" });
        return;
      }

      const sessions = await query<any[]>(`SELECT * FROM table_sessions WHERE table_id = ? AND status = 'active'`, [tableId]);
      
      for (const session of sessions) {
        // Cập nhật DB
        await query(`UPDATE table_sessions SET status = 'closed', end_time = CURRENT_TIMESTAMP WHERE id = ?`, [session.id]);
        
        // Xóa giỏ hàng trong Redis
        await cartUtils.clearCart(session.id);
      }

      // Cập nhật bàn về trạng thái empty
      await query(`UPDATE tables SET status = 'empty' WHERE id = ?`, [tableId]);

      res.status(200).json({ message: "Table session closed successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to close session" });
    }
  }
};
