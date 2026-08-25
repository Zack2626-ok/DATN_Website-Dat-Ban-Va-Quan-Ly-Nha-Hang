import { Request, Response } from "express";
import { createHmac, randomBytes } from "crypto";
import type { Server as SocketIOServer } from "socket.io";
import * as db from "../utils/db";
import { sendError, sendSuccess } from "../utils/response";
import {
  buildDynamicVietQrUrl,
  getBankQrConfiguration,
  getBankWebhookSecret,
  isBankTransferDemoModeEnabled,
  normalizeBankTransferWebhook,
  verifyBankWebhookSignature,
} from "../services/bankTransferPayment.service";
import type { BankTransferReconciliationResult } from "../utils/db";

interface InitiateBankTransferBody {
  orderId?: unknown;
}

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

/** Broadcasts a completed bank-transfer reconciliation after its database transaction commits. */
const publishCompletedBankTransfer = async (
  req: Request,
  reconciliation: BankTransferReconciliationResult,
  paymentReference: string,
): Promise<void> => {
  if (reconciliation.status !== "completed" || !reconciliation.invoiceId) return;

  const socketServer = req.app.get("io") as SocketIOServer | undefined;
  if (reconciliation.tableId) {
    const releasedTableIds = await db.releaseMergedTableClusterAfterPayment(reconciliation.tableId);
    socketServer?.emit("table:merge_resolved", { releasedTableIds });
  }

  socketServer?.to(`invoice_${reconciliation.invoiceId}`).emit("payment:success", {
    message: "Thanh toán thành công và đã trừ kho!",
    invoice_id: reconciliation.invoiceId,
    invoiceId: reconciliation.invoiceId,
    amount: reconciliation.amount,
    paymentReference,
    paidAt: new Date().toISOString(),
  });
};

/** Tạo phiên chuyển khoản ngân hàng chờ webhook xác nhận. */
export const initiateBankTransfer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId: rawOrderId } = req.body as InitiateBankTransferBody;
    const orderId = Number(rawOrderId);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      sendError(res, "Mã đơn thanh toán không hợp lệ", 400);
      return;
    }

    const qrConfiguration = getBankQrConfiguration();
    const paymentReference = `RM${orderId}-${Date.now()}-${randomBytes(4).toString("hex").toUpperCase()}`;
    const payment = await db.createPendingBankTransferPaymentForOrder(orderId, paymentReference);

    sendSuccess(res, {
      ...payment,
      demoModeEnabled: isBankTransferDemoModeEnabled(),
      bankCode: qrConfiguration.bankCode,
      accountNumber: qrConfiguration.accountNumber,
      accountName: qrConfiguration.accountName,
      qrUrl: buildDynamicVietQrUrl(qrConfiguration, payment.amount, payment.paymentReference),
    }, "Đã tạo QR chuyển khoản. Mã sẽ hết hạn sau 15 phút.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể tạo phiên chuyển khoản";
    sendError(res, message, 400);
  }
};

/** Simulates a successful bank transfer using a server-side pending QR session in local demo mode. */
export const simulateBankTransferPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isBankTransferDemoModeEnabled()) {
      sendError(res, "Chế độ mô phỏng thanh toán đang tắt.", 403);
      return;
    }

    const paymentId = Number(req.params.paymentId);
    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      sendError(res, "Phiên QR không hợp lệ.", 400);
      return;
    }

    const payment = await db.getPendingBankTransferPaymentForDemo(paymentId);
    if (!payment) {
      sendError(res, "Không tìm thấy phiên QR đang chờ thanh toán hoặc phiên đã hết hạn.", 404);
      return;
    }

    const reconciliation = await db.reconcileBankTransferPayment({
      paymentReference: payment.paymentReference,
      receivedAmount: payment.amount,
      bankTransactionId: `DEMO-${payment.paymentId}-${Date.now()}`,
      webhookPayload: JSON.stringify({
        source: "local_demo",
        paymentId: payment.paymentId,
        simulatedAt: new Date().toISOString(),
      }),
    });

    if (reconciliation.status === "not_found") {
      sendError(res, "Không tìm thấy giao dịch để đối soát.", 404);
      return;
    }
    if (reconciliation.status === "expired") {
      sendError(res, "Mã QR đã hết hạn, vui lòng tạo lại.", 409);
      return;
    }
    if (reconciliation.status === "underpaid" || reconciliation.status === "amount_mismatch") {
      sendError(res, "Số tiền mô phỏng không khớp với hóa đơn.", 409);
      return;
    }

    await publishCompletedBankTransfer(req, reconciliation, payment.paymentReference);
    sendSuccess(res, reconciliation, "Đã mô phỏng tiền về và đối soát hóa đơn thành công.");
  } catch (error) {
    console.error("simulateBankTransferPayment error:", error);
    sendError(res, "Không thể mô phỏng thanh toán chuyển khoản.", 500);
  }
};

