import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendSuccess, sendError } from "../utils/response";

async function calculatePayrollInternal(month: number, year: number): Promise<void> {
  // 1. Lấy danh sách nhân viên
  const users = await db.query(`SELECT id, COALESCE(hourly_rate, 25000) AS hourly_rate FROM users WHERE is_deleted = 0`);

  for (const user of users) {
    // 2. Tính tổng số phút làm việc trong tháng cho nhân viên này
    const attendanceRecords = await db.query(`
      SELECT SUM(TIMESTAMPDIFF(MINUTE, clock_in, clock_out)) as total_minutes
      FROM attendance 
      WHERE employee_id = ? 
        AND MONTH(clock_in) = ? 
        AND YEAR(clock_in) = ? 
        AND clock_out IS NOT NULL
    `, [user.id, month, year]);

    const totalMinutes = attendanceRecords[0].total_minutes || 0;

    const totalHours = totalMinutes / 60;
    const hourlyRate = Number(user.hourly_rate) || 25000;
    const totalSalary = Math.round(totalHours * hourlyRate);

    // 3. UPSERT vào bảng payrolls
    // Cập nhật record nếu user_id, month, year đã tồn tại
    const existing = await db.query(`
      SELECT id FROM payrolls 
      WHERE user_id = ? AND month = ? AND year = ?
    `, [user.id, month, year]);

    if (existing.length > 0) {
      // Nếu đã thanh toán rồi thì không tính lại
      const isPaid = await db.query(`SELECT status FROM payrolls WHERE id = ?`, [existing[0].id]);
      if (isPaid[0]?.status !== 'paid') {
        await db.query(`
          UPDATE payrolls 
          SET total_hours = ?, hourly_rate = ?, total_salary = ? 
          WHERE id = ?
        `, [totalHours, hourlyRate, totalSalary, existing[0].id]);
      }
    } else {
      await db.query(`
        INSERT INTO payrolls (user_id, month, year, total_hours, hourly_rate, total_salary, status) 
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `, [user.id, month, year, totalHours, hourlyRate, totalSalary]);
    }
  }
}

export const payrollController = {
  // Tự động tính lương cho 1 tháng cụ thể
  calculatePayroll: async (req: Request, res: Response): Promise<void> => {
    try {
      const { month, year } = req.body;
      if (!month || !year) {
        res.status(400).json({ error: "Month and Year are required." });
        return;
      }
      await calculatePayrollInternal(Number(month), Number(year));
      sendSuccess(res, null, "Tính lương thành công");
    } catch (error) {
      console.error("Error calculating payroll:", error);
      sendError(res, `Lỗi: ${(error as Error).message}`, 500);
    }
  },

  // Lấy danh sách lương
  getPayrolls: async (req: Request, res: Response): Promise<void> => {
    try {
      const now = new Date();
      const monthQuery = req.query.month ? Number(req.query.month) : (now.getMonth() + 1);
      const yearQuery = req.query.year ? Number(req.query.year) : now.getFullYear();

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      // Tự động tính toán lại bảng lương khi lấy dữ liệu
      await calculatePayrollInternal(monthQuery, yearQuery);

      const countResult = await db.query(`
        SELECT COUNT(*) as total 
        FROM payrolls p 
        WHERE p.month = ? AND p.year = ?
      `, [monthQuery, yearQuery]);
      const totalItems = countResult[0].total || 0;
      const totalPages = Math.ceil(totalItems / limit);

      const sql = `
        SELECT p.*, u.full_name, COALESCE(r.name, 'waiter') AS role_name, u.employee_code 
        FROM payrolls p 
        JOIN users u ON p.user_id = u.id 
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE p.month = ? AND p.year = ?
        ORDER BY u.full_name ASC
        LIMIT ? OFFSET ?
      `;

      const payrolls = await db.query(sql, [monthQuery, yearQuery, limit, offset]);
      sendSuccess(res, { currentPage: page, totalPages, totalItems, data: payrolls }, "Tải danh sách bảng lương thành công");
    } catch (error) {
      console.error("Error fetching payrolls:", error);
      sendError(res, `Lỗi: ${(error as Error).message}`, 500);
    }
  },

  // Xác nhận đã chi trả lương
  markAsPaid: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await db.query(`
        UPDATE payrolls 
        SET status = 'paid', paid_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [id]);
      sendSuccess(res, null, "Cập nhật trạng thái thanh toán thành công");
    } catch (error) {
      console.error("Error marking payroll as paid:", error);
      sendError(res, `Lỗi: ${(error as Error).message}`, 500);
    }
  }
};
