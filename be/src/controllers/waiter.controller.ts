import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendError, sendSuccess } from "../utils/response";

// Lấy menu items (resmanager schema)
export const getResmanagerMenuItemsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const categoryId = req.query.category_id ? Number(req.query.category_id) : undefined;
    const items = await db.getResmanagerMenuItems(categoryId);
    sendSuccess(res, items, "Lấy danh sách menu thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

// Lấy categories
export const getResmanagerCategoriesHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await db.getResmanagerCategories();
    sendSuccess(res, categories, "Lấy danh sách danh mục thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

// Lấy order theo bàn
export const getOrdersByTableHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tableId } = req.params;
    const orders = await db.getResmanagerOrdersByTable(Number(tableId));
    sendSuccess(res, orders, "Lấy đơn hàng theo bàn thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

// Lấy order items theo order
export const getOrderItemsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const items = await db.getResmanagerOrderItems(Number(orderId));
    sendSuccess(res, items, "Lấy danh sách món thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

// Tạo order mới (resmanager)
export const createResmanagerOrderHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { table_id, customer_id, created_by, order_type, note } = req.body;

    if (!created_by) {
      sendError(res, "created_by (waiter id) là bắt buộc", 400);
      return;
    }

    const order = await db.createResmanagerOrder({
      table_id: table_id ? Number(table_id) : null,
      customer_id: customer_id ? Number(customer_id) : null,
      created_by: Number(created_by),
      order_type: order_type || "dine_in",
      note,
    });

    // Khi mở order, cập nhật trạng thái bàn thành 'serving'
    if (table_id) {
      await db.updateResmanagerTableStatus(Number(table_id), "serving");
    }

    sendSuccess(res, order, "Tạo order thành công", 201);
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

// Thêm món vào order
export const addOrderItemHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { menu_item_id, quantity, unit_price, seat_number, course_number, kitchen_note } = req.body;

    if (!menu_item_id || !quantity || unit_price === undefined) {
      sendError(res, "menu_item_id, quantity, unit_price là bắt buộc", 400);
      return;
    }

    const item = await db.addResmanagerOrderItem({
      order_id: Number(orderId),
      menu_item_id: Number(menu_item_id),
      quantity: Number(quantity),
      unit_price: Number(unit_price),
      seat_number: seat_number ? Number(seat_number) : null,
      course_number: course_number ? Number(course_number) : 1,
      kitchen_note,
    });

    // Báo Socket.IO có món mới thêm
    req.app.get("io")?.emit("order:new_item", item);

    sendSuccess(res, item, "Thêm món thành công", 201);
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

// Hủy món (void)
export const voidOrderItemHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, itemId } = req.params;
    const { reason } = req.body;

    const success = await db.voidResmanagerOrderItem(Number(itemId), reason || "Waiter cancelled");
    if (!success) {
      sendError(res, "Không tìm thấy món", 404);
      return;
    }

    // Báo Socket.IO món bị hủy
    req.app.get("io")?.emit("order:item_voided", {
      order_id: Number(orderId),
      item_id: Number(itemId),
      reason: reason || "Waiter cancelled",
    });

    sendSuccess(res, { itemId }, "Đã hủy món thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

// Gửi món xuống bếp
export const sendItemsToKitchenHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { item_ids } = req.body;

    if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
      sendError(res, "item_ids là bắt buộc (mảng ID món)", 400);
      return;
    }

    const success = await db.sendResmanagerOrderItemsToKitchen(item_ids.map(Number));

    sendSuccess(res, { orderId, sent: item_ids.length }, "Đã gửi món xuống bếp");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};
