import { Request, Response } from "express";
import { saveOrder, getOrders, updateOrderStatus, Order } from "../utils/db";
import { sendOrderReceiptEmail } from "../utils/email";
import { sendSuccess, sendError } from "../utils/response";

export const createOrderHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      id,
      tableId,
      tableName,
      items,
      status,
      totalAmount,
      customerName,
      customerPhone,
      customerEmail,
      guestCount = 1,
      deliveryAddress,
      orderType = "delivery",
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      sendError(res, "Danh sách món ăn đặt hàng trống!", 400);
      return;
    }

    if (orderType === "delivery" && !deliveryAddress) {
      sendError(res, "Địa chỉ nhận hàng là bắt buộc đối với đơn giao tận nơi!", 400);
      return;
    }

    if (!customerName || !customerPhone) {
      sendError(res, "Họ tên và Số điện thoại khách hàng là bắt buộc!", 400);
      return;
    }

    const orderId = id || `ord_${orderType}_${Math.random().toString(36).substr(2, 9)}`;

    const newOrder: Order = {
      id: orderId,
      tableId,
      tableName,
      items,
      status: status || "confirmed",
      totalAmount,
      createdAt: new Date().toISOString(),
      customerName,
      customerPhone,
      customerEmail,
      guestCount: parseInt(guestCount.toString()) || 1,
      deliveryAddress,
      orderType,
    };

    await saveOrder(newOrder);
    let receiptUrl = "";
    try {
      receiptUrl = await sendOrderReceiptEmail({
        id: newOrder.id,
        customerName: newOrder.customerName || "Khách Hàng",
        customerPhone: newOrder.customerPhone || "",
        customerEmail: newOrder.customerEmail,
        deliveryAddress: newOrder.deliveryAddress,
        items: newOrder.items,
        totalAmount: newOrder.totalAmount,
        createdAt: newOrder.createdAt,
        orderType: newOrder.orderType || "delivery",
      });
    } catch (emailErr) {
      console.error("Non-blocking error compiling invoice email:", emailErr);
    }

    sendSuccess(
      res,
      { ...newOrder, receiptUrl },
      "Đặt đơn hàng thành công!",
      201
    );
  } catch (err) {
    console.error("Error creating order in controller:", err);
    sendError(res, `Lỗi đặt hàng: ${(err as Error).message}`, 500);
  }
};

export const getOrdersHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const orders = await getOrders();
    sendSuccess(res, orders, "Tải danh sách đơn hàng thành công!");
  } catch (err) {
    console.error("Error retrieving orders:", err);
    sendError(res, `Không thể tải danh sách đơn hàng: ${(err as Error).message}`, 500);
  }
};

export const updateOrderStatusHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      sendError(res, "Trạng thái đơn hàng là bắt buộc!", 400);
      return;
    }

    const success = await updateOrderStatus(id, status);
    if (success) {
      sendSuccess(res, { id, status }, "Cập nhật trạng thái đơn hàng thành công!");
    } else {
      sendError(res, "Không tìm thấy đơn hàng cần cập nhật!", 404);
    }
  } catch (err) {
    console.error("Error updating order status:", err);
    sendError(res, `Không thể cập nhật trạng thái đơn hàng: ${(err as Error).message}`, 500);
  }
};
