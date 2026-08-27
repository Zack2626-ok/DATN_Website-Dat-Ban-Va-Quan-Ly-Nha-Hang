import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendSuccess, sendError } from "../utils/response";
import { io } from "../server";

export const getRestaurantInfo = async (_req: Request, res: Response): Promise<void> => {
  try {
    const info = await db.getRestaurantInfo();
    sendSuccess(res, info, "Lấy thông tin nhà hàng thành công.");
  } catch (error) {
    console.error("Error in getRestaurantInfo:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const updateRestaurantInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await db.updateRestaurantInfo(req.body);
    try {
      io.emit("restaurant_info_updated", updated);
      io.emit("settings_updated", updated);
      io.emit("invoice:updated");
      io.emit("order_updated");
    } catch {}
    sendSuccess(res, updated, "Cập nhật thông tin nhà hàng thành công.");
  } catch (error) {
    console.error("Error in updateRestaurantInfo:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};
