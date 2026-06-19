import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendError, sendSuccess } from "../utils/response";

export const getAllInventory = async (_req: Request, res: Response): Promise<void> => {
  try {
    const items = await db.getInventory();
    sendSuccess(res, items, "Lấy danh sách kho thành công");
  } catch (error) {
    console.error("Error fetching inventory:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getInventoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      sendError(res, "ID kho là bắt buộc", 400);
      return;
    }

    const item = await db.getInventoryById(id);
    if (!item) {
      sendError(res, "Không tìm thấy mục kho", 404);
      return;
    }

    sendSuccess(res, item, "Lấy thông tin kho thành công");
  } catch (error) {
    console.error("Error fetching inventory item by id:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const createInventoryItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemName, itemCode, category, quantity, unit, minQuantity, supplier, lastRestocked } = req.body;

    if (!itemName || !itemCode || !category || quantity === undefined || !unit || minQuantity === undefined) {
      sendError(res, "Tên, mã, danh mục, số lượng, đơn vị và mức tồn tối thiểu là bắt buộc", 400);
      return;
    }

    if (quantity < 0 || minQuantity < 0) {
      sendError(res, "Số lượng và mức tồn tối thiểu phải >= 0", 400);
      return;
    }

    const newItem = await db.createInventoryItem({
      itemName,
      itemCode,
      category,
      quantity,
      unit,
      minQuantity,
      supplier,
      lastRestocked,
    });

    sendSuccess(res, newItem, "Tạo mục kho thành công", 201);
  } catch (error) {
    console.error("Error creating inventory item:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const updateInventoryItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { itemName, itemCode, category, quantity, unit, minQuantity, supplier, lastRestocked } = req.body;

    if (!id) {
      sendError(res, "ID kho là bắt buộc", 400);
      return;
    }

    if (quantity !== undefined && quantity < 0) {
      sendError(res, "Số lượng phải >= 0", 400);
      return;
    }

    if (minQuantity !== undefined && minQuantity < 0) {
      sendError(res, "Mức tồn tối thiểu phải >= 0", 400);
      return;
    }

    const updatedItem = await db.updateInventoryItem(id, {
      itemName,
      itemCode,
      category,
      quantity,
      unit,
      minQuantity,
      supplier,
      lastRestocked,
    });

    if (!updatedItem) {
      sendError(res, "Không tìm thấy mục kho cần cập nhật", 404);
      return;
    }

    sendSuccess(res, updatedItem, "Cập nhật kho thành công");
  } catch (error) {
    console.error("Error updating inventory item:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const deleteInventoryItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      sendError(res, "ID kho là bắt buộc", 400);
      return;
    }

    const deleted = await db.deleteInventoryItem(id);
    if (!deleted) {
      sendError(res, "Không tìm thấy mục kho cần xóa", 404);
      return;
    }

    sendSuccess(res, { id }, "Xóa kho thành công");
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const updateInventoryQuantity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { quantity, type } = req.body;

    if (!id) {
      sendError(res, "ID kho là bắt buộc", 400);
      return;
    }

    if (quantity === undefined || !["add", "subtract"].includes(type)) {
      sendError(res, "Số lượng và loại (add/subtract) là bắt buộc", 400);
      return;
    }

    const updatedItem = await db.updateInventoryQuantity(id, Number(quantity), type);
    if (!updatedItem) {
      sendError(res, "Không thể cập nhật số lượng, kiểm tra số lượng hoặc ID kho", 400);
      return;
    }

    sendSuccess(res, updatedItem, "Cập nhật số lượng thành công");
  } catch (error) {
    console.error("Error updating inventory quantity:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getLowStockItems = async (_req: Request, res: Response): Promise<void> => {
  try {
    const items = await db.getLowStockItems();
    sendSuccess(res, items, "Lấy danh sách hàng sắp hết thành công");
  } catch (error) {
    console.error("Error fetching low stock items:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};
