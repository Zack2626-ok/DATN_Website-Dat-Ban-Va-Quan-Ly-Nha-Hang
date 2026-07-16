import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendSuccess, sendError } from "../utils/response";

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
    sendSuccess(res, updated, "Cập nhật thông tin nhà hàng thành công.");
  } catch (error) {
    console.error("Error in updateRestaurantInfo:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};
