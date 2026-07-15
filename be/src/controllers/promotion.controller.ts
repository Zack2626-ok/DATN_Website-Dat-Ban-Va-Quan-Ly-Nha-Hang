import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendError, sendSuccess } from "../utils/response";

export const getAllPromotions = async (_req: Request, res: Response): Promise<void> => {
  try {
    const list = await db.getAllPromotionsList();
    sendSuccess(res, list, "Lấy danh sách khuyến mãi thành công.");
  } catch (error) {
    console.error("Error in getAllPromotions controller:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getPromotionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      sendError(res, "ID khuyến mãi là bắt buộc.", 400);
      return;
    }

    const promotion = await db.getPromotionById(id);
    if (!promotion) {
      sendError(res, "Không tìm thấy chương trình khuyến mãi.", 404);
      return;
    }

    sendSuccess(res, promotion, "Lấy thông tin khuyến mãi thành công.");
  } catch (error) {
    console.error("Error in getPromotionById controller:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const createPromotion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, discount_type, discount_value, image_url, start_date, end_date, is_active } = req.body;

    if (!title || !discount_type || discount_value === undefined || !start_date || !end_date) {
      sendError(res, "Vui lòng nhập đầy đủ các trường bắt buộc (tiêu đề, loại giảm giá, giá trị giảm giá, ngày bắt đầu và kết thúc)!", 400);
      return;
    }

    const newPromo = await db.createPromotion({
      title,
      description,
      discount_type,
      discount_value: Number(discount_value),
      image_url,
      start_date,
      end_date,
      is_active: is_active !== undefined ? Number(is_active) : 1
    });

    sendSuccess(res, newPromo, "Tạo chương trình khuyến mãi thành công.", 201);
  } catch (error) {
    console.error("Error in createPromotion controller:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const updatePromotion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      sendError(res, "ID khuyến mãi là bắt buộc.", 400);
      return;
    }

    const data: any = {};
    const allowedFields = ["title", "description", "discount_type", "discount_value", "image_url", "start_date", "end_date", "is_active"];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "discount_value") {
          data[field] = Number(req.body[field]);
        } else if (field === "is_active") {
          data[field] = Number(req.body[field]);
        } else {
          data[field] = req.body[field];
        }
      }
    });

    if (Object.keys(data).length === 0) {
      sendError(res, "Không có thông tin nào để cập nhật.", 400);
      return;
    }

    const success = await db.updatePromotion(id, data);
    if (!success) {
      sendError(res, "Cập nhật khuyến mãi thất bại hoặc không tìm thấy.", 404);
      return;
    }

    const updated = await db.getPromotionById(id);
    sendSuccess(res, updated, "Cập nhật chương trình khuyến mãi thành công.");
  } catch (error) {
    console.error("Error in updatePromotion controller:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const deletePromotion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      sendError(res, "ID khuyến mãi là bắt buộc.", 400);
      return;
    }

    const success = await db.deletePromotion(id);
    if (!success) {
      sendError(res, "Xóa khuyến mãi thất bại hoặc không tìm thấy.", 404);
      return;
    }

    sendSuccess(res, null, "Xóa chương trình khuyến mãi thành công.");
  } catch (error) {
    console.error("Error in deletePromotion controller:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};
