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
    // a) Material Expenses
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

    // b) Payroll Expenses
    const payrollRow = await db.query(
      `SELECT COALESCE(SUM(total_salary), 0) AS val FROM payrolls WHERE status = 'paid' AND paid_at BETWEEN ? AND ?`,
      [startStr, endStr]
    );
    const salaryCost = Number(payrollRow[0].val);
    if (salaryCost > 0) {
      expenseItems.push({ category: 'Trả lương nhân viên', amount: salaryCost });
    }

    // c) Operational Expenses
      const opsExpenseRow = await db.query(
        `SELECT COALESCE(SUM(amount), 0) AS val FROM operational_expenses WHERE expense_date BETWEEN ? AND ? AND deleted_at IS NULL`,
        [startStr, endStr]
      );
    const operationalCost = Number(opsExpenseRow[0].val);
    if (operationalCost > 0) {
      expenseItems.push({ category: 'Chi phí vận hành', amount: operationalCost });
    }

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
    let start = new Date();
    start.setDate(1); // First day of current month
    start.setHours(0, 0, 0, 0);

    let end = new Date();
    end.setHours(23, 59, 59, 999);

    if (startDate) {
      start = new Date(startDate as string);
      start.setHours(0, 0, 0, 0);
    }
    if (endDate) {
      end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
    }

    const startStr = formatMySQLDateTime(start);
    const endStr = formatMySQLDateTime(end);

    // 1) Summary
    const incomeRow = await db.query(
      `SELECT COALESCE(SUM(total), 0) AS val FROM invoices WHERE status = 'paid' AND paid_at BETWEEN ? AND ?`,
      [startStr, endStr]
    );
    const totalIncome = Number(incomeRow[0].val);

    const stockInRow = await db.query(
      `SELECT COALESCE(SUM(
        CASE 
          WHEN is_credit = 1 AND (paid_amount IS NULL OR paid_amount = 0) THEN 0
          WHEN paid_amount IS NOT NULL AND paid_amount > 0 THEN paid_amount
          WHEN is_credit = 0 THEN (quantity * unit_cost)
          ELSE 0
        END
      ), 0) AS val FROM stock_in 
      WHERE (note IS NULL OR (note NOT LIKE '%[LƯU TẠM]%' AND note NOT LIKE '%[HOÀN THÀNH]%')) 
        AND created_at BETWEEN ? AND ?`,
      [startStr, endStr]
    );
    const directMaterialCost = Number(stockInRow[0].val);

    const debtPaymentSummaryRow = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS val FROM debt_payments WHERE paid_at BETWEEN ? AND ?`,
      [startStr, endStr]
    );
    const debtCost = Number(debtPaymentSummaryRow[0].val);

    const materialCost = directMaterialCost + debtCost;

    const payrollRow = await db.query(
      `SELECT COALESCE(SUM(total_salary), 0) AS val FROM payrolls WHERE status = 'paid' AND paid_at BETWEEN ? AND ?`,
      [startStr, endStr]
    );
    const salaryCost = Number(payrollRow[0].val);

    const opsExpenseRow = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS val FROM operational_expenses WHERE expense_date BETWEEN ? AND ? AND deleted_at IS NULL`,
      [startStr, endStr]
    );
    const operationalCost = Number(opsExpenseRow[0].val);

    const totalExpenses = materialCost + salaryCost + operationalCost;
    const netProfit = totalIncome - totalExpenses;

    // 2) Recent Transactions
    // Invoices (Thu từ bán hàng)
    const invoiceRows = await db.query(
      `SELECT 
        CONCAT('INV-', id) as id,
        id as orderId,
        'income' as type,
        'invoice' as txSubType,
        CONCAT('Thanh toán hóa đơn #', id) as description,
        total as amount,
        paid_at as date,
        'completed' as status
      FROM invoices 
      WHERE status = 'paid' AND paid_at BETWEEN ? AND ?`,
      [startStr, endStr]
    );

    // Stock In (Chi phí nhập nguyên liệu / hàng hóa thực tế đã chi)
    const stockInTxRows = await db.query(
      `SELECT 
        CONCAT('EXP-MAT-', si.id) as id,
        'expense' as type,
        'stock_in' as txSubType,
        COALESCE(si.note, 'Nhập nguyên liệu') as description,
        (CASE 
          WHEN si.is_credit = 1 AND (si.paid_amount IS NULL OR si.paid_amount = 0) THEN 0
          WHEN si.paid_amount IS NOT NULL AND si.paid_amount > 0 THEN si.paid_amount
          WHEN si.is_credit = 0 THEN (si.quantity * si.unit_cost)
          ELSE 0
        END) as amount,
        (si.quantity * si.unit_cost) as totalImportCost,
        COALESCE(si.paid_amount, (CASE WHEN si.is_credit = 0 THEN (si.quantity * si.unit_cost) ELSE 0 END)) as paidAmount,
        si.created_at as date,
        'completed' as status,
        si.batch_code as batchCode,
        si.batch_code as batchNo,
        si.quantity,
        si.unit_cost as unitCost,
        si.note,
        si.proof_image as proofImage,
        i.name as ingredientName,
        i.unit as ingredientUnit,
        COALESCE(s.name, 'Nhà cung cấp') as supplierName,
        si.is_credit as isCredit,
        si.due_date as dueDate,
        COALESCE(
          (SELECT SUM(so.quantity) FROM stock_out so 
           WHERE so.stock_in_id = si.id 
             AND so.reason = 'return_to_supplier'
             AND (so.note IS NULL OR (so.note NOT LIKE '%[LƯU TẠM]%' AND so.note NOT LIKE '%[HOÀN THÀNH]%'))
          ),
          0
        ) as returnedQuantity
      FROM stock_in si
      LEFT JOIN ingredients i ON si.ingredient_id = i.id
      LEFT JOIN suppliers s ON si.supplier_id = s.id
      WHERE si.created_at BETWEEN ? AND ?
        AND (si.note IS NULL OR (si.note NOT LIKE '%[LƯU TẠM]%' AND si.note NOT LIKE '%[HOÀN THÀNH]%'))`,
      [startStr, endStr]
    );

    // Debt Payments (Chi trả nợ NCC)
    const debtPaymentRows = await db.query(
      `SELECT 
        CONCAT('EXP-DEBT-', dp.id) as id,
        'expense' as type,
        'debt_payment' as txSubType,
        CONCAT('Thanh toán công nợ NCC: ', s.name) as description,
        dp.amount as amount,
        dp.paid_at as date,
        'completed' as status,
        dp.note as note,
        s.name as supplierName,
        dp.method as method,
        dp.proof_image as proofImage
      FROM debt_payments dp
      JOIN suppliers s ON dp.supplier_id = s.id
      WHERE dp.paid_at BETWEEN ? AND ?`,
      [startStr, endStr]
    );

    // Payrolls (Chi lương)
    const payrollRows = await db.query(
      `SELECT 
        CONCAT('EXP-SAL-', p.id) as id,
        'expense' as type,
        'payroll' as txSubType,
        CONCAT('Trả lương nhân viên ', u.full_name, ' tháng ', p.month, '/', p.year) as description,
        p.total_salary as amount,
        p.paid_at as date,
        'completed' as status,
        u.full_name as employeeName
      FROM payrolls p
      JOIN users u ON p.user_id = u.id
      WHERE p.status = 'paid' AND p.paid_at BETWEEN ? AND ?`,
      [startStr, endStr]
    );

    // Operational expenses (Chi phí vận hành)
    const opsRows = await db.query(
      `SELECT 
        CONCAT('EXP-OPS-', id) as id,
        'expense' as type,
        'operational' as txSubType,
        title as description,
        amount,
        expense_date as date,
        'completed' as status,
        category
      FROM operational_expenses 
      WHERE expense_date BETWEEN ? AND ? AND deleted_at IS NULL`,
      [startStr, endStr]
    );

    // Stock Out - Trả hàng NCC (Thu hoàn tiền) - chỉ tính các phiếu ĐÃ XÁC NHẬN TRẢ HÀNG
    const returnStockOutRows = await db.query(
      `SELECT 
        CONCAT('RET-', so.id) as id,
        (CASE 
          WHEN si.is_credit = 1 AND (si.paid_amount IS NULL OR si.paid_amount = 0) THEN 'debt_deduction'
          ELSE 'income'
        END) as type,
        'return_supplier' as txSubType,
        COALESCE(so.note, 'Xuất trả hàng NCC') as description,
        (CASE 
          WHEN si.is_credit = 1 AND (si.paid_amount IS NULL OR si.paid_amount = 0) THEN 0
          WHEN si.is_credit = 1 THEN LEAST(COALESCE(si.paid_amount, 0), (so.quantity * COALESCE(si.unit_cost, 0)))
          ELSE (so.quantity * COALESCE(si.unit_cost, 0))
        END) as amount,
        (so.quantity * COALESCE(si.unit_cost, 0)) as returnTotal,
        so.created_at as date,
        'completed' as status,
        so.quantity,
        COALESCE(si.unit_cost, 0) as unitCost,
        i.name as ingredientName,
        i.unit as ingredientUnit,
        si.batch_code as batchCode,
        COALESCE(s.name, 'Nhà cung cấp') as supplierName,
        si.is_credit as isCredit,
        COALESCE(si.paid_amount, 0) as paidAmount,
        so.note
      FROM stock_out so
      JOIN stock_in si ON so.stock_in_id = si.id
      JOIN ingredients i ON so.ingredient_id = i.id
      LEFT JOIN suppliers s ON si.supplier_id = s.id
      WHERE so.reason = 'return_to_supplier'
        AND (so.note IS NULL OR (so.note NOT LIKE '%[LƯU TẠM]%' AND so.note NOT LIKE '%[HOÀN THÀNH]%'))
        AND so.created_at BETWEEN ? AND ?`,
      [startStr, endStr]
    );

    const txRows = [
      ...invoiceRows,
      ...stockInTxRows,
      ...debtPaymentRows,
      ...payrollRows,
      ...opsRows,
      ...returnStockOutRows,
    ].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    sendSuccess(
      res,
      {
        summary: { totalIncome, totalExpenses, netProfit, materialCost, salaryCost, operationalCost },
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
// getLossDebtReport — Báo cáo hao hụt & công nợ nhà cung cấp
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

    // 2) Công nợ NCC theo từng Phiếu Nhập / Khoản Nợ riêng biệt
    const creditSlips = await db.query<any[]>(`
      SELECT 
        si.id,
        si.supplier_id as supplierId,
        COALESCE(s.name, 'Nhà cung cấp') as supplierName,
        s.phone,
        si.created_at as importDate,
        si.due_date as dueDate,
        (si.quantity * si.unit_cost) as itemTotal,
        COALESCE(si.paid_amount, 0) as itemPaid,
        si.note,
        si.batch_code as batchCode,
        si.proof_image as proofImage,
        i.name as ingredientName,
        i.unit as ingredientUnit,
        si.quantity,
        si.unit_cost as unitCost
      FROM stock_in si
      LEFT JOIN suppliers s ON si.supplier_id = s.id
      LEFT JOIN ingredients i ON si.ingredient_id = i.id
      WHERE (si.is_credit = 1 OR si.paid_amount > 0)
        AND (si.note IS NULL OR (si.note NOT LIKE '%[LƯU TẠM]%' AND si.note NOT LIKE '%[HOÀN THÀNH]%'))
      ORDER BY si.created_at DESC
    `);

    // Group items into Slips
    const slipMap: Record<string, any> = {};
    creditSlips.forEach((row: any) => {
      const ticketMatch = (row.note || "").match(/\[SLIP:([^\]]+)\]/);
      const ticketCode = ticketMatch ? ticketMatch[1] : (row.batchCode ? `PN-${row.batchCode}` : `PN-${row.id}`);

      if (!slipMap[ticketCode]) {
        slipMap[ticketCode] = {
          id: ticketCode,
          ticketCode: ticketCode,
          supplierId: row.supplierId,
          supplierName: row.supplierName,
          phone: row.phone,
          importDate: row.importDate,
          dueDate: row.dueDate ? new Date(row.dueDate).toISOString().split("T")[0] : null,
          totalAmount: 0,
          paidAmount: 0,
          remainingDebt: 0,
          proofImage: row.proofImage,
          items: [],
        };
      }

      slipMap[ticketCode].totalAmount += Number(row.itemTotal || 0);
      slipMap[ticketCode].paidAmount += Number(row.itemPaid || 0);
      if (!slipMap[ticketCode].proofImage && row.proofImage) {
        slipMap[ticketCode].proofImage = row.proofImage;
      }
      slipMap[ticketCode].items.push({
        ingredientName: row.ingredientName,
        quantity: row.quantity,
        unit: row.ingredientUnit,
        unitCost: row.unitCost,
        amount: row.itemTotal
      });
    });

    const now = new Date();
    const supplierDebts = Object.values(slipMap).map((slip: any) => {
      const remainingDebt = Math.max(0, slip.totalAmount - slip.paidAmount);
      let daysLeft: number | null = null;
      let status = "Chưa chốt hạn";

      if (remainingDebt === 0) {
        status = "Đã thanh toán";
      } else if (slip.dueDate) {
        const due = new Date(slip.dueDate);
        daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft < 0) {
          status = "Quá hạn";
        } else if (daysLeft <= 3) {
          status = "Sắp đến hạn";
        } else {
          status = "Chưa thanh toán";
        }
      }

      return {
        id: slip.ticketCode,
        rawId: slip.supplierId,
        ticketCode: slip.ticketCode,
        supplierName: slip.supplierName,
        supplierId: slip.supplierId,
        phone: slip.phone,
        amount: remainingDebt,
        totalAmount: slip.totalAmount,
        paidAmount: slip.paidAmount,
        importDate: slip.importDate,
        dueDate: slip.dueDate,
        due: slip.dueDate,
        daysLeft,
        status,
        proofImage: slip.proofImage,
        items: slip.items
      };
    }).filter((slip: any) => slip.amount > 0);

    // 3) Lịch sử thanh toán nợ & Trả hàng NCC & Thanh toán trước lúc nhập kho
    const paymentRows = await db.query(`
      SELECT 
        CONCAT('PC-NCC-', dp.id) AS id,
        dp.id AS rawId,
        dp.supplier_id AS supplierId,
        s.name AS supplierName,
        COALESCE(dp.remaining_debt, s.total_debt) AS currentSupplierDebt,
        dp.amount,
        dp.method,
        dp.note,
        dp.paid_at AS paidAt,
        dp.proof_image AS proofImage,
        'payment' AS category
      FROM debt_payments dp
      JOIN suppliers s ON dp.supplier_id = s.id
      WHERE COALESCE(dp.is_deleted, 0) = 0
      ORDER BY dp.paid_at DESC
      LIMIT 100
    `);

    // Giao dịch thanh toán trước lúc nhập hàng (tổng hợp theo từng phiếu nhập để tránh lặp dòng nguyên liệu)
    const upfrontPayments: any[] = [];
    Object.values(slipMap).forEach((slip: any) => {
      if (slip.paidAmount > 0) {
        upfrontPayments.push({
          id: `PN-TT-${slip.ticketCode}`,
          rawId: slip.supplierId,
          supplierId: slip.supplierId,
          supplierName: slip.supplierName,
          currentSupplierDebt: Math.max(0, slip.totalAmount - slip.paidAmount),
          amount: slip.paidAmount,
          method: "bank_transfer",
          note: `Thanh toán trả trước lúc tạo phiếu nhập [${slip.ticketCode}]`,
          paidAt: slip.importDate,
          proofImage: slip.proofImage,
          category: "payment"
        });
      }
    });

    const returnRows = await db.query(`
      SELECT 
        CONCAT('TH-NCC-', so.id) AS id,
        so.id AS rawId,
        si.supplier_id AS supplierId,
        COALESCE(s.name, 'Nhà cung cấp') AS supplierName,
        COALESCE(s.total_debt, 0) AS currentSupplierDebt,
        (so.quantity * COALESCE(si.unit_cost, 0)) AS amount,
        'return' AS method,
        so.note,
        so.created_at AS paidAt,
        NULL AS proofImage,
        'return' AS category
      FROM stock_out so
      JOIN stock_in si ON so.stock_in_id = si.id
      LEFT JOIN suppliers s ON si.supplier_id = s.id
      WHERE so.reason = 'return_to_supplier'
        AND (so.note IS NULL OR so.note NOT LIKE '%[DELETED]%')
      ORDER BY so.created_at DESC
      LIMIT 100
    `);

    const recentPayments = [...paymentRows, ...upfrontPayments, ...returnRows]
      .sort((a: any, b: any) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
      .slice(0, 50);

    // 4) Tổng hợp summary — tính trên các khoản nợ thực tế
    const owingSlips = supplierDebts.filter((d: any) => d.amount > 0);
    const totalDebt = owingSlips.reduce((s: number, d: any) => s + d.amount, 0);
    const overdueDebt = owingSlips
      .filter((d: any) => d.status === "Quá hạn")
      .reduce((s: number, d: any) => s + d.amount, 0);

    const uniqueOwingSuppliers = new Set(owingSlips.map((d: any) => d.supplierId || d.supplierName));
    const uniqueOverdueSuppliers = new Set(
      owingSlips.filter((d: any) => d.status === "Quá hạn").map((d: any) => d.supplierId || d.supplierName)
    );

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
        recentPayments,
        summary: {
          totalDebt,
          overdueDebt,
          supplierCount: uniqueOwingSuppliers.size,
          overdueCount: uniqueOverdueSuppliers.size,
          slipCount: owingSlips.length,
        },
      },
      "Tải báo cáo hao hụt công nợ thành công"
    );
  } catch (error) {
    console.error("Error fetching loss debt report:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};