import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendError, sendSuccess } from "../utils/response";
import { formatVietnamBookingDateTime, getWalkInTimeValidationError } from "../utils/bookingTime";
import { ORDER_TYPE } from "../constants/order";
import { WALK_IN_OVERRIDE_ROLES } from "../constants/shiftTime";

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
    const { table_id, customer_id, created_by, order_type, note, guest_name, guest_phone, guest_count, booking_id } = req.body;

    if (!created_by) {
      sendError(res, "created_by (waiter id) là bắt buộc", 400);
      return;
    }

    const bId = booking_id ? Number(booking_id) : null;
    if (bId && Number.isInteger(bId) && bId > 0) {
      const existingOrders = await db.query<any[]>(
        "SELECT id, table_id FROM orders WHERE booking_id = ? AND status IN ('open', 'serving', 'pending_payment') LIMIT 1",
        [bId]
      );
      const bookingRows = await db.query<any[]>(
        "SELECT id, status FROM bookings WHERE id = ? LIMIT 1",
        [bId]
      );
      if (existingOrders.length > 0 || (bookingRows.length > 0 && ["arrived", "completed"].includes(bookingRows[0].status))) {
        sendError(res, "Đơn đặt bàn này đã được nhân viên khác mở bàn từ trước!", 409);
        return;
      }
    }

    const requestedTableId = table_id ? Number(table_id) : null;
    const primaryTableId = requestedTableId ? await db.resolveResmanagerPrimaryTableId(requestedTableId) : null;

    if (primaryTableId && order_type !== ORDER_TYPE.PRE_ORDER) {
      const currentTime = formatVietnamBookingDateTime();
      const bookingConflict = await db.getWalkInBookingConflictForTable(primaryTableId, currentTime);
      if (bookingConflict) {
        sendError(
          res,
          `Bàn này có lịch đặt lúc ${bookingConflict.booking_clock}. Vui lòng chọn bàn khác hoặc nhận khách từ mục Lịch đặt đúng giờ.`,
          409,
        );
        return;
      }

      const roleName = String(req.user?.role ?? req.user?.role_name ?? "").toLowerCase();
      const isOverrideRole = WALK_IN_OVERRIDE_ROLES.includes(roleName as any);
      const walkInTimeError = getWalkInTimeValidationError(new Date(), isOverrideRole);
      if (walkInTimeError) {
        sendError(res, walkInTimeError, 400);
        return;
      }
    }

    const order = await db.createResmanagerOrder({
      table_id: primaryTableId,
      customer_id: customer_id ? Number(customer_id) : null,
      created_by: Number(created_by),
      order_type: order_type || "dine_in",
      note: note || undefined,
      guest_name: guest_name || null,
      guest_phone: guest_phone || null,
      guest_count: guest_count ? Number(guest_count) : null,
      booking_id: bId,
    });

    const io = req.app.get("io");

    // Khi mở order, cập nhật trạng thái bàn thành 'serving'
    if (primaryTableId) {
      await db.updateResmanagerTableStatus(primaryTableId, "serving");
      io?.emit("table:status_changed", { tableId: primaryTableId, status: "serving", guest_name: guest_name || null });
    }

    if (bId) {
      const waiterRows = await db.query<any[]>("SELECT name, full_name, username FROM users WHERE id = ? LIMIT 1", [created_by]).catch(() => []);
      const waiterObj = waiterRows?.[0];
      const waiterName = waiterObj?.full_name || waiterObj?.name || waiterObj?.username || "Nhân viên";
      const tableRows = primaryTableId ? await db.query<any[]>("SELECT name FROM tables WHERE id = ? LIMIT 1", [primaryTableId]).catch(() => []) : [];
      const tableName = tableRows?.[0]?.name || `Bàn ${primaryTableId}`;

      io?.emit("booking:claimed", {
        bookingId: bId,
        id: bId,
        waiterId: Number(created_by),
        waiterName,
        tableId: primaryTableId,
        tableName,
        status: "arrived",
      });
      io?.emit("table:booking_checked_in", {
        bookingId: bId,
        id: bId,
        waiterName,
        tableId: primaryTableId,
        tableName,
      });
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
    const { menu_item_id, quantity, unit_price, seat_number, course_number, kitchen_note, created_by } = req.body;

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
      created_by: created_by ? Number(created_by) : null,
    });

    // Báo Socket.IO có món mới thêm
    req.app.get("io")?.emit("order:new_item", item);

    sendSuccess(res, item, "Thêm món thành công", 201);
  } catch (error) {
    const msg = (error as Error).message || "Lỗi khi thêm món";
    const statusCode = msg.includes("không thể") || msg.includes("khóa") || msg.includes("Vui lòng") ? 400 : 500;
    sendError(res, msg, statusCode);
  }
};

// Hủy món (void)
export const voidOrderItemHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, itemId } = req.params;
    const { reason } = req.body;

    // Kiểm tra trạng thái hiện tại của món ăn
    const items = await db.query<any[]>("SELECT status FROM order_items WHERE id = ?", [Number(itemId)]);
    if (items && items.length > 0) {
      const currentStatus = items[0].status;
      if (currentStatus === "cooking") {
        sendError(res, "Không thể hủy món ăn khi bếp đang nấu!", 400);
        return;
      }
    }

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

    await db.sendResmanagerOrderItemsToKitchen(item_ids.map(Number));

    // Báo Socket.io cập nhật KDS và Order
    req.app.get("io")?.emit("kds_updated");
    req.app.get("io")?.emit("order_updated");

    sendSuccess(res, { orderId, sent: item_ids.length }, "Đã gửi món xuống bếp");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

