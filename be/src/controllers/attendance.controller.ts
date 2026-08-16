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
