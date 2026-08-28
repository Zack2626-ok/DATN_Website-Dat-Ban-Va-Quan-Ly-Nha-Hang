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
import { buildVnPayPaymentUrl, verifyVnPayReturn } from "../services/vnpay.service";
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

/**
 * Tạo URL & Mã QR thanh toán VNPay Sandbox
 */
export const createVnPayUrl = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId: rawOrderId, invoiceId: rawInvoiceId, vatRate, voucherCode, voucherAmount, pointsUsed } = req.body;
    const orderId = Number(rawOrderId || rawInvoiceId);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      sendError(res, "Mã hóa đơn không hợp lệ", 400);
      return;
    }

    const orders = await db.getAllResmanagerOrders();
    const order = orders.find((o: any) => Number(o.id) === orderId);
    if (!order) {
      sendError(res, "Không tìm thấy hóa đơn", 404);
      return;
    }

    const subtotal = Number(order.total_amount || order.subtotal || 0);
    const taxRate = vatRate !== undefined ? Number(vatRate) : 8;
    const vat = Math.round(subtotal * (taxRate / 100));
    const voucher = Number(voucherAmount || 0);
    const pointsToUse = Number(pointsUsed || 0);
    const pointsDiscount = pointsToUse * 100;

    // Không trừ tiền cọc theo yêu cầu người dùng
    const finalAmount = Math.max(0, subtotal + vat - voucher - pointsDiscount);

    const host = req.get("host") || "localhost:5000";
    const protocol = req.protocol || "http";
    const returnUrl = `${protocol}://${host}/api/v1/payments/vnpay/return`;

    const { paymentUrl, txnRef } = buildVnPayPaymentUrl({
      orderId,
      amount: finalAmount,
      orderInfo: `Thanh toan HD #${orderId}`,
      returnUrl,
    });

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(paymentUrl)}`;

    sendSuccess(res, {
      paymentUrl,
      qrUrl,
      txnRef,
      amount: finalAmount,
      orderId,
    }, "Tạo mã thanh toán VNPay thành công");
  } catch (error) {
    console.error("Error creating VNPay URL:", error);
    sendError(res, `Lỗi tạo link VNPay: ${(error as Error).message}`, 500);
  }
};

/**
 * Xử lý Return Callback từ cổng VNPay Sandbox sau khi quét mã
 */
export const handleVnPayReturn = async (req: Request, res: Response): Promise<void> => {
  try {
    const verifyResult = verifyVnPayReturn(req.query);
    const { vnp_TxnRef, vnp_ResponseCode, vnp_Amount } = req.query;

    if (!verifyResult.isVerified) {
      res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>Thanh toán VNPay thất bại</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #fff5f5; color: #991b1b;">
          <h2>❌ Chữ ký VNPay không hợp lệ!</h2>
          <p>Giao dịch của bạn bị từ chối do không vượt qua bước kiểm tra bảo mật.</p>
        </body>
        </html>
      `);
      return;
    }

    if (vnp_ResponseCode !== "00") {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>Thanh toán VNPay hủy/thất bại</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #fffbeb; color: #92400e;">
          <h2>⚠️ Thanh toán chưa hoàn tất</h2>
          <p>Giao dịch VNPay bị hủy hoặc không thành công (Mã lỗi: ${vnp_ResponseCode}).</p>
          <script>setTimeout(function() { window.close(); }, 3000);</script>
        </body>
        </html>
      `);
      return;
    }

    const txnRefStr = String(vnp_TxnRef || "");
    const match = txnRefStr.match(/^INV(\d+)_/);
    const orderId = match ? Number(match[1]) : null;

    if (orderId) {
      const paidAmount = Number(vnp_Amount) / 100;
      await db.createPayment({
        orderId: String(orderId),
        amount: paidAmount,
        paymentMethod: "vnpay",
        status: "completed",
        discountAmount: 0,
        discountReason: "Thanh toán VNPay Sandbox",
        completedAt: new Date().toISOString(),
      });

      await db.updateOrderStatus(String(orderId), "completed");
      await db.finalizeOrderBookingAndLoyaltyPoints(orderId, paidAmount);

      const orders = await db.getAllResmanagerOrders();
      const order = orders.find((o: any) => Number(o.id) === orderId);
      if (order && order.table_id) {
        const releasedTableIds = await db.releaseMergedTableClusterAfterPayment(Number(order.table_id));
        const ioServer = req.app.get("io");
        ioServer?.emit("table:merge_resolved", { releasedTableIds });
        ioServer?.emit("table:released", { tableId: Number(order.table_id) });
        releasedTableIds.forEach((tId: number) => {
          ioServer?.emit("table:status_changed", { tableId: tId, status: "cleaning" });
        });
      }

      const ioServer = req.app.get("io");
      ioServer?.emit("payment:success", {
        message: "Thanh toán VNPay thành công!",
        invoiceId: orderId,
        amount: paidAmount,
        paymentReference: txnRefStr,
        paidAt: new Date().toISOString(),
      });
      ioServer?.emit("payment:updated", { orderId, status: "completed", paymentMethod: "vnpay" });
      ioServer?.emit("invoice:updated", { orderId, status: "completed" });
    }

    res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Thanh toán VNPay thành công</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 50px; background: #f0fdf4; color: #166534; }
          .card { background: white; max-width: 480px; margin: 0 auto; padding: 30px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
          .icon { font-size: 60px; margin-bottom: 10px; }
          .btn { display: inline-block; margin-top: 20px; padding: 10px 24px; background: #166534; color: white; border-radius: 10px; text-decoration: none; font-weight: bold; cursor: pointer; border: none; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✅</div>
          <h2>THANH TOÁN VNPAY THÀNH CÔNG!</h2>
          <p>Mã hóa đơn: <strong>#${orderId}</strong></p>
          <p>Số tiền đã thanh toán: <strong>${(Number(vnp_Amount) / 100).toLocaleString("vi-VN")} đ</strong></p>
          <p style="font-size: 13px; color: #666; margin-top: 15px;">Hệ thống nhà hàng đã tự động nhận thông báo & cập nhật trạng thái hóa đơn.</p>
          <button class="btn" onclick="window.close()">Đóng cửa sổ này</button>
        </div>
        <script>
          setTimeout(function() { window.close(); }, 4000);
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("Error handling VNPay return:", error);
    sendError(res, `Lỗi xử lý callback VNPay: ${(error as Error).message}`, 500);
  }
};

/**
 * Mô phỏng thanh toán thành công VNPay Sandbox trong DevTools
 */
export const simulateVnPayPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId: rawOrderId, invoiceId: rawInvoiceId, vatRate, voucherCode, voucherAmount, pointsUsed } = req.body;
    const orderId = Number(rawOrderId || rawInvoiceId);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      sendError(res, "Mã hóa đơn không hợp lệ", 400);
      return;
    }

    const orders = await db.getAllResmanagerOrders();
    const order = orders.find((o: any) => Number(o.id) === orderId);
    if (!order) {
      sendError(res, "Không tìm thấy hóa đơn", 404);
      return;
    }

    const subtotal = Number(order.total_amount || order.subtotal || 0);
    const taxRate = vatRate !== undefined ? Number(vatRate) : 8;
    const vat = Math.round(subtotal * (taxRate / 100));
    const voucher = Number(voucherAmount || 0);
    const pointsToUse = Number(pointsUsed || 0);
    const pointsDiscount = pointsToUse * 100;

    const finalAmount = Math.max(0, subtotal + vat - voucher - pointsDiscount);

    const payment = await db.createPayment({
      orderId: String(orderId),
      amount: finalAmount,
      paymentMethod: "vnpay",
      status: "completed",
      discountAmount: voucher,
      discountReason: voucherCode ? `Voucher VNPay: ${voucherCode}` : "VNPay Sandbox Demo",
      notes: JSON.stringify({
        subtotal,
        vat,
        voucher,
        voucherCode,
        pointsUsed: pointsToUse,
        pointsDiscount,
        finalAmount,
      }),
      completedAt: new Date().toISOString(),
    });

    await db.updateOrderStatus(String(orderId), "completed");
    await db.finalizeOrderBookingAndLoyaltyPoints(orderId, finalAmount);

    if (order.table_id) {
      const releasedTableIds = await db.releaseMergedTableClusterAfterPayment(Number(order.table_id));
      const ioServer = req.app.get("io");
      ioServer?.emit("table:merge_resolved", { releasedTableIds });
      ioServer?.emit("table:released", { tableId: Number(order.table_id) });
      releasedTableIds.forEach((tId: number) => {
        ioServer?.emit("table:status_changed", { tableId: tId, status: "cleaning" });
      });
    }

    const ioServer = req.app.get("io");
    ioServer?.emit("payment:success", {
      message: "Thanh toán VNPay thành công!",
      invoiceId: orderId,
      amount: finalAmount,
      paymentReference: `DEMO-VNPAY-${Date.now()}`,
      paidAt: new Date().toISOString(),
    });
    ioServer?.emit("payment:updated", { orderId, status: "completed", paymentMethod: "vnpay" });
    ioServer?.emit("invoice:updated", { orderId, status: "completed" });

    sendSuccess(res, { payment, orderId, amount: finalAmount }, "Đã mô phỏng thanh toán VNPay thành công!");
  } catch (error) {
    console.error("Error simulating VNPay payment:", error);
    sendError(res, `Lỗi mô phỏng VNPay: ${(error as Error).message}`, 500);
  }
};

