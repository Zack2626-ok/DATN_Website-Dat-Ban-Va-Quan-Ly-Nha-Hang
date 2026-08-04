import { Request, Response } from "express";
import { sendSuccess, sendError } from "../utils/response";
import { isBookingTimeValidationEnabled, setBookingTimeValidationEnabled } from "../utils/bookingTime";

export const getBookingValidationHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    sendSuccess(res, { enabled: isBookingTimeValidationEnabled() }, "Lấy trạng thái giới hạn giờ đặt bàn thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const updateBookingValidationHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== "boolean") {
      sendError(res, "Trường 'enabled' (boolean) là bắt buộc", 400);
      return;
    }
    setBookingTimeValidationEnabled(enabled);

    // Emit socket event to notify all connected clients
    req.app.get("io")?.emit("system:booking_validation_changed", { enabled });

    sendSuccess(res, { enabled }, `Đã ${enabled ? "BẬT" : "TẮT"} giới hạn giờ nhận đặt bàn`);
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};
