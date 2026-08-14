import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendSuccess, sendError } from "../utils/response";

// Helper to format Date as MySQL DateTime string (YYYY-MM-DD HH:mm:ss)
const formatMySQLDateTime = (d: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

// Resolve Date Filter objects to MySQL string constraints
const resolveDateRange = (type: string, start?: string, end?: string) => {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  let startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  if (type === "today") {
    // Today 00:00:00 to 23:59:59
  } else if (type === "week") {
    startDate.setDate(startDate.getDate() - 6);
  } else if (type === "month") {
    startDate.setDate(startDate.getDate() - 29);
  } else if (type === "custom" && start) {
    startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);
    if (end) {
      endDate.setTime(new Date(end).getTime());
      endDate.setHours(23, 59, 59, 999);
    }
  }

  return {
    startStr: formatMySQLDateTime(startDate),
    endStr: formatMySQLDateTime(endDate),
    startDate,
    endDate,
  };
};

export const getDashboardAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type = "week", startDate: start, endDate: end } = req.query;
    const { startStr, endStr, startDate, endDate } = resolveDateRange(
      type as string,
      start as string,
      end as string
    );

    // 1) Summary KPIs
    const totalRevRow = await db.query(
      `SELECT COALESCE(SUM(total), 0) AS val FROM invoices WHERE status = 'paid' AND paid_at BETWEEN ? AND ?`,
      [startStr, endStr]
    );
    const totalRevenue = Number(totalRevRow[0].val);

    const dineInRevRow = await db.query(
      `SELECT COALESCE(SUM(i.total), 0) AS val FROM invoices i JOIN orders o ON i.order_id = o.id WHERE i.status = 'paid' AND o.order_type = 'dine_in' AND i.paid_at BETWEEN ? AND ?`,
      [startStr, endStr]
    );
    const dineInRevenue = Number(dineInRevRow[0].val);

    const takeawayRevRow = await db.query(
      `SELECT COALESCE(SUM(i.total), 0) AS val FROM invoices i JOIN orders o ON i.order_id = o.id WHERE i.status = 'paid' AND o.order_type = 'takeaway' AND i.paid_at BETWEEN ? AND ?`,
      [startStr, endStr]
    );
    const takeawayRevenue = Number(takeawayRevRow[0].val);

    const deliveryRevRow = await db.query(
      `SELECT COALESCE(SUM(i.total), 0) AS val FROM invoices i JOIN orders o ON i.order_id = o.id WHERE i.status = 'paid' AND o.order_type = 'delivery' AND i.paid_at BETWEEN ? AND ?`,
      [startStr, endStr]
    );
    const deliveryRevenue = Number(deliveryRevRow[0].val);

    const eventRevenue = 0;

    const totalOrdersRow = await db.query(
      `SELECT COUNT(*) AS val FROM orders WHERE status = 'completed' AND created_at BETWEEN ? AND ?`,
      [startStr, endStr]
    );
    const totalOrders = Number(totalOrdersRow[0].val);
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    const kpis = {
      totalRevenue,
      dineInRevenue,
      takeawayRevenue,
      deliveryRevenue,
      eventRevenue,
      totalOrders,
      averageOrderValue,
    };

    // 2) Timeline Data
    let timelineData: any[] = [];
    if (type === "today") {
      // Group by Hour
      const hoursRows = await db.query(
        `SELECT HOUR(paid_at) AS hr, SUM(total) AS rev, COUNT(*) AS count 
         FROM invoices 
         WHERE status = 'paid' AND paid_at BETWEEN ? AND ? 
         GROUP BY HOUR(paid_at) 
         ORDER BY hr ASC`,
        [startStr, endStr]
      );

      // Initialize hours map
      const hrMap: Record<string, { revenue: number; orderCount: number }> = {};
      for (let h = 8; h <= 22; h += 2) {
        hrMap[`${h}h`] = { revenue: 0, orderCount: 0 };
      }

      hoursRows.forEach((row: any) => {
        const hour = Number(row.hr);
        const groupHour = hour - (hour % 2);
        const label = `${groupHour}h`;
        if (hrMap[label]) {
          hrMap[label].revenue += Number(row.rev);
          hrMap[label].orderCount += Number(row.count);
        }
      });

      timelineData = Object.keys(hrMap).map((label) => ({
        label,
        revenue: hrMap[label].revenue,
        orderCount: hrMap[label].orderCount,
      }));
    } else {
      // Group by Date
      const dateRows = await db.query(
        `SELECT DATE(paid_at) as dt, SUM(total) AS rev, COUNT(*) AS count 
         FROM invoices 
         WHERE status = 'paid' AND paid_at BETWEEN ? AND ? 
         GROUP BY DATE(paid_at) 
         ORDER BY dt ASC`,
        [startStr, endStr]
      );

      // Initialize all dates in the range to avoid empty gaps
      const dateMap: Record<string, { revenue: number; orderCount: number }> = {};
      const tempDate = new Date(startDate);
      while (tempDate <= endDate) {
        const key = `${tempDate.getDate().toString().padStart(2, "0")}/${(tempDate.getMonth() + 1).toString().padStart(2, "0")}`;
        dateMap[key] = { revenue: 0, orderCount: 0 };
        tempDate.setDate(tempDate.getDate() + 1);
      }

      dateRows.forEach((row: any) => {
        const dObj = new Date(row.dt);
        const key = `${dObj.getDate().toString().padStart(2, "0")}/${(dObj.getMonth() + 1).toString().padStart(2, "0")}`;
        if (dateMap[key]) {
          dateMap[key].revenue = Number(row.rev);
          dateMap[key].orderCount = Number(row.count);
        }
      });

      timelineData = Object.keys(dateMap).map((label) => ({
        label,
        revenue: dateMap[label].revenue,
        orderCount: dateMap[label].orderCount,
      }));
    }

    // 3) Peak Hours
    const peakRows = await db.query(
      `SELECT HOUR(created_at) AS hr, COUNT(*) AS count 
       FROM orders 
       WHERE created_at BETWEEN ? AND ? 
       GROUP BY HOUR(created_at)`,
      [startStr, endStr]
    );

    const peakMap: Record<number, number> = {};
    for (let h = 8; h <= 22; h++) {
      peakMap[h] = 0;
    }
    peakRows.forEach((row: any) => {
      const hr = Number(row.hr);
      if (peakMap[hr] !== undefined) {
        peakMap[hr] = Number(row.count);
      }
    });

    const totalPeakOrders = Object.values(peakMap).reduce((s, c) => s + c, 0) || 1;
    const peakHourData = Object.keys(peakMap).map((hrStr) => {
      const hour = Number(hrStr);
      const count = peakMap[hour];
      return {
        hour,
        count,
        percentage: Math.round((count / totalPeakOrders) * 100),
      };
    });

    // 4) Top Selling Items
    const topRows = await db.query(
      `SELECT m.id, m.name, SUM(oi.quantity) AS quantity, SUM(oi.quantity * oi.unit_price) AS revenue
       FROM order_items oi
       JOIN menu_items m ON oi.menu_item_id = m.id
       WHERE oi.status = 'done' AND oi.created_at BETWEEN ? AND ?
       GROUP BY m.id, m.name
       ORDER BY quantity DESC
       LIMIT 5`,
      [startStr, endStr]
    );
    const totalTopQty = topRows.reduce((sum: number, r: any) => sum + Number(r.quantity), 0) || 1;
    const topItems = topRows.map((r: any) => ({
      id: Number(r.id),
      name: r.name,
      quantity: Number(r.quantity),
      revenue: Number(r.revenue),
      percentage: Math.round((Number(r.quantity) / totalTopQty) * 100),
    }));

    // 5) Payment Stats
    const paymentRows = await db.query(
      `SELECT p.method, COUNT(p.id) AS count, SUM(p.amount) AS total
       FROM payments p
       JOIN invoices i ON p.invoice_id = i.id
       WHERE i.status = 'paid' AND p.paid_at BETWEEN ? AND ?
       GROUP BY p.method`,
      [startStr, endStr]
    );

    const payStatsMap: Record<string, { count: number; total: number }> = {
      cash: { count: 0, total: 0 },
      bank_transfer: { count: 0, total: 0 },
      card: { count: 0, total: 0 },
      momo: { count: 0, total: 0 },
      vnpay: { count: 0, total: 0 },
    };

    paymentRows.forEach((r: any) => {
      if (payStatsMap[r.method]) {
        payStatsMap[r.method].count = Number(r.count);
        payStatsMap[r.method].total = Number(r.total);
      }
    });

    // Event contracts removed

    const paymentGrandTotal = Object.values(payStatsMap).reduce((sum, s) => sum + s.total, 0) || 1;

    const paymentNames: Record<string, string> = {
      cash: "Tiền mặt",
      bank_transfer: "Chuyển khoản",
      card: "Thẻ ngân hàng",
      momo: "Ví điện tử MoMo",
      vnpay: "Cổng VNPay",
    };

    const paymentStats = Object.keys(payStatsMap).map((methodKey) => {
      const method = methodKey as any;
      return {
        method,
        name: paymentNames[method],
        count: payStatsMap[method].count,
        total: payStatsMap[method].total,
        percentage: Math.round((payStatsMap[method].total / paymentGrandTotal) * 100),
      };
    });

    // 6) Cash Flow Summary
    const expenseRows = await db.query(
      `SELECT 
         CASE 
           WHEN i.name LIKE '%bò%' OR i.name LIKE '%gà%' OR i.name LIKE '%thịt%' THEN 'Thịt'
           WHEN i.name LIKE '%tôm%' OR i.name LIKE '%cá%' OR i.name LIKE '%hải sản%' THEN 'Hải sản'
           WHEN i.name LIKE '%rau%' OR i.name LIKE '%nấm%' OR i.name LIKE '%trái cây%' THEN 'Rau củ & Trái cây'
           ELSE 'Nguyên liệu khác'
         END AS category,
         SUM(si.quantity * si.unit_cost) AS amount
       FROM stock_in si
       JOIN ingredients i ON si.ingredient_id = i.id
       WHERE si.created_at BETWEEN ? AND ?
       GROUP BY category
       ORDER BY amount DESC`,
      [startStr, endStr]
    );

    const expenseItems = expenseRows.map((r: any) => ({
      category: r.category,
      amount: Number(r.amount),
    }));

    const totalIncome = totalRevenue + eventRevenue;
    const totalExpenses = expenseItems.reduce((s: number, e: any) => s + e.amount, 0);

    const cashFlow = {
      income: totalIncome,
      expenses: totalExpenses,
      netProfit: totalIncome - totalExpenses,
      expenseItems,
    };

    sendSuccess(
      res,
      {
        kpis,
        timelineData,
        peakHourData,
        topItems,
        paymentStats,
        cashFlow,
      },
      "Tải dữ liệu báo cáo kinh doanh thành công"
    );
  } catch (error) {
    console.error("Error fetching dashboard analytics:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getFinanceReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    // Resolve dates (default to this month if not provided)
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(1); // First day of current month
    start.setHours(0, 0, 0, 0);

    let startD = start;
    if (startDate) {
      startD = new Date(startDate as string);
      startD.setHours(0, 0, 0, 0);
    }

    let endD = end;
    if (endDate) {
      endD = new Date(endDate as string);
      endD.setHours(23, 59, 59, 999);
    }

    const startStr = formatMySQLDateTime(startD);
    const endStr = formatMySQLDateTime(endD);

    await db.ensureRefundColumns();

    // 1) Summary
    const incomeRow = await db.query(
      `SELECT COALESCE(SUM(COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = inv.id), inv.total)), 0) AS val 
       FROM invoices inv
       WHERE inv.status = 'paid' AND inv.paid_at BETWEEN ? AND ?`,
      [startStr, endStr]
    );
    const totalInvoiceIncome = Number(incomeRow[0].val);

    // Tổng tiền trả hàng NCC (hoàn tiền mặt/CK, không phải giảm nợ)
    // Lấy từ stock_out có reason=return_to_supplier và note KHÔNG chứa "Trừ công nợ"
    const returnIncomeRow = await db.query(
      `SELECT COALESCE(SUM(so.quantity * si.unit_cost), 0) AS val
       FROM stock_out so
       JOIN stock_in si ON so.stock_in_id = si.id
       WHERE so.reason = 'return_to_supplier'
         AND (so.note NOT LIKE '%Trừ công nợ%' AND so.note NOT LIKE '%deduct%')
         AND so.created_at BETWEEN ? AND ?`,
      [startStr, endStr]
    );
    const totalReturnIncome = Number(returnIncomeRow[0].val);

    // 1. Paid import expenses (only where is_credit = 0 or NULL and not draft and not stock check adjustment)
    const paidImportRow = await db.query(
      `SELECT COALESCE(SUM(quantity * unit_cost), 0) AS val 
       FROM stock_in 
       WHERE (is_credit IS NULL OR is_credit = 0)
         AND (note IS NULL OR note NOT LIKE '%[LƯU TẠM]%')
         AND (note IS NULL OR (note NOT LIKE '%Cân bằng kho%' AND note NOT LIKE '%hàng thừa%'))
         AND (batch_code IS NULL OR batch_code NOT LIKE 'LOT-ADJ-%')
         AND created_at BETWEEN ? AND ?`,
      [startStr, endStr]
    );
    const paidImportExpenses = Number(paidImportRow[0].val);

    // 1b. Income from surplus inventory check adjustments
    const stockAdjIncomeRow = await db.query(
      `SELECT COALESCE(SUM(quantity * unit_cost), 0) AS val
       FROM stock_in
       WHERE (note LIKE '%Cân bằng kho%' OR note LIKE '%hàng thừa%' OR batch_code LIKE 'LOT-ADJ-%')
         AND created_at BETWEEN ? AND ?`,
      [startStr, endStr]
    );
    const stockAdjIncome = Number(stockAdjIncomeRow[0].val);
    const totalIncome = totalInvoiceIncome + totalReturnIncome + stockAdjIncome;

    // 2. Debt payments made to suppliers in period
    const debtPayRow = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS val
       FROM debt_payments
       WHERE paid_at BETWEEN ? AND ?`,
      [startStr, endStr]
    );
    const debtPaymentsExpense = Number(debtPayRow[0].val);

    // 3. Stock waste/expired loss expenses (valuated at stock_in unit_cost or weighted average cost)
    const wasteRow = await db.query(
      `SELECT COALESCE(SUM(so.quantity * COALESCE(si.unit_cost, (
        SELECT SUM(s2.unit_cost * s2.remaining_quantity) / NULLIF(SUM(s2.remaining_quantity), 0)
        FROM stock_in s2 WHERE s2.ingredient_id = so.ingredient_id AND s2.remaining_quantity > 0 AND s2.unit_cost > 0
      ), 0)), 0) AS val
       FROM stock_out so
       LEFT JOIN stock_in si ON so.stock_in_id = si.id
       WHERE so.reason IN ('waste', 'expired')
         AND (so.note IS NULL OR so.note NOT LIKE '%[LƯU TẠM]%')
         AND so.created_at BETWEEN ? AND ?`,
      [startStr, endStr]
    );
    const wasteExpenses = Number(wasteRow[0].val);

    // 4. Refunds received from supplier returns (cash/transfer)
    const returnExpenseRow = await db.query(
      `SELECT COALESCE(SUM(so.quantity * COALESCE(si.unit_cost, 0)), 0) AS val
       FROM stock_out so
       LEFT JOIN stock_in si ON so.stock_in_id = si.id
       WHERE so.reason = 'return_to_supplier'
         AND (so.note NOT LIKE '%Trừ công nợ%' AND so.note NOT LIKE '%deduct%' AND (so.note IS NULL OR so.note NOT LIKE '%[LƯU TẠM]%'))
         AND so.created_at BETWEEN ? AND ?`,
      [startStr, endStr]
    );
    const returnRefunds = Number(returnExpenseRow[0].val);

    const totalExpenses = Math.max(0, paidImportExpenses + debtPaymentsExpense + wasteExpenses);
    const netProfit = totalIncome - totalExpenses;

    // 2) Recent Transactions
    const txRows = await db.query(
      `
      (
        SELECT 
          CONCAT('INV-', inv.id) as id,
          'income' as type,
          CONCAT('Thanh toán hóa đơn #', inv.order_id) as description,
          COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = inv.id), inv.total) as amount,
          inv.paid_at as date,
          'completed' as status,
          inv.order_id as orderId,
          NULL as ingredientName,
          NULL as quantity,
          NULL as unitCost,
          NULL as ingredientUnit,
          NULL as supplierName,
          NULL as isCredit,
          NULL as dueDate,
          NULL as batchCode,
          NULL as note,
          0 as returnedQuantity,
          0 as hasRefund,
          0 as refundedTotal,
          'invoice' as txSubType
        FROM invoices inv
        WHERE inv.status = 'paid' AND inv.paid_at BETWEEN ? AND ?
      )
      UNION ALL
      (
        SELECT 
          CONCAT('EXP-', si.id) as id,
          CASE 
            WHEN (si.note LIKE '%Cân bằng kho%' OR si.note LIKE '%hàng thừa%' OR si.batch_code LIKE 'LOT-ADJ-%') THEN 'income'
            ELSE 'expense'
          END as type,
          CASE 
            WHEN (si.note LIKE '%Cân bằng kho%' OR si.note LIKE '%hàng thừa%' OR si.batch_code LIKE 'LOT-ADJ-%') THEN CONCAT('Cân bằng kho (Hàng thừa): ', ing.name)
            ELSE CONCAT('Nhập kho: ', ing.name)
          END as description,
          (si.quantity * si.unit_cost) as amount,
          si.created_at as date,
          'completed' as status,
          NULL as orderId,
          ing.name as ingredientName,
          si.quantity as quantity,
          si.unit_cost as unitCost,
          ing.unit as ingredientUnit,
          sup.name as supplierName,
          si.is_credit as isCredit,
          si.due_date as dueDate,
          si.batch_code as batchCode,
          si.note as note,
          COALESCE((
            SELECT SUM(so.quantity) 
            FROM stock_out so 
            WHERE so.stock_in_id = si.id 
              AND so.reason = 'return_to_supplier' 
              AND so.note NOT LIKE '%[LƯU TẠM]%'
          ), 0) as returnedQuantity,
          NULL as hasRefund,
          NULL as refundedTotal,
          'stock_import' as txSubType
        FROM stock_in si
        JOIN ingredients ing ON si.ingredient_id = ing.id
        LEFT JOIN suppliers sup ON si.supplier_id = sup.id
        WHERE (si.is_credit IS NULL OR si.is_credit = 0)
          AND (si.note IS NULL OR si.note NOT LIKE '%[LƯU TẠM]%')
          AND si.created_at BETWEEN ? AND ?
      )
      UNION ALL
      (
        SELECT 
          CONCAT('PAY-', dp.id) as id,
          'expense' as type,
          CONCAT('Thanh toán nợ NCC: ', sup.name) as description,
          dp.amount as amount,
          dp.paid_at as date,
          'completed' as status,
          NULL as orderId,
          NULL as ingredientName,
          NULL as quantity,
          NULL as unitCost,
          NULL as ingredientUnit,
          sup.name as supplierName,
          0 as isCredit,
          NULL as dueDate,
          NULL as batchCode,
          dp.note as note,
          0 as returnedQuantity,
          NULL as hasRefund,
          NULL as refundedTotal,
          'debt_payment' as txSubType
        FROM debt_payments dp
        JOIN suppliers sup ON dp.supplier_id = sup.id
        WHERE dp.paid_at BETWEEN ? AND ?
      )
      UNION ALL
      (
        SELECT 
          CONCAT('WASTE-', so.id) as id,
          'expense' as type,
          CONCAT('Hao hụt/Xuất hủy: ', ing.name) as description,
          (so.quantity * COALESCE(si.unit_cost, (
            SELECT SUM(s2.unit_cost * s2.remaining_quantity) / NULLIF(SUM(s2.remaining_quantity), 0)
            FROM stock_in s2 WHERE s2.ingredient_id = so.ingredient_id AND s2.remaining_quantity > 0 AND s2.unit_cost > 0
          ), 0)) as amount,
          so.created_at as date,
          'completed' as status,
          NULL as orderId,
          ing.name as ingredientName,
          so.quantity as quantity,
          COALESCE(si.unit_cost, (
            SELECT SUM(s2.unit_cost * s2.remaining_quantity) / NULLIF(SUM(s2.remaining_quantity), 0)
            FROM stock_in s2 WHERE s2.ingredient_id = so.ingredient_id AND s2.remaining_quantity > 0 AND s2.unit_cost > 0
          ), 0) as unitCost,
          ing.unit as ingredientUnit,
          NULL as supplierName,
          0 as isCredit,
          NULL as dueDate,
          si.batch_code as batchCode,
          so.note as note,
          0 as returnedQuantity,
          NULL as hasRefund,
          NULL as refundedTotal,
          'waste' as txSubType
        FROM stock_out so
        JOIN ingredients ing ON so.ingredient_id = ing.id
        LEFT JOIN stock_in si ON so.stock_in_id = si.id
        WHERE so.reason IN ('waste', 'expired')
          AND (so.note IS NULL OR so.note NOT LIKE '%[LƯU TẠM]%')
          AND so.created_at BETWEEN ? AND ?
      )
      UNION ALL
      (
        SELECT 
          CONCAT('RET-', so.id) as id,
          'income' as type,
          CONCAT('Trả hàng NCC: ', ing.name) as description,
          (so.quantity * COALESCE(si.unit_cost, 0)) as amount,
          so.created_at as date,
          'completed' as status,
          NULL as orderId,
          ing.name as ingredientName,
          so.quantity as quantity,
          COALESCE(si.unit_cost, 0) as unitCost,
          ing.unit as ingredientUnit,
          sup.name as supplierName,
          0 as isCredit,
          NULL as dueDate,
          si.batch_code as batchCode,
          so.note as note,
          0 as returnedQuantity,
          NULL as hasRefund,
          NULL as refundedTotal,
          'return_supplier' as txSubType
        FROM stock_out so
        JOIN ingredients ing ON so.ingredient_id = ing.id
        LEFT JOIN stock_in si ON so.stock_in_id = si.id
        LEFT JOIN suppliers sup ON si.supplier_id = sup.id
        WHERE so.reason = 'return_to_supplier'
          AND (so.note NOT LIKE '%Trừ công nợ%' AND so.note NOT LIKE '%deduct%')
          AND so.created_at BETWEEN ? AND ?
      )
      ORDER BY date DESC
      LIMIT 100
      `,
      [startStr, endStr, startStr, endStr, startStr, endStr, startStr, endStr, startStr, endStr]
    );

    sendSuccess(
      res,
      {
        summary: { totalIncome, totalExpenses, netProfit },
        recentTransactions: txRows,
      },
      "Tải báo cáo tài chính thành công"
    );
  } catch (error) {
    console.error("Error fetching finance report:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

// ================================================================
// getLossDebtReport — ĐÃ CẬP NHẬT theo TASK 2
//  - system_stock lấy realtime từ ingredients.current_stock
//  - chỉ lấy bản ghi kiểm kê MỚI NHẤT của mỗi nguyên liệu
//  - hạn thanh toán dựa trên suppliers.payment_terms (không hardcode +7 ngày)
//  - trả thêm "summary" (tổng nợ, nợ quá hạn, số NCC...) cho FE dùng ở KPI cards
// ================================================================
export const getLossDebtReport = async (_req: Request, res: Response): Promise<void> => {
  try {
    // 1) Hao hụt: JOIN stock_inventory với ingredients để lấy current_stock realtime
    //    Chỉ lấy bản ghi kiểm kê mới nhất của mỗi nguyên liệu
    const varianceRows = await db.query(`
      SELECT 
        si.id,
        si.ingredient_id,
        i.name AS ingredientName,
        i.unit,
        si.actual_stock   AS actual,
        i.current_stock   AS expected,
        (si.actual_stock - i.current_stock) AS variance,
        si.noted_at
      FROM stock_inventory si
      JOIN ingredients i ON si.ingredient_id = i.id
      WHERE si.id IN (
        SELECT MAX(id) FROM stock_inventory GROUP BY ingredient_id
      )
      ORDER BY variance ASC
    `);

    // 2) Công nợ NCC: lấy tất cả NCC đang nợ (total_debt > 0) HOẶC đã từng nợ
    //    và đã tất toán (có lịch sử trong debt_payments) để hiển thị "Đã thanh toán"
    const debtRows = await db.query(`
      SELECT 
        s.id,
        s.name       AS supplierName,
        s.phone,
        s.total_debt AS amount,
        s.payment_terms
      FROM suppliers s
      WHERE s.total_debt > 0
         OR EXISTS (SELECT 1 FROM debt_payments dp WHERE dp.supplier_id = s.id)
      ORDER BY s.total_debt DESC
    `);

    const now = new Date();
    const supplierDebts = debtRows.map((r: any) => {
      const amount = Number(r.amount);
      const due = new Date(now);
      due.setDate(due.getDate() + (Number(r.payment_terms) || 30));
      const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Nợ đã về 0 → tất toán xong, không cần tính hạn/quá hạn nữa
      let status: string;
      if (amount === 0) {
        status = "Đã thanh toán";
      } else if (daysLeft < 0) {
        status = "Quá hạn";
      } else if (daysLeft <= 3) {
        status = "Sắp đến hạn";
      } else {
        status = "Chưa thanh toán";
      }

      return {
        id: `SUP-${r.id}`,
        rawId: r.id,
        supplierName: r.supplierName,
        phone: r.phone,
        amount,
        due: due.toISOString().split("T")[0],
        daysLeft,
        status,
      };
    });

    // 3) Tổng hợp summary — chỉ tính trên các NCC ĐANG còn nợ (amount > 0)
    const owingSuppliers = supplierDebts.filter((d: any) => d.amount > 0);
    const totalDebt = owingSuppliers.reduce((s: number, d: any) => s + d.amount, 0);
    const overdueDebt = owingSuppliers
      .filter((d: any) => d.status === "Quá hạn")
      .reduce((s: number, d: any) => s + d.amount, 0);

    // 4) Lịch sử thanh toán công nợ & Trả hàng NCC
    const recentPaymentRows = await db.query(`
      SELECT * FROM (
        SELECT 
          CONCAT('PAY-', dp.id)             AS id,
          'pay'                             AS category,
          dp.supplier_id                    AS supplierId,
          s.name                           AS supplierName,
          dp.amount                        AS amount,
          dp.method                        AS method,
          dp.note                          AS note,
          dp.proof_image                   AS proofImage,
          dp.paid_at                        AS paidAt,
          COALESCE(u.full_name, 'Hệ thống') AS paidByName,
          s.total_debt                     AS currentSupplierDebt
        FROM debt_payments dp
        JOIN suppliers s ON dp.supplier_id = s.id
        LEFT JOIN users u ON dp.paid_by = u.id

        UNION ALL

        SELECT 
          CONCAT('RET-', so.id)             AS id,
          'return'                          AS category,
          COALESCE(si.supplier_id, 0)       AS supplierId,
          COALESCE(sup.name, 'Nhà cung cấp') AS supplierName,
          (so.quantity * COALESCE(si.unit_cost, 0)) AS amount,
          'return_goods'                    AS method,
          CONCAT('Trả hàng: ', so.quantity, ' ', COALESCE(i.unit, 'kg'), ' ', COALESCE(i.name, 'Nguyên liệu'), IF(so.note IS NOT NULL AND so.note != '', CONCAT(' - ', so.note), '')) AS note,
          NULL                              AS proofImage,
          so.created_at                     AS paidAt,
          'Quản lý kho'                     AS paidByName,
          COALESCE(sup.total_debt, 0)       AS currentSupplierDebt
        FROM stock_out so
        JOIN ingredients i ON so.ingredient_id = i.id
        LEFT JOIN stock_in si ON so.stock_in_id = si.id
        LEFT JOIN suppliers sup ON si.supplier_id = sup.id
        WHERE so.reason IN ('return_supplier', 'return_to_supplier')
           OR so.note LIKE '%Trả hàng%'
           OR so.note LIKE '%TRẢ HÀNG%'
           OR so.reason LIKE '%Trả hàng%'
      ) combined_history
      ORDER BY paidAt DESC
      LIMIT 100
    `);

    sendSuccess(
      res,
      {
        variances: varianceRows.map((r: any) => ({
          id: r.id,
          ingredientName: r.ingredientName,
          unit: r.unit,
          expected: Number(r.expected),
          actual: Number(r.actual),
          variance: Number(r.variance),
          date: r.noted_at,
        })),
        supplierDebts,
        recentPayments: recentPaymentRows.map((r: any) => ({
          id: r.id,
          category: r.category,
          supplierId: r.supplierId,
          supplierName: r.supplierName,
          amount: Number(r.amount),
          method: r.method,
          note: r.note || "",
          proofImage: r.proofImage || null,
          paidAt: r.paidAt,
          paidByName: r.paidByName,
          currentSupplierDebt: Number(r.currentSupplierDebt || 0),
        })),
        summary: {
          totalDebt,
          overdueDebt,
          supplierCount: owingSuppliers.length,
          overdueCount: owingSuppliers.filter((d: any) => d.status === "Quá hạn").length,
        },
      },
      "Tải báo cáo hao hụt công nợ thành công"
    );
  } catch (error) {
    console.error("Error fetching loss debt report:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};