// Hold / bỏ hold món trước khi gửi bếp
export const holdOrderItemsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { item_ids, held } = req.body;

    if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
      sendError(res, "item_ids là bắt buộc (mảng ID món)", 400);
      return;
    }
    if (typeof held !== "boolean") {
      sendError(res, "held (boolean) là bắt buộc", 400);
      return;
    }

    const success = await db.holdResmanagerOrderItems(item_ids.map(Number), held);
    if (!success) {
      sendError(res, "Không thể cập nhật trạng thái hold", 400);
      return;
    }

    // Báo Socket.io cập nhật Order
    req.app.get("io")?.emit("order_updated");

    sendSuccess(res, { orderId, item_ids, held }, held ? "Đã hold món" : "Đã bỏ hold món");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

// Lấy danh sách thông báo: món đã xong (done) cần mang ra bàn
export const getWaiterNotificationsHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const items = await db.getWaiterDoneNotifications();
    sendSuccess(res, items, "Lấy thông báo thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

// Waiter xác nhận đã mang món ra bàn: done → served
export const markItemServedHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;
    const success = await db.markOrderItemServed(Number(itemId));
    if (!success) {
      sendError(res, "Không thể cập nhật — món chưa ở trạng thái 'done' hoặc không tồn tại", 400);
      return;
    }
    sendSuccess(res, { itemId: Number(itemId), status: "served" }, "Đã xác nhận mang ra bàn");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const requestPaymentHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { note, isEarlyPayment } = req.body;

    const orders = await db.getAllResmanagerOrders();
    const order = orders.find((o: any) => String(o.id) === orderId);
    if (!order) {
      sendError(res, "Không tìm thấy đơn hàng", 404);
      return;
    }
    if (order.status === "completed" || order.status === "paid" || order.status === "cancelled") {
      sendError(res, "Đơn hàng đã thanh toán hoặc đã hủy", 400);
      return;
    }

    if (isEarlyPayment) {
      await db.query("UPDATE orders SET is_early_payment = 1 WHERE id = ?", [orderId]);
    } else {
      await db.updateOrderStatus(orderId, "pending_payment");
      if (order.table_id) {
        await db.updateResmanagerTableStatus(Number(order.table_id), "pending_payment");
      }
    }

    const waiterName = req.user?.email || "Phục vụ";
    const title = isEarlyPayment ? "Yêu cầu thanh toán sớm" : "Yêu cầu thanh toán";
    const content = `${waiterName} yêu cầu ${isEarlyPayment ? "thanh toán sớm" : "thanh toán"} đơn #${orderId} - Bàn ${order.table_name || "?"}`;

    await db.createNotification(
      title,
      content,
      "payment_request",
      "cashier"
    );

    req.app.get("io")?.emit("payment:request", {
      orderId: Number(orderId),
      tableId: order.table_id,
      tableName: order.table_name,
      waiterName,
      totalAmount: order.totalAmount,
      note,
      isEarlyPayment: !!isEarlyPayment,
    });

    sendSuccess(res, { orderId, status: isEarlyPayment ? order.status : "pending_payment", isEarlyPayment: !!isEarlyPayment, waiterName }, "Đã gửi yêu cầu thanh toán");
  } catch (error) {
    console.error("Error requesting payment:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

// Waiter / Manager hủy yêu cầu thanh toán (quay lại trạng thái phục vụ)
export const cancelPaymentRequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;

    const orders = await db.getAllResmanagerOrders();
    const order = orders.find((o: any) => String(o.id) === orderId);
    if (!order) {
      sendError(res, "Không tìm thấy đơn hàng", 404);
      return;
    }

    await db.updateOrderStatus(orderId, "serving");

    if (order.table_id) {
      await db.updateResmanagerTableStatus(Number(order.table_id), "serving");
    }

    req.app.get("io")?.emit("table:status_changed", { tableId: order.table_id, status: "serving" });

    sendSuccess(res, { orderId, status: "serving" }, "Đã hủy yêu cầu thanh toán, tiếp tục phục vụ");
  } catch (error) {
    console.error("Error cancelling payment request:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

// QR Order - khách tự đặt món qua QR (không cần auth)
export const createQROrderHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { table_id, items, guest_name, guest_phone, guest_count, note } = req.body;

    if (!table_id || !items || !Array.isArray(items) || items.length === 0) {
      sendError(res, "table_id và items là bắt buộc", 400);
      return;
    }

    const order = await db.createResmanagerOrder({
      table_id: Number(table_id),
      customer_id: null,
      created_by: 1,
      order_type: "dine_in",
      note: note || "QR Order",
      guest_name: guest_name || null,
      guest_phone: guest_phone || null,
      guest_count: guest_count ? Number(guest_count) : null,
    });

    if (table_id) {
      await db.updateResmanagerTableStatus(Number(table_id), "serving");
    }

    for (const item of items) {
      const orderItem = await db.addResmanagerOrderItem({
        order_id: order.id,
        menu_item_id: Number(item.menu_item_id),
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        seat_number: null,
        course_number: 1,
        kitchen_note: undefined,
      });

      await db.sendResmanagerOrderItemsToKitchen([orderItem.id]);
      orderItem.status = "waiting_kitchen";

      req.app.get("io")?.emit("order:new_item", orderItem);
    }

    sendSuccess(res, order, "Tạo order QR thành công", 201);
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};
