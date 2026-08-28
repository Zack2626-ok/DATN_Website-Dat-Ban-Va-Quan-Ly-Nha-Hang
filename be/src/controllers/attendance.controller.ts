import { Request, Response } from "express";
import * as db from "../utils/db";
import type { AttendanceTimingMetadata } from "../middlewares/attendanceSchedule.middleware";
import { sendSuccess, sendError } from "../utils/response";

const MANAGE_ATTENDANCE_ROLES = ["admin", "manager"];

/** Validates and returns the staff member selected for a manager attendance action. */
const getRequestedEmployeeId = (employeeId: unknown): number | null => {
  const parsedEmployeeId = Number(employeeId);
  return Number.isInteger(parsedEmployeeId) && parsedEmployeeId > 0 ? parsedEmployeeId : null;
};

/** Lists attendance records for authorized managers. */
export const getAllAttendance = async (_req: Request, res: Response): Promise<void> => {
  try {
    const attendance = await db.getAllAttendance();
    sendSuccess(res, attendance, "Lấy danh sách chấm công thành công.");
  } catch (error) {
    console.error("Error in getAllAttendance:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

/** Lists active staff members for an authorized manager's attendance terminal. */
export const getAttendanceEmployees = async (_req: Request, res: Response): Promise<void> => {
  try {
    const employees = await db.getAttendanceEmployees();
    sendSuccess(res, employees, "Lấy danh sách nhân viên thành công.");
  } catch (error) {
    console.error("Error in getAttendanceEmployees:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getMyAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, "Không tìm thấy thông tin nhân viên.", 401);
      return;
    }
    const attendance = await db.getTodayAttendance(Number(userId));
    sendSuccess(res, attendance, "Lấy thông tin chấm công thành công.");
  } catch (error) {
    console.error("Error in getMyAttendance:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const clockIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, "Không tìm thấy thông tin nhân viên.", 401);
      return;
    }
    const existing = await db.getTodayAttendance(Number(userId));
    if (existing && !existing.clock_out) {
      sendError(res, "Bạn đã chấm công vào rồi. Không thể chấm công lại.", 400);
      return;
    }
    const timing = res.locals.attendanceTiming as AttendanceTimingMetadata | undefined;
    const attendance = await db.clockInEmployee(Number(userId), timing);
    const io = req.app.get("io");
    if (io) {
      io.emit("system:attendance_changed", { employeeId: userId, action: "clock-in" });
    }
    sendSuccess(res, attendance, "Chấm công vào thành công!");
  } catch (error) {
    console.error("Error in clockIn:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const clockOut = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, "Không tìm thấy thông tin nhân viên.", 401);
      return;
    }
    const existing = await db.getTodayAttendance(Number(userId));
    if (!existing || existing.clock_out) {
      sendError(res, "Bạn chưa chấm công vào hoặc đã chấm công ra rồi.", 400);
      return;
    }
    const timing = res.locals.attendanceTiming as AttendanceTimingMetadata | undefined;
    const attendance = await db.clockOutEmployee(Number(userId), timing);
    const io = req.app.get("io");
    if (io) {
      io.emit("system:attendance_changed", { employeeId: userId, action: "clock-out" });
    }
    sendSuccess(res, attendance, "Chấm công ra thành công!");
  } catch (error) {
    console.error("Error in clockOut:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

/** Records clock-in for a staff member selected at the manager attendance terminal. */
export const clockInEmployeeByManager = async (req: Request, res: Response): Promise<void> => {
  try {
    const employeeId = getRequestedEmployeeId(req.body.employee_id);
    if (!employeeId) {
      sendError(res, "Nhân viên không hợp lệ.", 400);
      return;
    }
    const existing = await db.getTodayAttendance(employeeId);
    if (existing && !existing.clock_out) {
      sendError(res, "Nhân viên này đã chấm công vào.", 400);
      return;
    }
    const timing = res.locals.attendanceTiming as AttendanceTimingMetadata | undefined;
    const attendance = await db.clockInEmployee(employeeId, timing);
    const io = req.app.get("io");
    if (io) {
      io.emit("system:attendance_changed", { employeeId: employeeId, action: "clock-in" });
    }
    sendSuccess(res, attendance, "Chấm công vào thành công!");
  } catch (error) {
    console.error("Error in clockInEmployeeByManager:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

/** Records clock-out for a staff member selected at the manager attendance terminal. */
export const clockOutEmployeeByManager = async (req: Request, res: Response): Promise<void> => {
  try {
    const employeeId = getRequestedEmployeeId(req.body.employee_id);
    if (!employeeId) {
      sendError(res, "Nhân viên không hợp lệ.", 400);
      return;
    }
    const existing = await db.getTodayAttendance(employeeId);
    if (!existing || existing.clock_out) {
      sendError(res, "Nhân viên chưa chấm công vào hoặc đã chấm công ra.", 400);
      return;
    }
    const timing = res.locals.attendanceTiming as AttendanceTimingMetadata | undefined;
    const attendance = await db.clockOutEmployee(employeeId, timing);
    const io = req.app.get("io");
    if (io) {
      io.emit("system:attendance_changed", { employeeId: employeeId, action: "clock-out" });
    }
    sendSuccess(res, attendance, "Chấm công ra thành công!");
  } catch (error) {
    console.error("Error in clockOutEmployeeByManager:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export { MANAGE_ATTENDANCE_ROLES };

export const isCheckedInToday = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, "Không tìm thấy thông tin nhân viên.", 401);
      return;
    }
    const attendance = await db.getTodayAttendance(Number(userId));
    sendSuccess(res, {
      checkedIn: !!attendance && !attendance.clock_out,
      attendance,
    }, "OK");
  } catch (error) {
    console.error("Error in isCheckedInToday:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getMyWorkSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, "Không tìm thấy thông tin nhân viên.", 401);
      return;
    }
    const empId = Number(userId);

    const users = await db.query<any[]>(
      `SELECT u.id, u.full_name, u.email, u.phone, u.employee_code, u.date_of_birth,
              COALESCE(u.hourly_rate, 25000) AS hourly_rate,
              COALESCE(r.name, 'waiter') AS role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [empId]
    );

    if (!users || users.length === 0) {
      sendError(res, "Không tìm thấy hồ sơ nhân viên trong hệ thống.", 404);
      return;
    }
    const userObj = users[0];

    const paidRecords = await db.query<any[]>(
      "SELECT paid_at FROM payrolls WHERE user_id = ? AND status = 'paid' ORDER BY paid_at DESC LIMIT 1",
      [empId]
    );
    const lastPaidAt = paidRecords.length > 0 && paidRecords[0].paid_at ? new Date(paidRecords[0].paid_at) : null;

    const attendanceSql = `
      SELECT clock_in, clock_out 
      FROM attendance 
      WHERE employee_id = ?
        AND MONTH(clock_in) = MONTH(CURRENT_DATE())
        AND YEAR(clock_in) = YEAR(CURRENT_DATE())
    `;
    const records = await db.query<any[]>(attendanceSql, [empId]);

    let totalMinutes = 0;
    const now = new Date();

    for (const rec of records) {
      if (!rec.clock_in) continue;
      // Không cộng ca đang làm việc (chưa clock-out) vào tổng giờ làm
      if (!rec.clock_out) continue;
      const inTime = new Date(rec.clock_in).getTime();
      const outTime = new Date(rec.clock_out).getTime();
      const diffMins = (outTime - inTime) / (1000 * 60);
      if (diffMins > 0) {
        totalMinutes += diffMins;
      }
    }

    const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
    const hourlyRate = Number(userObj.hourly_rate) || 25000;
    const totalSalary = Math.round(totalHours * hourlyRate);

    const result = {
      user_id: userObj.id,
      full_name: userObj.full_name || "Nhân viên",
      employee_code: userObj.employee_code || `NV${String(userObj.id).padStart(3, "0")}`,
      role_name: userObj.role_name,
      date_of_birth: userObj.date_of_birth ? new Date(userObj.date_of_birth).toISOString().slice(0, 10) : "1998-08-18",
      phone: userObj.phone || "",
      email: userObj.email || "",
      hourly_rate: hourlyRate,
      total_hours: totalHours,
      total_salary: totalSalary,
      last_paid_at: lastPaidAt ? lastPaidAt.toISOString() : null,
      server_time: now.toISOString()
    };

    sendSuccess(res, result, "Lấy thông tin cá nhân và tổng số giờ làm thời gian thực thành công.");
  } catch (error) {
    console.error("Error in getMyWorkSummary:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

