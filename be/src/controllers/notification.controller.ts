import { Request, Response } from "express";
import { sendSuccess, sendError } from "../utils/response";
import * as db from "../utils/db";

/**
 * GET /api/notifications
 * Fetch active notifications, optionally filtered by user role
 */
export const getNotificationsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role } = req.query;
    const notifications = await db.getNotifications(role as string);
    sendSuccess(res, notifications, "Tải danh sách thông báo thành công!");
  } catch (err) {
    console.error("Error in getNotificationsHandler:", err);
    sendError(res, `Lỗi tải danh sách thông báo: ${(err as Error).message}`, 500);
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read
 */
export const markAsReadHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const success = await db.markNotificationAsRead(Number(id));
    if (success) {
      sendSuccess(res, { id }, "Đã đánh dấu đã đọc thông báo!");
    } else {
      sendError(res, "Không tìm thấy hoặc không thể cập nhật thông báo!", 404);
    }
  } catch (err) {
    console.error("Error in markAsReadHandler:", err);
    sendError(res, `Lỗi cập nhật thông báo: ${(err as Error).message}`, 500);
  }
};

/**
 * POST /api/notifications/clear
 * Mark all notifications as read
 */
export const clearNotificationsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role } = req.body;
    await db.markAllNotificationsAsRead(role as string);
    sendSuccess(res, null, "Đã đánh dấu đọc tất cả thông báo thành công!");
  } catch (err) {
    console.error("Error in clearNotificationsHandler:", err);
    sendError(res, `Lỗi xóa thông báo: ${(err as Error).message}`, 500);
  }
};
