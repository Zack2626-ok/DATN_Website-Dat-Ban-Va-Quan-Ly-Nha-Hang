import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendSuccess, sendError } from "../utils/response";

export const payrollController = {
  // Tự động tính lương cho 1 tháng cụ thể
  calculatePayroll: async (req: Request, res: Response): Promise<void> => {
    try {
      const { month, year } = req.body;
      if (!month || !year) {
        res.status(400).json({ error: "Month and Year are required." });
        return;
      }

      // 1. Lấy danh sách nhân viên
      const users = await db.query(`SELECT id, COALESCE(hourly_rate, 25000) AS hourly_rate FROM users WHERE is_deleted = 0`);

      for (const user of users) {
        // 2. Tính tổng số phút làm việc trong tháng cho nhân viên này
        const attendanceRecords = await db.query(`
          SELECT clock_in, clock_out 
          FROM attendance 
          WHERE employee_id = ? 
            AND MONTH(clock_in) = ? 
            AND YEAR(clock_in) = ? 
            AND clock_out IS NOT NULL
        `, [user.id, month, year]);

        let totalMinutes = 0;
        for (const record of attendanceRecords) {
          const inTime = new Date(record.clock_in).getTime();
          const outTime = new Date(record.clock_out).getTime();
          const diffMin = (outTime - inTime) / (1000 * 60);
          if (diffMin > 0) totalMinutes += diffMin;
        }

        const totalHours = totalMinutes / 60;
        const hourlyRate = Number(user.hourly_rate) || 25000;
        const totalSalary = totalHours * hourlyRate;

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

      sendSuccess(res, null, "Tính lương thành công");
    } catch (error) {
      console.error("Error calculating payroll:", error);
      sendError(res, `Lỗi: ${(error as Error).message}`, 500);
    }
  },

  // Lấy danh sách lương
  getPayrolls: async (req: Request, res: Response): Promise<void> => {
    try {
      const { month, year } = req.query;
      let sql = `
        SELECT p.*, u.full_name, COALESCE(r.name, 'waiter') AS role_name, u.employee_code 
        FROM payrolls p 
        JOIN users u ON p.user_id = u.id 
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE 1=1
      `;
      const params: any[] = [];
      if (month) {
        sql += ` AND p.month = ?`;
        params.push(Number(month));
      }
      if (year) {
        sql += ` AND p.year = ?`;
        params.push(Number(year));
      }
      sql += ` ORDER BY p.year DESC, p.month DESC, u.full_name ASC`;

      const payrolls = await db.query(sql, params);
      sendSuccess(res, payrolls, "Tải danh sách bảng lương thành công");
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
