import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendSuccess, sendError } from "../utils/response";
import { addLoyaltyPoints } from "./crm.controller";

export const getAllInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, search, dateFrom, dateTo } = req.query;

    const orders = await db.getAllResmanagerOrders(status as string);

    let invoices = orders.map((o: any) => ({
      id: String(o.id),
      tableId: o.table_id ? String(o.table_id) : undefined,
      tableName: o.table_name || undefined,
      customerName: o.guest_name || o.customer_name || undefined,
      customerPhone: o.guest_phone || o.customer_phone || undefined,
      customerEmail: o.customer_email || undefined,
      guestCount: o.guest_count || o.items?.length || 0,
      items: (o.items || []).map((item: any) => ({
        menuItemId: String(item.menu_item_id),
        name: item.item_name || `Món #${item.menu_item_id}`,
        price: Number(item.unit_price),
        quantity: item.quantity,
        status: item.status,
      })),
      depositAmount: o.depositAmount || 0,
      totalAmount: o.totalAmount || 0,
      subtotal: o.subtotal !== undefined ? o.subtotal : o.totalAmount || 0,
      tax: o.tax || 0,
      discount: o.discount || 0,
      vatRate: o.vatRate || 0,
      status: o.table_status === "pending_payment" || o.status === "pending_payment" ? "pending_payment" : o.status,
      invoiceStatus:
        o.status === "completed" || o.status === "paid"
          ? "paid"
          : o.status === "cancelled"
            ? "cancelled"
            : "unpaid",
      createdAt: o.created_at,
      orderType: o.order_type,
    }));

    // Nếu không có món nào (0 món) thì không đưa vào thu ngân
    invoices = invoices.filter((inv: any) => inv.items && inv.items.length > 0);

    if (status && status !== "all") {
      const statusMap: Record<string, string[]> = {
        unpaid: ["open", "serving", "pending_payment"],
        paid: ["completed", "paid"],
        cancelled: ["cancelled"],
      };
      const validStatuses = statusMap[status as string] || [status as string];
      invoices = invoices.filter((inv: any) => validStatuses.includes(inv.status));
    }

    if (search) {
      const q = (search as string).toLowerCase();
      invoices = invoices.filter(
        (inv: any) =>
          inv.id.toLowerCase().includes(q) ||
          (inv.tableName || "").toLowerCase().includes(q) ||
          (inv.customerName || "").toLowerCase().includes(q),
      );
    }
    if (dateFrom) {
      invoices = invoices.filter((inv: any) => inv.createdAt >= (dateFrom as string));
    }
    if (dateTo) {
      invoices = invoices.filter((inv: any) => inv.createdAt <= (dateTo as string));
    }

    invoices.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    sendSuccess(res, invoices, "Lấy danh sách hóa đơn thành công");
  } catch (error) {
    console.error("Error fetching invoices:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getInvoiceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orders = await db.getAllResmanagerOrders();
    const order = orders.find((o: any) => String(o.id) === id);
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

    const orders = await db.getAllResmanagerOrders();
    const order = orders.find((o: any) => String(o.id) === id);
    if (!order) {
      sendError(res, "Không tìm thấy hóa đơn", 404);
      return;
    }
    if (order.status === "completed" || order.status === "paid") {
      sendError(res, "Hóa đơn đã được thanh toán", 400);
      return;
    }
    if (order.status === "cancelled") {
      sendError(res, "Hóa đơn đã bị hủy", 400);
      return;
    }

    // Kiểm tra cọc tiền đặt bàn
    let depositAmount = Number(order.depositAmount || 0);
    let linkedBookingId: number | null = null;
    if (order.tableId || order.table_id) {
      const activeBookings = await db.query(
        `SELECT id, deposit_amount FROM bookings WHERE table_id = ? AND deposit_status IN ('paid', 'completed') ORDER BY created_at DESC LIMIT 1`,
        [Number(order.tableId || order.table_id)]
      );
      if (activeBookings.length > 0) {
        depositAmount = Number(activeBookings[0].deposit_amount || depositAmount);
        linkedBookingId = activeBookings[0].id;
      }
    }

    const subtotal = order.subtotal !== undefined ? Number(order.subtotal) : Number(order.totalAmount || 0);
    const vat = vatRate !== undefined ? Math.round(subtotal * (vatRate / 100)) : Math.round(subtotal * 0.1);
    const serviceFee = serviceFeeRate !== undefined ? Math.round(subtotal * (serviceFeeRate / 100)) : 0;
    const voucher = voucherAmount || 0;
    const tip = tipAmount || 0;
    
    // Khấu trừ tiền cọc từ tổng số tiền cần thanh toán
    const finalAmount = Math.max(0, subtotal + vat + serviceFee - voucher - depositAmount + tip);

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

    await db.updateOrderStatus(id, "completed");

    // Cập nhật trạng thái cọc tiền đặt bàn đã hoàn thành
    if (linkedBookingId) {
      await db.query(
        `UPDATE bookings SET deposit_status = 'completed' WHERE id = ?`,
        [linkedBookingId]
      );
      console.log(`✅ Marked booking ${linkedBookingId} deposit status as completed`);
    }

    if (order.table_id) {
      await db.updateResmanagerTableStatus(Number(order.table_id), "cleaning");
    }

    // Tích điểm loyalty nếu có khách hàng thành viên liên kết
    if (order.customer_id) {
      try {
        const invRows = await db.query(
          "SELECT id FROM invoices WHERE order_id = ? ORDER BY id DESC LIMIT 1",
          [id]
        );
        const invoiceId = invRows && invRows.length > 0 ? invRows[0].id : null;
        if (invoiceId) {
          await addLoyaltyPoints(Number(order.customer_id), finalAmount, invoiceId);
        }
      } catch (errLoyalty: any) {
        console.warn("[processPayment] Loyalty points accumulation failed:", errLoyalty.message);
      }
    }

    const updatedOrder = { ...order, status: "completed" };
    sendSuccess(res, { payment, order: updatedOrder }, "Thanh toán thành công");
  } catch (error) {
    console.error("Error processing payment:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const cancelInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const orders = await db.getAllResmanagerOrders();
    const order = orders.find((o: any) => String(o.id) === id);
    if (!order) {
      sendError(res, "Không tìm thấy hóa đơn", 404);
      return;
    }
    if (order.status === "completed" || order.status === "paid") {
      sendError(res, "Không thể hủy hóa đơn đã thanh toán", 400);
      return;
    }

    await db.updateOrderStatus(id, "cancelled");

    if (order.table_id) {
      await db.updateResmanagerTableStatus(Number(order.table_id), "empty");
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

    const orders = await db.getAllResmanagerOrders();
    const order = orders.find((o: any) => String(o.id) === id);
    if (!order) {
      sendError(res, "Không tìm thấy hóa đơn", 404);
      return;
    }
    if (order.status === "completed" || order.status === "paid" || order.status === "cancelled") {
      sendError(res, "Không thể tách hóa đơn đã thanh toán hoặc đã hủy", 400);
      return;
    }

    const subtotal = order.totalAmount;
    const perPart = Math.floor(subtotal / parts);
    const remainder = subtotal - perPart * parts;

    const splitBills = [];
    for (let i = 0; i < parts; i++) {
      const amount = i === parts - 1 ? perPart + remainder : perPart;
      const splitOrder = await db.createResmanagerOrder({
        table_id: order.table_id,
        customer_id: order.customer_id,
        created_by: order.created_by,
        order_type: order.order_type,
        note: `Tách từ đơn #${id} - Phần ${i + 1}/${parts}`,
        guest_name: order.guest_name,
        guest_phone: order.guest_phone,
        guest_count: 1,
      });

      // Copy các món ăn sang đơn tách mới với giá trị chia đều
      if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          const splitQty = Math.max(1, Math.round(item.quantity / parts));
          const splitPrice = Math.round(Number(item.unit_price) / parts);
          const addedItem = await db.addResmanagerOrderItem({
            order_id: splitOrder.id,
            menu_item_id: item.menu_item_id,
            quantity: splitQty,
            unit_price: splitPrice,
            seat_number: item.seat_number || null,
            course_number: item.course_number || 1,
            kitchen_note: item.kitchen_note || undefined,
            bypass_status_check: true,
          });
          if (item.status && addedItem?.id) {
            await db.query("UPDATE order_items SET status = ? WHERE id = ?", [item.status, addedItem.id]);
          }
        }
      }

      splitBills.push({ ...splitOrder, totalAmount: amount, splitLabel: `Phần ${i + 1}/${parts}` });
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

    const orders = await db.getAllResmanagerOrders();
    const order = orders.find((o: any) => String(o.id) === id);
    if (!order) {
      sendError(res, "Không tìm thấy hóa đơn", 404);
      return;
    }
    if (order.status === "completed" || order.status === "paid" || order.status === "cancelled") {
      sendError(res, "Không thể tách hóa đơn đã thanh toán hoặc đã hủy", 400);
      return;
    }

    const splitBills = [];
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const groupItems = group.itemIndices.map((idx: number) => order.items[idx]).filter(Boolean);
      const groupTotal = groupItems.reduce((sum: number, item: any) => sum + Number(item.unit_price) * item.quantity, 0);

      const splitOrder = await db.createResmanagerOrder({
        table_id: order.table_id,
        customer_id: order.customer_id,
        created_by: order.created_by,
        order_type: order.order_type,
        note: `Tách theo món từ đơn #${id} - ${group.label || `Nhóm ${i + 1}`}`,
        guest_name: group.label || order.guest_name,
        guest_phone: order.guest_phone,
        guest_count: 1,
      });

      // Copy đúng các món được gán vào nhóm này sang order mới
      for (const item of groupItems) {
        const addedItem = await db.addResmanagerOrderItem({
          order_id: splitOrder.id,
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          unit_price: Number(item.unit_price),
          seat_number: item.seat_number || null,
          course_number: item.course_number || 1,
          kitchen_note: item.kitchen_note || undefined,
          bypass_status_check: true,
        });
        if (item.status && addedItem?.id) {
          await db.query("UPDATE order_items SET status = ? WHERE id = ?", [item.status, addedItem.id]);
        }
      }

      splitBills.push({ ...splitOrder, totalAmount: groupTotal, splitLabel: group.label || `Nhóm ${i + 1}` });
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

    const orders = await db.getAllResmanagerOrders();
    const ordersToMerge = invoiceIds.map((invId: string) =>
      orders.find((o: any) => String(o.id) === invId)
    );

    for (let i = 0; i < ordersToMerge.length; i++) {
      if (!ordersToMerge[i]) {
        sendError(res, `Không tìm thấy hóa đơn: ${invoiceIds[i]}`, 404);
        return;
      }
      if (["completed", "paid", "cancelled"].includes(ordersToMerge[i].status)) {
        sendError(res, `Hóa đơn ${invoiceIds[i]} đã thanh toán hoặc đã hủy, không thể gộp`, 400);
        return;
      }
    }

    const mergedItems: any[] = [];
    for (const order of ordersToMerge) {
      for (const item of order.items) {
        const existing = mergedItems.find((m) => m.menu_item_id === item.menu_item_id && (m.kitchen_note || '').trim() === (item.kitchen_note || '').trim());
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          mergedItems.push({ ...item });
        }
      }
    }

    const mergedTotal = mergedItems.reduce((sum, item) => sum + Number(item.unit_price) * item.quantity, 0);
    const firstOrder = ordersToMerge[0];

    const mergedOrder = await db.createResmanagerOrder({
      table_id: firstOrder.table_id,
      customer_id: firstOrder.customer_id,
      created_by: firstOrder.created_by,
      order_type: firstOrder.order_type,
      note: `Gộp từ ${invoiceIds.length} đơn: ${invoiceIds.join(", ")}`,
      guest_name: firstOrder.guest_name,
      guest_phone: firstOrder.guest_phone,
      guest_count: firstOrder.guest_count,
    });

    // Copy toàn bộ danh sách món đã gộp sang đơn hàng mới
    for (const item of mergedItems) {
      const addedItem = await db.addResmanagerOrderItem({
        order_id: mergedOrder.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        seat_number: item.seat_number || null,
        course_number: item.course_number || 1,
        kitchen_note: item.kitchen_note || undefined,
        bypass_status_check: true,
      });
      if (item.status && addedItem?.id) {
        await db.query("UPDATE order_items SET status = ? WHERE id = ?", [item.status, addedItem.id]);
      }
    }

    for (const invId of invoiceIds) {
      await db.updateOrderStatus(invId, "cancelled");
    }

    sendSuccess(res, { mergedOrder: { ...mergedOrder, totalAmount: mergedTotal }, mergedFrom: invoiceIds }, "Gộp hóa đơn thành công");
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

    const orders = await db.getAllResmanagerOrders();
    const order = orders.find((o: any) => String(o.id) === id);
    if (!order) {
      sendError(res, "Không tìm thấy hóa đơn", 404);
      return;
    }
    if (order.status === "completed" || order.status === "paid" || order.status === "cancelled") {
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
      await db.updateOrderStatus(id, "completed");
      if (order.table_id) {
        await db.updateResmanagerTableStatus(Number(order.table_id), "cleaning");
      }
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

export const getPaymentHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, dateFrom, dateTo, paymentMethod } = req.query;
    let payments = await db.getResmanagerPayments();

    if (search) {
      const q = (search as string).toLowerCase();
      payments = payments.filter(
        (p: any) =>
          String(p.orderId).toLowerCase().includes(q) ||
          (p.table_name || "").toLowerCase().includes(q) ||
          (p.guest_name || "").toLowerCase().includes(q),
      );
    }
    if (dateFrom) {
      payments = payments.filter((p: any) => p.createdAt >= (dateFrom as string));
    }
    if (dateTo) {
      payments = payments.filter((p: any) => p.createdAt <= (dateTo as string));
    }
    if (paymentMethod && paymentMethod !== "all") {
      payments = payments.filter((p: any) => p.paymentMethod === paymentMethod);
    }

    sendSuccess(res, payments, "Lấy lịch sử thanh toán thành công");
  } catch (error) {
    console.error("Error fetching payment history:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};
