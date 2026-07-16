import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendSuccess, sendError } from "../utils/response";

export const getAllInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, search, dateFrom, dateTo } = req.query;
    const orders = await db.getOrders();

    let invoices = orders
      .filter((o) => o.orderType === "dine_in")
      .map((o) => ({
        ...o,
        invoiceStatus: o.status === "paid" ? "paid" : o.status === "cancelled" ? "cancelled" : "unpaid",
      }));

    if (status && status !== "all") {
      invoices = invoices.filter((inv) => inv.invoiceStatus === status);
    }
    if (search) {
      const q = (search as string).toLowerCase();
      invoices = invoices.filter(
        (inv) =>
          inv.id.toLowerCase().includes(q) ||
          (inv.tableName || "").toLowerCase().includes(q) ||
          (inv.customerName || "").toLowerCase().includes(q),
      );
    }
    if (dateFrom) {
      invoices = invoices.filter((inv) => inv.createdAt >= (dateFrom as string));
    }
    if (dateTo) {
      invoices = invoices.filter((inv) => inv.createdAt <= (dateTo as string));
    }

    invoices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    sendSuccess(res, invoices, "Lấy danh sách hóa đơn thành công");
  } catch (error) {
    console.error("Error fetching invoices:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getInvoiceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const order = await db.getOrderById(id);
    if (!order) {
      sendError(res, "Không tìm thấy hóa đơn", 404);
      return;
    }
    sendSuccess(res, order, "Lấy chi tiết hóa đơn thành công");
  } catch (error) {
    console.error("Error fetching invoice:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const processPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { paymentMethod, vatRate, serviceFeeRate, voucherCode, voucherAmount, tipAmount, notes } = req.body;

    if (!paymentMethod) {
      sendError(res, "Phương thức thanh toán là bắt buộc", 400);
      return;
    }

    const validMethods = ["cash", "transfer", "card", "wallet"];
    if (!validMethods.includes(paymentMethod)) {
      sendError(res, `Phương thức phải là: ${validMethods.join(", ")}`, 400);
      return;
    }

    const order = await db.getOrderById(id);
    if (!order) {
      sendError(res, "Không tìm thấy hóa đơn", 404);
      return;
    }
    if (order.status === "paid") {
      sendError(res, "Hóa đơn đã được thanh toán", 400);
      return;
    }
    if (order.status === "cancelled") {
      sendError(res, "Hóa đơn đã bị hủy", 400);
      return;
    }

    // Kiểm tra cọc tiền đặt bàn
    let depositAmount = 0;
    let linkedBookingId: number | null = null;
    if (order.tableId) {
      const activeBookings = await db.query(
        `SELECT id, deposit_amount FROM bookings WHERE table_id = ? AND deposit_status = 'paid' ORDER BY created_at DESC LIMIT 1`,
        [Number(order.tableId)]
      );
      if (activeBookings.length > 0) {
        depositAmount = Number(activeBookings[0].deposit_amount);
        linkedBookingId = activeBookings[0].id;
      }
    }

    const subtotal = order.totalAmount;
    const vat = vatRate !== undefined ? subtotal * (vatRate / 100) : subtotal * 0.1;
    const serviceFee = serviceFeeRate !== undefined ? subtotal * (serviceFeeRate / 100) : 0;
    const voucher = voucherAmount || 0;
    const tip = tipAmount || 0;
    
    // Khấu trừ tiền cọc từ tổng số tiền cần thanh toán
    const finalAmount = subtotal + vat + serviceFee - voucher - depositAmount + tip;

    const payment = await db.createPayment({
      orderId: id,
      amount: finalAmount,
      paymentMethod,
      status: "completed",
      discountAmount: voucher,
      discountReason: voucherCode ? `Voucher: ${voucherCode}` : undefined,
      notes: JSON.stringify({
        subtotal,
        vat,
        serviceFee,
        voucher,
        voucherCode,
        tip,
        depositAmount,
        finalAmount,
        vatRate: vatRate ?? 10,
        serviceFeeRate: serviceFeeRate ?? 0,
        rawNotes: notes,
      }),
      completedAt: new Date().toISOString(),
    });

    await db.updateOrderStatus(id, "paid");

    // Cập nhật trạng thái cọc tiền đặt bàn đã hoàn thành
    if (linkedBookingId) {
      await db.query(
        `UPDATE bookings SET deposit_status = 'completed' WHERE id = ?`,
        [linkedBookingId]
      );
      console.log(`✅ Marked booking ${linkedBookingId} deposit status as completed`);
    }

    sendSuccess(res, { payment, order: { ...order, status: "paid" } }, "Thanh toán thành công");
  } catch (error) {
    console.error("Error processing payment:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const cancelInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await db.getOrderById(id);
    if (!order) {
      sendError(res, "Không tìm thấy hóa đơn", 404);
      return;
    }
    if (order.status === "paid") {
      sendError(res, "Không thể hủy hóa đơn đã thanh toán", 400);
      return;
    }

    await db.updateOrderStatus(id, "cancelled");

    if (order.tableId) {
      try {
        await db.updateTable(order.tableId, { status: "available" });
      } catch {
        // non-critical
      }
    }

    sendSuccess(res, { id, status: "cancelled", reason }, "Hủy hóa đơn thành công");
  } catch (error) {
    console.error("Error cancelling invoice:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const splitBillEqual = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { parts } = req.body;

    if (!parts || parts < 2) {
      sendError(res, "Số phần chia phải >= 2", 400);
      return;
    }

    const order = await db.getOrderById(id);
    if (!order) {
      sendError(res, "Không tìm thấy hóa đơn", 404);
      return;
    }
    if (order.status === "paid" || order.status === "cancelled") {
      sendError(res, "Không thể tách hóa đơn đã thanh toán hoặc đã hủy", 400);
      return;
    }

    const subtotal = order.totalAmount;
    const perPart = Math.floor(subtotal / parts);
    const remainder = subtotal - perPart * parts;

    const splitBills = [];
    for (let i = 0; i < parts; i++) {
      const amount = i === parts - 1 ? perPart + remainder : perPart;
      const splitOrder = await db.saveOrder({
        id: `split_${id}_${i + 1}_${Date.now()}`,
        tableId: order.tableId,
        tableName: order.tableName,
        items: order.items,
        status: "confirmed",
        totalAmount: amount,
        createdAt: new Date().toISOString(),
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        guestCount: 1,
        orderType: "dine_in",
      });
      splitBills.push({ ...splitOrder, splitLabel: `Phần ${i + 1}/${parts}` });
    }

    await db.updateOrderStatus(id, "cancelled");

    sendSuccess(res, { originalOrderId: id, splitBills }, "Tách hóa đơn thành công");
  } catch (error) {
    console.error("Error splitting bill:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const splitBillByItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { groups } = req.body;

    if (!groups || !Array.isArray(groups) || groups.length < 2) {
      sendError(res, "Cần ít nhất 2 nhóm món để tách", 400);
      return;
    }

    const order = await db.getOrderById(id);
    if (!order) {
      sendError(res, "Không tìm thấy hóa đơn", 404);
      return;
    }
    if (order.status === "paid" || order.status === "cancelled") {
      sendError(res, "Không thể tách hóa đơn đã thanh toán hoặc đã hủy", 400);
      return;
    }

    const splitBills = [];
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const groupItems = group.itemIndices.map((idx: number) => order.items[idx]).filter(Boolean);
      const groupTotal = groupItems.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);

      const splitOrder = await db.saveOrder({
        id: `split_item_${id}_${i + 1}_${Date.now()}`,
        tableId: order.tableId,
        tableName: order.tableName,
        items: groupItems,
        status: "confirmed",
        totalAmount: groupTotal,
        createdAt: new Date().toISOString(),
        customerName: group.label || `${order.customerName} - Nhóm ${i + 1}`,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        guestCount: 1,
        orderType: "dine_in",
      });
      splitBills.push({ ...splitOrder, splitLabel: group.label || `Nhóm ${i + 1}` });
    }

    await db.updateOrderStatus(id, "cancelled");

    sendSuccess(res, { originalOrderId: id, splitBills }, "Tách hóa đơn theo món thành công");
  } catch (error) {
    console.error("Error splitting bill by items:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const mergeBills = async (req: Request, res: Response): Promise<void> => {
  try {
    const { invoiceIds } = req.body;

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length < 2) {
      sendError(res, "Cần ít nhất 2 hóa đơn để gộp", 400);
      return;
    }

    const ordersToMerge = [];
    for (const invId of invoiceIds) {
      const order = await db.getOrderById(invId);
      if (!order) {
        sendError(res, `Không tìm thấy hóa đơn: ${invId}`, 404);
        return;
      }
      if (order.status === "paid" || order.status === "cancelled") {
        sendError(res, `Hóa đơn ${invId} đã thanh toán hoặc đã hủy, không thể gộp`, 400);
        return;
      }
      ordersToMerge.push(order);
    }

    const mergedItems: any[] = [];
    for (const order of ordersToMerge) {
      for (const item of order.items) {
        const existing = mergedItems.find((m) => m.menuItemId === item.menuItemId);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          mergedItems.push({ ...item });
        }
      }
    }

    const mergedTotal = mergedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const firstOrder = ordersToMerge[0];

    const mergedOrder = await db.saveOrder({
      id: `merged_${Date.now()}`,
      tableId: firstOrder.tableId,
      tableName: firstOrder.tableName,
      items: mergedItems,
      status: "confirmed",
      totalAmount: mergedTotal,
      createdAt: new Date().toISOString(),
      customerName: firstOrder.customerName,
      customerPhone: firstOrder.customerPhone,
      customerEmail: firstOrder.customerEmail,
      guestCount: firstOrder.guestCount,
      orderType: "dine_in",
    });

    for (const invId of invoiceIds) {
      await db.updateOrderStatus(invId, "cancelled");
    }

    sendSuccess(res, { mergedOrder, mergedFrom: invoiceIds }, "Gộp hóa đơn thành công");
  } catch (error) {
    console.error("Error merging bills:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const payPartial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { paymentMethod, amount, vatRate, serviceFeeRate, tipAmount, notes } = req.body;

    if (!paymentMethod || !amount) {
      sendError(res, "Phương thức thanh toán và số tiền là bắt buộc", 400);
      return;
    }

    const order = await db.getOrderById(id);
    if (!order) {
      sendError(res, "Không tìm thấy hóa đơn", 404);
      return;
    }
    if (order.status === "paid" || order.status === "cancelled") {
      sendError(res, "Hóa đơn đã thanh toán hoặc đã hủy", 400);
      return;
    }

    const payment = await db.createPayment({
      orderId: id,
      amount,
      paymentMethod,
      status: "completed",
      notes: JSON.stringify({
        partialPayment: true,
        vatRate,
        serviceFeeRate,
        tipAmount,
        rawNotes: notes,
      }),
      completedAt: new Date().toISOString(),
    });

    const existingPayments = await db.getPaymentsByOrderId(id);
    const totalPaid = existingPayments.filter((p) => p.status === "completed").reduce((sum, p) => sum + p.amount, 0);

    if (totalPaid >= order.totalAmount) {
      await db.updateOrderStatus(id, "paid");
    }

    sendSuccess(res, { payment, totalPaid, remaining: Math.max(0, order.totalAmount - totalPaid) }, "Thanh toán một phần thành công");
  } catch (error) {
    console.error("Error processing partial payment:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getInvoicePayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const payments = await db.getPaymentsByOrderId(id);
    sendSuccess(res, payments, "Lấy lịch sử thanh toán thành công");
  } catch (error) {
    console.error("Error fetching invoice payments:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};
