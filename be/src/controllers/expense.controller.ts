import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendSuccess, sendError } from "../utils/response";

export const expenseController = {
  // Lấy danh sách chi phí
  getExpenses: async (req: Request, res: Response): Promise<void> => {
    try {
      const { month, year } = req.query;
      let sql = `
        SELECT e.*, u.full_name as creator_name 
        FROM operational_expenses e 
        LEFT JOIN users u ON e.created_by = u.id 
        WHERE 1=1
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

  // Thêm chi phí mới
  createExpense: async (req: Request, res: Response): Promise<void> => {
    try {
      const { title, category, amount, is_recurring, expense_date } = req.body;
      const created_by = (req as any).user?.id || 'admin'; // fallback if no user auth middleware provides it
      
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

  // Xoá chi phí
  deleteExpense: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await db.query(`DELETE FROM operational_expenses WHERE id = ?`, [id]);
      sendSuccess(res, null, "Xoá chi phí thành công");
    } catch (error) {
      console.error("Error deleting expense:", error);
      sendError(res, `Lỗi: ${(error as Error).message}`, 500);
    }
  }
};
