import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendSuccess, sendError } from "../utils/response";
import { addLoyaltyPoints } from "./crm.controller";
import { io } from "../server";

export const formatDateToYYYYMMDD = (dateVal: any): string => {
  if (!dateVal) return "";
  try {
    let dateObj: Date;
    if (dateVal instanceof Date) {
      dateObj = dateVal;
    } else {
      const str = String(dateVal);
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return str;
      }
      
      if (str.includes("Z") || str.includes("+") || str.includes("T")) {
        dateObj = new Date(str);
      } else {
        const formattedStr = str.trim().replace(" ", "T");
        if (formattedStr.includes("T")) {
          dateObj = new Date(formattedStr + "+07:00");
        } else {
          dateObj = new Date(str);
        }
      }
    }

    if (isNaN(dateObj.getTime())) {
      return "";
    }

    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    
    const parts = formatter.formatToParts(dateObj);
    const yyyy = parts.find(p => p.type === 'year')?.value;
    const mm = parts.find(p => p.type === 'month')?.value;
    const dd = parts.find(p => p.type === 'day')?.value;
    
    if (yyyy && mm && dd) {
      return `${yyyy}-${mm}-${dd}`;
    }
  } catch (e) {
    console.error("Error formatting date to YYYYMMDD:", e);
  }
  return "";
};

export const assignOrderCodes = (orders: any[]) => {
  // Sort orders by created_at chronological order to assign sequence numbers correctly
  const sorted = [...orders].sort((a, b) => new Date(a.created_at || a.createdAt || 0).getTime() - new Date(b.created_at || b.createdAt || 0).getTime());
  
  // Group by date string (YYYYMMDD)
  const dateGroups: Record<string, any[]> = {};
  sorted.forEach(o => {
    const dateStr = formatDateToYYYYMMDD(o.created_at || o.createdAt);
    const key = dateStr.replace(/-/g, ""); // e.g. 20260808
    if (key.length === 8) {
      if (!dateGroups[key]) {
        dateGroups[key] = [];
      }
      dateGroups[key].push(o);
    } else {
      // Fallback for orders without proper date format
      const fallbackKey = "20260808";
      if (!dateGroups[fallbackKey]) {
        dateGroups[fallbackKey] = [];
      }
      dateGroups[fallbackKey].push(o);
    }
  });
  
  // Assign order_code
  const codesMap: Record<string, string> = {};
  Object.keys(dateGroups).forEach(dateKey => {
    const group = dateGroups[dateKey];
    group.forEach((o, index) => {
      const yy = dateKey.slice(2, 4); // "26"
      const mm = dateKey.slice(4, 6); // "08"
      const dd = dateKey.slice(6, 8); // "08"
      const seq = String(index + 1).padStart(3, "0"); // "001"
      const code = `HD${yy}${mm}${dd}-${seq}`;
      codesMap[String(o.id)] = code;
    });
  });
  
  // Map back to original orders
  return orders.map(o => ({
    ...o,
    order_code: codesMap[String(o.id)] || `HD-${o.id}`
  }));
};

