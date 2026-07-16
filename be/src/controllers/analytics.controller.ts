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

    const eventRevRow = await db.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS val FROM event_contracts WHERE status IN ('confirmed', 'completed') AND event_date BETWEEN DATE(?) AND DATE(?)`,
      [startStr, endStr]
    );
    const eventRevenue = Number(eventRevRow[0].val);

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

    // Add event contract revenues into bank_transfer stats
    const eventCountRow = await db.query(
      `SELECT COUNT(*) AS count, SUM(total_amount) AS total 
       FROM event_contracts 
       WHERE status IN ('confirmed', 'completed') AND event_date BETWEEN DATE(?) AND DATE(?)`,
      [startStr, endStr]
    );
    payStatsMap.bank_transfer.count += Number(eventCountRow[0].count);
    payStatsMap.bank_transfer.total += Number(eventCountRow[0].total);

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
      `SELECT COALESCE(i.category, 'Chưa phân loại') as category, SUM(si.quantity * si.price) AS amount
       FROM stock_in si
       JOIN ingredients i ON si.ingredient_id = i.id
       WHERE si.created_at BETWEEN ? AND ?
       GROUP BY i.category
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
