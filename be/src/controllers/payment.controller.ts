import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendError, sendSuccess } from "../utils/response";

export const getAllPayments = async (_req: Request, res: Response): Promise<void> => {
  try {
    const payments = await db.getPayments();
    sendSuccess(res, payments, "Lấy danh sách thanh toán thành công");
  } catch (error) {
    console.error("Error fetching payments:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getPaymentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      sendError(res, "ID thanh toán là bắt buộc", 400);
      return;
    }

    const payment = await db.getPaymentById(id);
    if (!payment) {
      sendError(res, "Không tìm thấy thanh toán", 404);
      return;
    }

    sendSuccess(res, payment, "Lấy thông tin thanh toán thành công");
  } catch (error) {
    console.error("Error fetching payment by id:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getPaymentsByOrderId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      sendError(res, "ID đơn hàng là bắt buộc", 400);
      return;
    }

    const payments = await db.getPaymentsByOrderId(orderId);
    sendSuccess(res, payments, "Lấy danh sách thanh toán thành công");
  } catch (error) {
    console.error("Error fetching payments by order id:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const createPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, amount, paymentMethod, discountAmount, discountReason, notes, status, completedAt } = req.body;

    if (!orderId || amount === undefined || !paymentMethod) {
      sendError(res, "ID đơn hàng, số tiền và phương thức thanh toán là bắt buộc", 400);
      return;
    }

    if (amount <= 0) {
      sendError(res, "Số tiền phải lớn hơn 0", 400);
      return;
    }

    const validMethods = ["cash", "card", "transfer", "wallet"];
    if (!validMethods.includes(paymentMethod)) {
      sendError(res, `Phương thức phải là: ${validMethods.join(", ")}`, 400);
      return;
    }

    const payment = await db.createPayment({
      orderId,
      amount,
      paymentMethod,
      status: status || "completed",
      discountAmount,
      discountReason,
      notes,
      completedAt,
    });

    if (status === "completed" || !status) {
      try {
        await db.updateOrderStatus(String(orderId), "completed");
        const orders = await db.getAllResmanagerOrders();
        const order = orders.find((o: any) => String(o.id) === String(orderId));
        if (order && order.table_id) {
          await db.updateResmanagerTableStatus(Number(order.table_id), "cleaning");
        }
      } catch (err) {
        console.warn("Could not update order or table status on payment creation:", err);
      }
    }

    sendSuccess(res, payment, "Tạo thanh toán thành công", 201);
  } catch (error) {
    console.error("Error creating payment:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const updatePaymentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
      sendError(res, "ID thanh toán là bắt buộc", 400);
      return;
    }

    const validStatuses = ["pending", "completed", "failed", "refunded"];
    if (!status || !validStatuses.includes(status)) {
      sendError(res, `Trạng thái phải là: ${validStatuses.join(", ")}`, 400);
      return;
    }

    const updatedPayment = await db.updatePaymentStatus(id, status);
    if (!updatedPayment) {
      sendError(res, "Không tìm thấy thanh toán cần cập nhật", 404);
      return;
    }

    sendSuccess(res, updatedPayment, "Cập nhật trạng thái thanh toán thành công");
  } catch (error) {
    console.error("Error updating payment status:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getPaymentDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      sendError(res, "ID đơn hàng là bắt buộc", 400);
      return;
    }

    const details = await db.getPaymentDetails(orderId);
    if (!details) {
      sendError(res, "Không tìm thấy đơn hàng để tính chi tiết thanh toán", 404);
      return;
    }

    sendSuccess(res, details, "Lấy chi tiết thanh toán thành công");
  } catch (error) {
    console.error("Error fetching payment details:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getPaymentStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const stats = await db.getPaymentStatistics(startDate, endDate);
    sendSuccess(res, stats, "Lấy thống kê thanh toán thành công");
  } catch (error) {
    console.error("Error fetching payment statistics:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const applyDiscount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { discountAmount, discountReason } = req.body;

    if (!id) {
      sendError(res, "ID thanh toán là bắt buộc", 400);
      return;
    }

    if (discountAmount === undefined || discountAmount < 0) {
      sendError(res, "Số tiền giảm phải >= 0", 400);
      return;
    }

    const updatedPayment = await db.applyDiscount(id, discountAmount, discountReason);
    if (!updatedPayment) {
      sendError(res, "Không thể áp dụng giảm giá cho thanh toán này", 400);
      return;
    }

    sendSuccess(res, updatedPayment, "Áp dụng giảm giá thành công");
  } catch (error) {
    console.error("Error applying discount:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};
