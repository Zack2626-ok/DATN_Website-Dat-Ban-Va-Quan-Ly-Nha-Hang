import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendSuccess, sendError } from "../utils/response";

export const expenseController = {
  // Lấy danh sách chi phí chưa bị xóa
  getExpenses: async (req: Request, res: Response): Promise<void> => {
    try {
      const { month, year } = req.query;
      let sql = `
        SELECT e.*, u.full_name as creator_name 
        FROM operational_expenses e 
        LEFT JOIN users u ON e.created_by = u.id 
        WHERE e.deleted_at IS NULL
      `;
      const params: any[] = [];
      
      if (month && year) {
        sql += ` AND MONTH(e.expense_date) = ? AND YEAR(e.expense_date) = ?`;
        params.push(Number(month), Number(year));
      }
      
      sql += ` ORDER BY e.expense_date DESC, e.created_at DESC`;

      const expenses = await db.query(sql, params);
      sendSuccess(res, expenses, "Tải danh sách chi phí thành công");
    } catch (error) {
      console.error("Error fetching expenses:", error);
      sendError(res, `Lỗi: ${(error as Error).message}`, 500);
    }
  },

  // Lấy danh sách chi phí đã bị xóa (Lịch sử xóa)
  getDeletedExpenses: async (req: Request, res: Response): Promise<void> => {
    try {
      let sql = `
        SELECT e.*, u.full_name as creator_name, d.full_name as deleted_by_name
        FROM operational_expenses e 
        LEFT JOIN users u ON e.created_by = u.id 
        LEFT JOIN users d ON e.deleted_by = d.id
        WHERE e.deleted_at IS NOT NULL
        ORDER BY e.deleted_at DESC
      `;
      const expenses = await db.query(sql);
      sendSuccess(res, expenses, "Tải lịch sử xóa thành công");
    } catch (error) {
      console.error("Error fetching deleted expenses:", error);
      sendError(res, `Lỗi: ${(error as Error).message}`, 500);
    }
  },

  // Thêm chi phí mới
  createExpense: async (req: Request, res: Response): Promise<void> => {
    try {
      const { title, category, amount, is_recurring, expense_date } = req.body;
      const rawUserId = (req as any).user?.id;
      const created_by = rawUserId && !isNaN(Number(rawUserId)) ? Number(rawUserId) : null;
      
      if (!title || !category || !amount || !expense_date) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      await db.query(`
        INSERT INTO operational_expenses (title, category, amount, is_recurring, expense_date, created_by) 
        VALUES (?, ?, ?, ?, ?, ?)
      `, [title, category, amount, is_recurring ? 1 : 0, expense_date, created_by]);

      sendSuccess(res, null, "Thêm chi phí thành công");
    } catch (error) {
      console.error("Error creating expense:", error);
      sendError(res, `Lỗi: ${(error as Error).message}`, 500);
    }
  },

  // Nhập chi phí hàng loạt từ Excel
  importExpenses: async (req: Request, res: Response): Promise<void> => {
    try {
      const { expenses } = req.body; // Array of expenses
      const rawUserId = (req as any).user?.id;
      const created_by = rawUserId && !isNaN(Number(rawUserId)) ? Number(rawUserId) : null;
      
      if (!Array.isArray(expenses) || expenses.length === 0) {
        res.status(400).json({ error: "Không có dữ liệu hợp lệ để nhập" });
        return;
      }

      for (const expense of expenses) {
        const { title, category, amount, expense_date } = expense;
        if (title && category && amount && expense_date) {
          await db.query(`
            INSERT INTO operational_expenses (title, category, amount, is_recurring, expense_date, created_by) 
            VALUES (?, ?, ?, ?, ?, ?)
          `, [title, category, amount, 0, expense_date, created_by]);
        }
      }

      sendSuccess(res, null, `Nhập thành công ${expenses.length} khoản chi`);
    } catch (error) {
      console.error("Error importing expenses:", error);
      sendError(res, `Lỗi: ${(error as Error).message}`, 500);
    }
  },

  // Xóa mềm chi phí (Soft Delete)
  deleteExpense: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const rawUserId = (req as any).user?.id;
      const deleted_by = rawUserId && !isNaN(Number(rawUserId)) ? Number(rawUserId) : null;

      if (!reason) {
        res.status(400).json({ error: "Vui lòng nhập lý do xóa" });
        return;
      }

      await db.query(
        `UPDATE operational_expenses SET deleted_at = NOW(), deleted_by = ?, deleted_reason = ? WHERE id = ?`, 
        [deleted_by, reason, id]
      );
      
      sendSuccess(res, null, "Xoá chi phí thành công (đã đưa vào lịch sử)");
    } catch (error) {
      console.error("Error deleting expense:", error);
      sendError(res, `Lỗi: ${(error as Error).message}`, 500);
    }
  }
};
