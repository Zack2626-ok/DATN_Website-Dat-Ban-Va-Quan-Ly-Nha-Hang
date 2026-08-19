import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendSuccess, sendError } from "../utils/response";

async function calculatePayrollInternal(month: number, year: number): Promise<void> {
  // 1. Lấy danh sách nhân viên active
  const users = await db.query<any[]>(`SELECT id, COALESCE(hourly_rate, 25000) AS hourly_rate FROM users WHERE is_deleted = 0`);

  const now = new Date();

  for (const user of users) {
    const hourlyRate = Number(user.hourly_rate) || 25000;

    // Kiểm tra xem record bảng lương tháng này đã tạo chưa
    const existing = await db.query<any[]>(`
      SELECT id, status, paid_at FROM payrolls 
      WHERE user_id = ? AND month = ? AND year = ?
    `, [user.id, month, year]);

    if (existing.length > 0 && existing[0].status === "paid") {
      // Khi đã thanh toán -> Reset số giờ làm và tổng lương về 0.0 theo yêu cầu
      await db.query(`
        UPDATE payrolls 
        SET total_hours = 0, total_salary = 0 
        WHERE id = ?
      `, [existing[0].id]);
      continue;
    }

    // Lấy thời điểm thanh toán gần nhất (nếu có)
    const paidRecords = await db.query<any[]>(
      `SELECT paid_at FROM payrolls WHERE user_id = ? AND status = 'paid' ORDER BY paid_at DESC LIMIT 1`,
      [user.id]
    );
    const lastPaidAt = paidRecords.length > 0 && paidRecords[0].paid_at ? new Date(paidRecords[0].paid_at) : null;

    // 2. Tính tổng số phút làm việc trong tháng cho nhân viên này (bao gồm ca đang diễn ra clock_out IS NULL)
    let attendanceSql = `
      SELECT clock_in, clock_out 
      FROM attendance 
      WHERE employee_id = ? 
        AND MONTH(clock_in) = ? 
        AND YEAR(clock_in) = ?
    `;
    const sqlParams: any[] = [user.id, month, year];

    if (lastPaidAt) {
      attendanceSql += ` AND clock_in >= ?`;
      sqlParams.push(lastPaidAt);
    }

    const attendanceRecords = await db.query<any[]>(attendanceSql, sqlParams);

    let totalMinutes = 0;
    for (const record of attendanceRecords) {
      if (!record.clock_in) continue;
      const inTime = new Date(record.clock_in).getTime();
      const outTime = record.clock_out ? new Date(record.clock_out).getTime() : now.getTime();
      const diffMin = (outTime - inTime) / (1000 * 60);
      if (diffMin > 0) totalMinutes += diffMin;
    }

    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    const totalSalary = Math.round(totalHours * hourlyRate);

    if (existing.length > 0) {
      await db.query(`
        UPDATE payrolls 
        SET total_hours = ?, hourly_rate = ?, total_salary = ? 
        WHERE id = ?
      `, [totalHours, hourlyRate, totalSalary, existing[0].id]);
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

      // Tự động tính toán lại bảng lương khi lấy dữ liệu
      await calculatePayrollInternal(monthQuery, yearQuery);

      const sql = `
        SELECT p.*, u.full_name, COALESCE(r.name, 'waiter') AS role_name, u.employee_code 
        FROM payrolls p 
        JOIN users u ON p.user_id = u.id 
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE p.month = ? AND p.year = ?
        ORDER BY u.full_name ASC
      `;

      const payrolls = await db.query(sql, [monthQuery, yearQuery]);
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
        SET status = 'paid', paid_at = CURRENT_TIMESTAMP, total_hours = 0, total_salary = 0 
        WHERE id = ?
      `, [id]);
      sendSuccess(res, null, "Cập nhật trạng thái thanh toán và reset giờ làm thành công!");
    } catch (error) {
      console.error("Error marking payroll as paid:", error);
      sendError(res, `Lỗi: ${(error as Error).message}`, 500);
    }
  }
};