export const getAllInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, search, dateFrom, dateTo } = req.query;

    let orders = await db.getAllResmanagerOrders();
    orders = assignOrderCodes(orders);

    let invoices = orders.map((o: any) => ({
      id: String(o.id),
      order_code: o.order_code,
      tableId: o.table_id ? String(o.table_id) : undefined,
      tableName: o.table_name || undefined,
      customerName: o.guest_name || o.customer_name || undefined,
      customerPhone: o.guest_phone || o.customer_phone || undefined,
      customerEmail: o.customer_email || undefined,
      guestCount: o.guest_count || o.items?.length || 0,
      staffName: o.staff_name || undefined,
      items: (o.items || []).map((item: any) => ({
        menuItemId: String(item.menu_item_id),
        name: item.item_name || `Món #${item.menu_item_id}`,
        price: Number(item.unit_price),
        quantity: item.quantity,
        status: item.status,
      })),
      totalAmount: o.totalAmount || 0,
      depositAmount: Number(o.deposit_amount) || 0,
      subtotal: o.subtotal !== undefined ? o.subtotal : o.totalAmount || 0,
      tax: o.tax || 0,
      discount: o.discount || 0,
      vatRate: o.vatRate || 0,
      status: (o.table_status === "pending_payment" || o.status === "pending_payment" || o.is_early_payment) ? "pending_payment" : o.status,
      invoiceStatus:
        o.status === "completed" || o.status === "paid"
          ? "paid"
          : o.status === "cancelled"
            ? "cancelled"
            : (o.status === "pending_payment" || o.table_status === "pending_payment" || o.is_early_payment)
              ? "pending"
              : "unpaid",
      createdAt: o.created_at,
      orderType: o.order_type,
      paymentMethod: o.paymentMethod || undefined,
      is_early_payment: !!o.is_early_payment,
    }));

    // Nếu không có món nào (0 món) thì không đưa vào thu ngân
    invoices = invoices.filter((inv: any) => inv.items && inv.items.length > 0);

    if (status && status !== "all") {
      const statusMap: Record<string, string[]> = {
        unpaid: ["open", "serving"],
        pending: ["pending_payment"],
        paid: ["completed", "paid"],
        cancelled: ["cancelled"],
      };
      const validStatuses = statusMap[status as string] || [status as string];
      invoices = invoices.filter((inv: any) => validStatuses.includes(inv.status));
    }

    if (search) {
      let q = (search as string).toLowerCase();
      if (q.startsWith("#")) {
        q = q.slice(1);
      }
      invoices = invoices.filter(
        (inv: any) =>
          inv.id.toLowerCase().includes(q) ||
          (inv.tableName || "").toLowerCase().includes(q) ||
          (inv.customerName || "").toLowerCase().includes(q),
      );
    }
    if (dateFrom) {
      invoices = invoices.filter((inv: any) => {
        const itemDate = formatDateToYYYYMMDD(inv.createdAt);
        return itemDate >= (dateFrom as string);
      });
    }
    if (dateTo) {
      invoices = invoices.filter((inv: any) => {
        const itemDate = formatDateToYYYYMMDD(inv.createdAt);
        return itemDate <= (dateTo as string);
      });
    }

    invoices.sort((a: any, b: any) => {
      const getPriority = (inv: any) => {
        if (inv.status === "pending_payment") return 1;
        if (inv.invoiceStatus === "unpaid") return 2;
        if (inv.invoiceStatus === "paid") return 3;
        return 4;
      };
      const pA = getPriority(a);
      const pB = getPriority(b);
      if (pA !== pB) return pA - pB;

      // Chưa thanh toán/Chờ thanh toán thì đến trước được thanh toán trước (createdAt tăng dần)
      // Đã thanh toán/Đã hủy thì hiển thị hóa đơn mới nhất lên đầu (createdAt giảm dần)
      if (pA === 1 || pA === 2) {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    sendSuccess(res, invoices, "Lấy danh sách hóa đơn thành công");
  } catch (error) {
    console.error("Error fetching invoices:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getInvoiceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    let orders = await db.getAllResmanagerOrders();
    orders = assignOrderCodes(orders);
    const o = orders.find((order: any) => String(order.id) === id);
    if (!o) {
      sendError(res, "Không tìm thấy hóa đơn", 404);
      return;
    }

    // Map to normalized Invoice structure matching getAllInvoices
    const invoice = {
      id: String(o.id),
      order_code: o.order_code,
      tableId: o.table_id ? String(o.table_id) : undefined,
      tableName: o.table_name || undefined,
      customerName: o.guest_name || o.customer_name || undefined,
      customerPhone: o.guest_phone || o.customer_phone || undefined,
      customerEmail: o.customer_email || undefined,
      guestCount: o.guest_count || o.items?.length || 0,
      staffName: o.staff_name || undefined,
      items: (o.items || []).map((item: any) => ({
        id: String(item.id),
        menuItemId: String(item.menu_item_id),
        name: item.item_name || `Món #${item.menu_item_id}`,
        price: Number(item.unit_price),
        quantity: item.quantity,
        status: item.status,
        is_refunded: item.is_refunded,
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
            : o.status === "pending_payment"
              ? "pending"
              : "unpaid",
      createdAt: o.created_at,
      arrivedAt: o.arrivedAt || o.created_at || o.createdAt,
      orderType: o.order_type,
      paymentMethod: o.paymentMethod || undefined,
      is_early_payment: o.is_early_payment,
    };

    sendSuccess(res, invoice, "Lấy chi tiết hóa đơn thành công");
  } catch (error) {
    console.error("Error fetching invoice:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const processPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { paymentMethod, vatRate, voucherCode, voucherAmount, tipAmount, notes, pointsUsed, serviceFeeRate } = req.body;

    if (!paymentMethod) {
      sendError(res, "Phương thức thanh toán là bắt buộc", 400);
      return;
    }

    const validMethods = ["cash", "transfer", "card", "wallet", "momo", "vnpay"];
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

    // Lấy depositAmount từ Quoc_dev (DB)
    let depositAmount = Number(order.deposit_amount) || 0;
    let linkedBookingId: number | null = null;

    let defaultTaxRate = 8;
    try {
      const resInfo = await db.getRestaurantInfo();
      if (resInfo && resInfo.tax_rate !== undefined) {
        defaultTaxRate = Number(resInfo.tax_rate);
      }
    } catch {}

    const subtotal = order.subtotal !== undefined ? Number(order.subtotal) : Number(order.totalAmount || 0);
    const vat = vatRate !== undefined ? Math.round(subtotal * (vatRate / 100)) : Math.round(subtotal * (defaultTaxRate / 100));
    
    // Validate and calculate voucher discount dynamically
    let calculatedVoucherAmount = Number(voucherAmount || 0);
    let dbVoucherId: number | null = null;
    let customerVoucherRecordId: number | null = null;

    if (voucherCode) {
      const vRows = await db.query(
        "SELECT * FROM vouchers WHERE code = ? AND is_active = 1 AND (expired_at IS NULL OR expired_at > NOW())",
        [voucherCode]
      );
      if (!vRows || vRows.length === 0) {
        sendError(res, "Mã voucher không hợp lệ hoặc đã hết hạn.", 400);
        return;
      }
      const voucherRecord = vRows[0];
      dbVoucherId = voucherRecord.id;

      // Check max uses
      if (voucherRecord.max_uses !== null && voucherRecord.used_count >= voucherRecord.max_uses) {
        sendError(res, "Mã voucher đã hết lượt sử dụng.", 400);
        return;
      }

      // Check min order subtotal
      if (subtotal < Number(voucherRecord.min_order)) {
        sendError(res, `Đơn hàng chưa đạt giá trị tối thiểu để áp dụng voucher này (Tối thiểu: ${Number(voucherRecord.min_order).toLocaleString("vi-VN")}đ).`, 400);
        return;
      }

      // Check points cost ownership
      if (Number(voucherRecord.points_cost || 0) > 0) {
        if (!order.customer_id) {
          sendError(res, "Voucher này yêu cầu thông tin thành viên đã đổi điểm.", 400);
          return;
        }
        const cvRows = await db.query(
          "SELECT id FROM customer_vouchers WHERE customer_id = ? AND voucher_id = ? AND is_used = 0 LIMIT 1",
          [order.customer_id, voucherRecord.id]
        );
        if (!cvRows || cvRows.length === 0) {
          sendError(res, "Mã voucher này chưa được đổi bằng điểm hoặc đã được sử dụng.", 400);
          return;
        }
        customerVoucherRecordId = cvRows[0].id;
      }

      // Re-calculate / verify voucher amount based on voucher type
      if (voucherRecord.type === "percent") {
        calculatedVoucherAmount = Math.round(subtotal * (Number(voucherRecord.value) / 100));
      } else {
        calculatedVoucherAmount = Number(voucherRecord.value);
      }
    }

    const voucher = calculatedVoucherAmount;
    const tip = tipAmount || 0;
    const pointsToUse = pointsUsed || 0;
    const pointsDiscount = pointsToUse * 100; // 1 point = 100 VND
    
    // Khấu trừ tiền cọc và điểm từ tổng số tiền cần thanh toán (kết hợp cả serviceFee nếu có)
    const serviceFee = serviceFeeRate !== undefined ? Math.round(subtotal * (serviceFeeRate / 100)) : 0;
    const finalAmount = Math.max(0, subtotal + vat + serviceFee - voucher - depositAmount + tip - pointsDiscount);

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
        voucher,
        voucherCode,
        depositAmount,
          tip,
        pointsUsed: pointsToUse,
        pointsDiscount,
        finalAmount,
        vatRate: vatRate ?? defaultTaxRate,
        rawNotes: notes,
      }),
      completedAt: new Date().toISOString(),
    });

    await db.updateOrderStatus(id, "completed");

    if (dbVoucherId) {
      await db.query(
        "UPDATE vouchers SET used_count = used_count + 1 WHERE id = ?",
        [dbVoucherId],
      );
    }
    if (order.table_id) {
      if (order.is_early_payment) {
        await db.query("UPDATE orders SET is_early_paid = 1 WHERE id = ?", [id]);
        req.app.get("io")?.emit("table:updated", { tableId: order.table_id });
        req.app.get("io")?.emit("table:status_changed", { tableId: Number(order.table_id), status: "serving" });
      } else {
        const subResult = await db.completeSubOrderPayment(Number(id));
        if (subResult.sessionCompleted || !subResult.isSplitOrder) {
          // Nếu không thuộc phiên tách bàn hoặc phiên tách bàn đã hoàn tất các nhóm
          // tiến hành giải phóng cụm bàn (gộp bàn nếu có) và đưa bàn về trạng thái cleaning/empty
          const releasedTableIds = await db.releaseMergedTableClusterAfterPayment(Number(order.table_id));
          req.app.get("io")?.emit("table:merge_resolved", { releasedTableIds });
          req.app.get("io")?.emit("table:released", { tableId: Number(order.table_id) });
          releasedTableIds.forEach((tId) => {
            req.app.get("io")?.emit("table:status_changed", { tableId: tId, status: "cleaning" });
          });
        } else {
          // Vẫn còn sub-order active trong phiên split, bàn vật lý giữ nguyên SERVING
          req.app.get("io")?.emit("table:split-updated", { tableId: Number(order.table_id), completedSubOrderId: Number(id) });
        }
      }
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
          // Trừ điểm tích lũy nếu có sử dụng
          if (pointsToUse > 0) {
            await db.query(
              "UPDATE customers SET loyalty_points = GREATEST(0, loyalty_points - ?) WHERE id = ?",
              [pointsToUse, order.customer_id]
            );
            await db.query(
              "INSERT INTO loyalty_transactions (customer_id, points, type, ref_invoice_id, note) VALUES (?, ?, 'redeem', ?, ?)",
              [order.customer_id, pointsToUse, invoiceId, `Quy đổi ${pointsToUse} điểm để giảm ${pointsDiscount}đ cho đơn #${invoiceId}`]
            );
          }
          // Đánh dấu voucher đã sử dụng nếu có
          if (customerVoucherRecordId) {
            await db.query(
              "UPDATE customer_vouchers SET is_used = 1, used_at = NOW() WHERE id = ?",
              [customerVoucherRecordId]
            );
          }
          // Tích điểm mới từ số tiền khách phải thanh toán (finalAmount)
          await addLoyaltyPoints(Number(order.customer_id), finalAmount, invoiceId);
        }
      } catch (errLoyalty: any) {
        console.warn("[processPayment] Loyalty points processing failed:", errLoyalty.message);
      }
    }

    const updatedOrder = { ...order, status: "completed" };
    req.app.get("io")?.emit("payment:updated", {
      orderId: id,
      tableId: order.table_id,
      status: "completed",
      paymentMethod,
    });
    req.app.get("io")?.emit("invoice:updated", {
      orderId: id,
      status: "completed",
    });
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

    req.app.get("io")?.emit("payment:updated", {
      orderId: id,
      status: "cancelled",
    });
    req.app.get("io")?.emit("invoice:updated", {
      orderId: id,
      status: "cancelled",
    });

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
    const { paymentMethod, amount, vatRate, tipAmount, notes } = req.body;

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
        if (order.is_early_payment) {
          await db.query("UPDATE orders SET is_early_paid = 1 WHERE id = ?", [id]);
          req.app.get("io")?.emit("table:updated", { tableId: order.table_id });
        } else {
          const releasedTableIds = await db.releaseMergedTableClusterAfterPayment(Number(order.table_id));
          req.app.get("io")?.emit("table:merge_resolved", { releasedTableIds });
        }
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

    // Map order_code from orders onto payment records first
    let ordersList = await db.getAllResmanagerOrders();
    ordersList = assignOrderCodes(ordersList);
    const orderCodesMap: Record<string, string> = {};
    ordersList.forEach((o: any) => {
      orderCodesMap[String(o.id)] = o.order_code;
    });

    let enrichedPayments = payments.map((p: any) => ({
      ...p,
      order_code: orderCodesMap[String(p.orderId)] || `HD-${p.orderId}`
    }));

    if (search) {
      let q = (search as string).toLowerCase();
      if (q.startsWith("#")) {
        q = q.slice(1);
      }
      enrichedPayments = enrichedPayments.filter(
        (p: any) =>
          String(p.orderId).toLowerCase().includes(q) ||
          (p.order_code || "").toLowerCase().includes(q) ||
          (p.table_name || "").toLowerCase().includes(q) ||
          (p.guest_name || "").toLowerCase().includes(q)
      );
    }
    if (dateFrom) {
      enrichedPayments = enrichedPayments.filter((p: any) => {
        const itemDate = formatDateToYYYYMMDD(p.createdAt);
        return itemDate >= (dateFrom as string);
      });
    }
    if (dateTo) {
      enrichedPayments = enrichedPayments.filter((p: any) => {
        const itemDate = formatDateToYYYYMMDD(p.createdAt);
        return itemDate <= (dateTo as string);
      });
    }
    if (paymentMethod && paymentMethod !== "all") {
      enrichedPayments = enrichedPayments.filter((p: any) => p.paymentMethod === paymentMethod);
    }

    sendSuccess(res, enrichedPayments, "Lấy lịch sử thanh toán thành công");
  } catch (error) {
    console.error("Error fetching payment history:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

/**
 * POST /api/v1/invoices/:id/refund
 * Request refund for specific items of an invoice/order after payment
 */
export const refundInvoiceItemsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { itemIds, reason, refundMethod } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      sendError(res, "Vui lòng chọn ít nhất một món ăn để hoàn tiền", 400);
      return;
    }

    const refundResult = await db.processOrderItemRefund({
      orderId: Number(id),
      itemIds: itemIds.map(Number),
      reason,
      refundMethod,
    });

    // Emit real-time WebSocket events
    io.emit("order_updated");
    io.emit("kds_updated");
    io.emit("table_updated");
    io.emit("invoice_refunded", refundResult);

    sendSuccess(res, refundResult, "Tạo phiếu hoàn tiền thành công!");
  } catch (error) {
    console.error("Error in refundInvoiceItemsHandler:", error);
    sendError(res, `Lỗi tạo phiếu hoàn tiền: ${(error as Error).message}`, 500);
  }
};