/**
 * Route Mô phỏng "Sandbox" (POST /api/v1/payments/simulate-webhook)
 * Tự băm chữ ký HMAC chuẩn bằng Secret Key ở Backend và gọi vào Webhook xử lý thực tế.
 */
export const simulateBankTransferWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { payment_reference, paymentReference: altReference, amount, received_amount, simulate_hack, simulateHack } = req.body;
    const targetRef = String(payment_reference || altReference || "").trim();

    if (!targetRef) {
      sendError(res, "Thiếu mã đối soát payment_reference", 400);
      return;
    }

    const isHackSimulation = Boolean(simulate_hack || simulateHack);
    const secretKey = getBankWebhookSecret();
    const fakeBankPayload = {
      bank_transaction_id: "FTX" + Date.now(),
      payment_reference: targetRef,
      received_amount: received_amount !== undefined ? Number(received_amount) : Number(amount || 0),
      transaction_date: new Date().toISOString(),
    };

    const payloadBuffer = Buffer.from(JSON.stringify(fakeBankPayload));
    const computedSignature = isHackSimulation
      ? "invalid_hacker_signature_12345"
      : createHmac("sha256", secretKey).update(payloadBuffer).digest("hex");

    req.body = fakeBankPayload;
    (req as RawBodyRequest).rawBody = payloadBuffer;
    req.headers["x-api-signature"] = computedSignature;

    await processBankTransferWebhook(req, res);
  } catch (error) {
    console.error("simulateBankTransferWebhook error:", error);
    sendError(res, "Mô phỏng thất bại: " + (error instanceof Error ? error.message : String(error)), 500);
  }
};

/** Route Webhook Thực tế (POST /api/v1/payments/webhook) - Xác thực chữ ký & chốt hóa đơn. */
export const processBankTransferWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawBodyRequest = req as RawBodyRequest;
    const rawPayload = rawBodyRequest.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    const signature = (
      req.header("x-api-signature") ??
      req.header("x-bank-signature") ??
      req.header("x-signature") ??
      req.header("signature")
    );

    if (!verifyBankWebhookSignature(rawPayload, signature)) {
      res.status(401).json({ success: false, message: "Chữ ký không hợp lệ!" });
      return;
    }

    const webhookData = normalizeBankTransferWebhook(req.body, rawPayload);
    if (!webhookData) {
      sendError(res, "Webhook thiếu mã đối soát hoặc số tiền", 400);
      return;
    }

    const reconciliation = await db.reconcileBankTransferPayment({
      paymentReference: webhookData.paymentReference,
      receivedAmount: webhookData.receivedAmount,
      bankTransactionId: webhookData.bankTransactionId,
      webhookPayload: webhookData.rawPayload,
    });

    if (reconciliation.status === "not_found") {
      sendError(res, "Không tìm thấy phiên thanh toán!", 404);
      return;
    }

    if (reconciliation.status === "expired") {
      sendError(res, "Phiên thanh toán đã hết hạn!", 409);
      return;
    }

    if (reconciliation.status === "underpaid" || reconciliation.status === "amount_mismatch") {
      const socketServer = req.app.get("io") as SocketIOServer | undefined;
      if (reconciliation.invoiceId) {
        socketServer?.to(`invoice_${reconciliation.invoiceId}`).emit("payment:failed", {
          message: "Chuyển khoản thiếu tiền!",
          invoice_id: reconciliation.invoiceId,
          receivedAmount: reconciliation.receivedAmount,
          requiredAmount: reconciliation.amount,
        });
      }
      sendError(res, "Chuyển khoản thiếu tiền! Giữ trạng thái chờ.", 400);
      return;
    }

    await publishCompletedBankTransfer(req, reconciliation, webhookData.paymentReference);

    res.status(200).json({
      success: true,
      message: "Xử lý Webhook thành công!",
      data: reconciliation,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể xử lý webhook chuyển khoản";
    sendError(res, message, 500);
  }
};

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

    const validMethods = ["cash", "card", "transfer", "wallet", "momo", "vnpay"];
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
          if (order.is_early_payment) {
            await db.query("UPDATE orders SET is_early_paid = 1 WHERE id = ?", [orderId]);
            req.app.get("io")?.emit("table:updated", { tableId: order.table_id });
          } else {
            const releasedTableIds = await db.releaseMergedTableClusterAfterPayment(Number(order.table_id));
            req.app.get("io")?.emit("table:merge_resolved", { releasedTableIds });
          }
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
