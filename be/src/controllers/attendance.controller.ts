import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendSuccess, sendError } from "../utils/response";

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
    const attendance = await db.clockInEmployee(Number(userId));
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
    const attendance = await db.clockOutEmployee(Number(userId));
    sendSuccess(res, attendance, "Chấm công ra thành công!");
  } catch (error) {
    console.error("Error in clockOut:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

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
