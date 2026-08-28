import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendSuccess, sendError } from "../utils/response";

function getVietnameseHolidayName(date: Date): string | null {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const md = `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const ymd = `${y}-${md}`;

  // Solar calendar holidays
  if (md === "01-01") return "Tết Dương lịch";
  if (md === "04-30") return "Ngày Giải phóng miền Nam (30/4)";
  if (md === "05-01") return "Ngày Quốc tế Lao động (1/5)";
  if (md === "09-02") return "Ngày Quốc khánh (2/9)";
  if (md === "09-03") return "Ngày Quốc khánh (3/9)";

  // Lunar calendar holidays mapped to Solar dates
  const lunarHolidays: { [key: string]: string } = {
    // 2024
    "2024-02-09": "Tết Nguyên Đán (30 Tết)",
    "2024-02-10": "Tết Nguyên Đán (Mùng 1)",
    "2024-02-11": "Tết Nguyên Đán (Mùng 2)",
    "2024-02-12": "Tết Nguyên Đán (Mùng 3)",
    "2024-02-13": "Tết Nguyên Đán (Mùng 4)",
    "2024-02-14": "Tết Nguyên Đán (Mùng 5)",
    "2024-04-18": "Giỗ tổ Hùng Vương (10/3 Âm lịch)",

    // 2025
    "2025-01-28": "Tết Nguyên Đán (30 Tết)",
    "2025-01-29": "Tết Nguyên Đán (Mùng 1)",
    "2025-01-30": "Tết Nguyên Đán (Mùng 2)",
    "2025-01-31": "Tết Nguyên Đán (Mùng 3)",
    "2025-02-01": "Tết Nguyên Đán (Mùng 4)",
    "2025-02-02": "Tết Nguyên Đán (Mùng 5)",
    "2025-04-07": "Giỗ tổ Hùng Vương (10/3 Âm lịch)",

    // 2026
    "2026-02-16": "Tết Nguyên Đán (30 Tết)",
    "2026-02-17": "Tết Nguyên Đán (Mùng 1)",
    "2026-02-18": "Tết Nguyên Đán (Mùng 2)",
    "2026-02-19": "Tết Nguyên Đán (Mùng 3)",
    "2026-02-20": "Tết Nguyên Đán (Mùng 4)",
    "2026-02-21": "Tết Nguyên Đán (Mùng 5)",
    "2026-04-26": "Giỗ tổ Hùng Vương (10/3 Âm lịch)",

    // 2027
    "2027-02-05": "Tết Nguyên Đán (30 Tết)",
    "2027-02-06": "Tết Nguyên Đán (Mùng 1)",
    "2027-02-07": "Tết Nguyên Đán (Mùng 2)",
    "2027-02-08": "Tết Nguyên Đán (Mùng 3)",
    "2027-02-09": "Tết Nguyên Đán (Mùng 4)",
    "2027-02-10": "Tết Nguyên Đán (Mùng 5)",
    "2027-04-16": "Giỗ tổ Hùng Vương (10/3 Âm lịch)"
  };

  return lunarHolidays[ymd] || null;
}

async function calculatePayrollInternal(month: number, year: number): Promise<void> {
  // 1. Lấy danh sách nhân viên active
  const users = await db.query<any[]>(`
    SELECT u.id, COALESCE(u.hourly_rate, 25000) AS hourly_rate 
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.is_deleted = 0 AND (r.name IS NULL OR r.name NOT IN ('admin', 'manager'))
  `);

  const now = new Date();

  for (const user of users) {
    const hourlyRate = Number(user.hourly_rate) || 25000;

    // Kiểm tra xem record bảng lương tháng này đã tạo chưa
    const existing = await db.query<any[]>(`
      SELECT id, status, paid_at FROM payrolls 
      WHERE user_id = ? AND month = ? AND year = ?
    `, [user.id, month, year]);

    if (existing.length > 0 && existing[0].status === "paid") {
      continue;
    }

    // 2. Tính tổng số phút làm việc trong tháng cho nhân viên này
    const attendanceSql = `
      SELECT clock_in, clock_out 
      FROM attendance 
      WHERE employee_id = ? 
        AND MONTH(clock_in) = ? 
        AND YEAR(clock_in) = ?
    `;
    const attendanceRecords = await db.query<any[]>(attendanceSql, [user.id, month, year]);

    let totalMinutes = 0;
    let holidayMinutes = 0;
    for (const record of attendanceRecords) {
      if (!record.clock_in) continue;
      // Không cộng ca đang làm việc (chưa clock-out) vào tổng giờ làm của tháng
      if (!record.clock_out) continue;
      const inTime = new Date(record.clock_in).getTime();
      const outTime = new Date(record.clock_out).getTime();
      const diffMin = (outTime - inTime) / (1000 * 60);
      if (diffMin > 0) {
        totalMinutes += diffMin;
        
        // Kiểm tra xem ca làm việc này có phải ngày lễ Việt Nam không
        const clockInDate = new Date(record.clock_in);
        if (getVietnameseHolidayName(clockInDate) !== null) {
          holidayMinutes += diffMin;
        }
      }
    }

    const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
    
    // Thưởng ngày lễ: Đã bỏ theo yêu cầu
    const holidayBonus = 0;
    const basicSalary = Math.round(totalHours * hourlyRate);
    const totalSalary = basicSalary;

    if (existing.length > 0) {
      // Nếu đã thanh toán rồi thì không tính lại
      const isPaid = await db.query(`SELECT status FROM payrolls WHERE id = ?`, [existing[0].id]);
      if (isPaid[0]?.status !== 'paid') {
        await db.query(`
          UPDATE payrolls 
          SET total_hours = ?, hourly_rate = ?, holiday_bonus = ?, total_salary = ? 
          WHERE id = ?
        `, [totalHours, hourlyRate, holidayBonus, totalSalary, existing[0].id]);
      }
    } else {
      await db.query(`
        INSERT INTO payrolls (user_id, month, year, total_hours, hourly_rate, holiday_bonus, total_salary, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
      `, [user.id, month, year, totalHours, hourlyRate, holidayBonus, totalSalary]);
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
        JOIN users u ON p.user_id = u.id
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE p.month = ? AND p.year = ? AND (r.name IS NULL OR r.name NOT IN ('admin', 'manager'))
      `, [monthQuery, yearQuery]);
      const totalItems = countResult[0].total || 0;
      const totalPages = Math.ceil(totalItems / limit);

      const sql = `
        SELECT p.*, u.full_name, COALESCE(r.name, 'waiter') AS role_name, u.employee_code 
        FROM payrolls p 
        JOIN users u ON p.user_id = u.id 
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE p.month = ? AND p.year = ? AND r.name NOT IN ('admin', 'manager')
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
        WHERE id = ? AND status = 'pending'
      `, [id]);
      sendSuccess(res, null, "Cập nhật trạng thái thanh toán và reset giờ làm thành công!");
    } catch (error) {
      console.error("Error marking payroll as paid:", error);
      sendError(res, `Lỗi: ${(error as Error).message}`, 500);
    }
  }
};
