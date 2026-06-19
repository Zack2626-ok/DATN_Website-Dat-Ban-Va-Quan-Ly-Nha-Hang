import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendError, sendSuccess } from "../utils/response";

export const getAllMenuItems = async (_req: Request, res: Response): Promise<void> => {
  try {
    const items = await db.getMenuItems();
    sendSuccess(res, items, "Lấy danh sách menu thành công");
  } catch (error) {
    console.error("Error fetching menu items:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getMenuItemById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      sendError(res, "ID món ăn là bắt buộc", 400);
      return;
    }

    const item = await db.getMenuItemById(id);
    if (!item) {
      sendError(res, "Không tìm thấy món ăn", 404);
      return;
    }

    sendSuccess(res, item, "Lấy thông tin món ăn thành công");
  } catch (error) {
    console.error("Error fetching menu item by id:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getMenuItemsByCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.params;
    if (!category) {
      sendError(res, "Danh mục là bắt buộc", 400);
      return;
    }

    const items = await db.getMenuItemsByCategory(category);
    sendSuccess(res, items, `Lấy danh sách ${category} thành công`);
  } catch (error) {
    console.error("Error fetching menu items by category:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const createMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, category, price, preparationTime, image, available } = req.body;

    if (!name || !category || price === undefined) {
      sendError(res, "Tên, danh mục và giá là bắt buộc", 400);
      return;
    }

    if (price < 0) {
      sendError(res, "Giá phải lớn hơn 0", 400);
      return;
    }

    const newItem = await db.createMenuItem({
      name,
      description,
      category,
      price,
      image,
      available: available !== undefined ? Boolean(available) : true,
      preparationTime,
    });

    sendSuccess(res, newItem, "Tạo món ăn thành công", 201);
  } catch (error) {
    console.error("Error creating menu item:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const updateMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, category, price, available, preparationTime, image } = req.body;

    if (!id) {
      sendError(res, "ID món ăn là bắt buộc", 400);
      return;
    }

    if (price !== undefined && price < 0) {
      sendError(res, "Giá phải lớn hơn 0", 400);
      return;
    }

    const updatedItem = await db.updateMenuItem(id, {
      name,
      description,
      category,
      price,
      available: available !== undefined ? Boolean(available) : undefined,
      preparationTime,
      image,
    });

    if (!updatedItem) {
      sendError(res, "Không tìm thấy món ăn cần cập nhật", 404);
      return;
    }

    sendSuccess(res, updatedItem, "Cập nhật món ăn thành công");
  } catch (error) {
    console.error("Error updating menu item:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const deleteMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      sendError(res, "ID món ăn là bắt buộc", 400);
      return;
    }

    const deleted = await db.deleteMenuItem(id);
    if (!deleted) {
      sendError(res, "Không tìm thấy món ăn cần xóa", 404);
      return;
    }

    sendSuccess(res, { id }, "Xóa món ăn thành công");
  } catch (error) {
    console.error("Error deleting menu item:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const toggleMenuItemAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { available } = req.body;

    if (!id) {
      sendError(res, "ID món ăn là bắt buộc", 400);
      return;
    }

    if (available === undefined) {
      sendError(res, "Trường available là bắt buộc", 400);
      return;
    }

    const updatedItem = await db.toggleMenuItemAvailability(id, Boolean(available));
    if (!updatedItem) {
      sendError(res, "Không tìm thấy món ăn cần cập nhật", 404);
      return;
    }

    sendSuccess(res, updatedItem, "Cập nhật trạng thái thành công");
  } catch (error) {
    console.error("Error toggling menu item availability:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};
