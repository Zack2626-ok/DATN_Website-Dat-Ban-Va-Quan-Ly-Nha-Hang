import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendSuccess, sendError } from "../utils/response";

export const getPublicMenu = async (req: Request, res: Response): Promise<void> => {
  try {
    const items = await db.getResmanagerMenuItems();
    const categories = await db.getResmanagerCategories();
    // Filter out inactive/deleted items
    const activeItems = items.filter((item: any) => item.available && !item.is_deleted);
    sendSuccess(res, { items: activeItems, categories }, "Lấy thực đơn công khai thành công.");
  } catch (error) {
    console.error("Error in getPublicMenu:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getPublicPromotions = async (req: Request, res: Response): Promise<void> => {
  try {
    const promotions = await db.getPromotions();
    sendSuccess(res, promotions, "Lấy danh sách khuyến mãi thành công.");
  } catch (error) {
    console.error("Error in getPublicPromotions:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getPublicHalls = async (req: Request, res: Response): Promise<void> => {
  try {
    const halls = await db.getHalls();
    sendSuccess(res, halls, "Lấy danh sách sảnh tiệc thành công.");
  } catch (error) {
    console.error("Error in getPublicHalls:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getPublicEventPackages = async (req: Request, res: Response): Promise<void> => {
  try {
    const packages = await db.getEventPackages();
    sendSuccess(res, packages, "Lấy danh sách set menu tiệc thành công.");
  } catch (error) {
    console.error("Error in getPublicEventPackages:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};
