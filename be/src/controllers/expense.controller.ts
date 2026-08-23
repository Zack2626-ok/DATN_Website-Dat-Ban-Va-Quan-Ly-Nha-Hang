import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendSuccess, sendError } from "../utils/response";

export const expenseController = {
  // Lấy danh sách chi phí chưa bị xóa
  getExpenses: async (req: Request, res: Response): Promise<void> => {
    try {
      const { month, year } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      let countSql = `SELECT COUNT(*) as total FROM operational_expenses e WHERE e.deleted_at IS NULL`;
      let sql = `
        SELECT e.*, u.full_name as creator_name 
        FROM operational_expenses e 
        LEFT JOIN users u ON e.created_by = u.id 
        WHERE e.deleted_at IS NULL
      `;
      const countParams: any[] = [];
      const params: any[] = [];
      
      if (month && year) {
        const dateCond = ` AND MONTH(e.expense_date) = ? AND YEAR(e.expense_date) = ?`;
        countSql += dateCond;
        sql += dateCond;
        countParams.push(Number(month), Number(year));
        params.push(Number(month), Number(year));
      }

      const countResult = await db.query(countSql, countParams);
      const totalItems = countResult[0].total || 0;
      const totalPages = Math.ceil(totalItems / limit);
      
      sql += ` ORDER BY e.expense_date DESC, e.created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const expenses = await db.query(sql, params);
      sendSuccess(res, { currentPage: page, totalPages, totalItems, data: expenses }, "Tải danh sách chi phí thành công");
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
  },

  // Khôi phục chi phí từ lịch sử xóa
  restoreExpense: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      const checkResult = await db.query(`SELECT id FROM operational_expenses WHERE id = ? AND deleted_at IS NOT NULL`, [id]);
      if ((checkResult as any[]).length === 0) {
        res.status(404).json({ error: "Không tìm thấy chi phí đã xóa" });
        return;
      }

      await db.query(`
        UPDATE operational_expenses 
        SET deleted_at = NULL, deleted_by = NULL, deleted_reason = NULL 
        WHERE id = ?
      `, [id]);
      
      sendSuccess(res, null, "Khôi phục chi phí thành công");
    } catch (error) {
      console.error("Error restoring expense:", error);
      sendError(res, `Lỗi: ${(error as Error).message}`, 500);
    }
  },

  // Xóa vĩnh viễn chi phí (Hard delete)
  permanentDeleteExpense: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      const checkResult = await db.query(`SELECT id FROM operational_expenses WHERE id = ? AND deleted_at IS NOT NULL`, [id]);
      if ((checkResult as any[]).length === 0) {
        res.status(404).json({ error: "Không tìm thấy chi phí đã xóa để xóa vĩnh viễn" });
        return;
      }

      await db.query(`DELETE FROM operational_expenses WHERE id = ?`, [id]);
      
      sendSuccess(res, null, "Đã xóa vĩnh viễn chi phí");
    } catch (error) {
      console.error("Error permanently deleting expense:", error);
      sendError(res, `Lỗi: ${(error as Error).message}`, 500);
    }
  }
};
