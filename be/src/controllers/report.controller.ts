import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendSuccess, sendError } from "../utils/response";

export const getRevenueOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const startStr = startDate ? String(startDate) : undefined;
    const endStr = endDate ? String(endDate) : undefined;

    // 1. Get timeline data (by date)
    const timeline = await db.getDbRevenueOverview(startStr, endStr);

    // 2. Calculate summary KPIs
    let totalRevenue = 0;
    timeline.forEach(t => {
      totalRevenue += t.revenue;
    });

    let dineInRevenue = 0;
    let takeawayRevenue = 0;
    let deliveryRevenue = 0;

    const dbAvailable = db.isDbAvailable();

    if (dbAvailable) {
      const conditions: string[] = ["p.status = 'completed'"];
      const params: any[] = [];
      if (startStr) {
        conditions.push("p.createdAt >= ?");
        params.push(startStr);
      }
      if (endStr) {
        conditions.push("p.createdAt <= ?");
        params.push(endStr);
      }
      const whereClause = conditions.join(" AND ");

      const typeBreakdown = await db.query<any[]>(
        `SELECT o.order_type, SUM(p.amount) AS total
         FROM payments p
         JOIN orders o ON p.orderId = o.id
         WHERE ${whereClause}
         GROUP BY o.order_type`,
        params
      );
      typeBreakdown.forEach(row => {
        if (row.order_type === "dine_in") dineInRevenue = Number(row.total);
        else if (row.order_type === "takeaway") takeawayRevenue = Number(row.total);
        else if (row.order_type === "delivery") deliveryRevenue = Number(row.total);
      });
    } else {
      dineInRevenue = Math.round(totalRevenue * 0.6);
      takeawayRevenue = Math.round(totalRevenue * 0.25);
      deliveryRevenue = Math.round(totalRevenue * 0.15);
    }

    // 2c. Event contracts revenue
    let eventRevenue = 0;
    if (dbAvailable) {
      const conditions: string[] = ["status IN ('confirmed', 'completed')"];
      const params: any[] = [];
      if (startStr) {
        conditions.push("event_date >= ?");
        params.push(startStr);
      }
      if (endStr) {
        conditions.push("event_date <= ?");
        params.push(endStr);
      }
      const whereClause = conditions.join(" AND ");

      const eventRows = await db.query<any[]>(
        `SELECT SUM(total_amount) AS total
         FROM event_contracts
         WHERE ${whereClause}`,
        params
      );
      eventRevenue = eventRows[0]?.total ? Number(eventRows[0].total) : 0;
    } else {
      eventRevenue = 25000000;
    }

    // 2d. Total orders count
    let totalOrders = 0;
    if (dbAvailable) {
      const conditions: string[] = ["status = 'completed'"];
      const params: any[] = [];
      if (startStr) {
        conditions.push("created_at >= ?");
        params.push(startStr);
      }
      if (endStr) {
        conditions.push("created_at <= ?");
        params.push(endStr);
      }
      const whereClause = conditions.join(" AND ");

      const orderRows = await db.query<any[]>(
        `SELECT COUNT(*) AS count
         FROM orders
         WHERE ${whereClause}`,
        params
      );
      totalOrders = orderRows[0]?.count ? Number(orderRows[0].count) : 0;
    } else {
      timeline.forEach(t => {
        totalOrders += t.orderCount;
      });
    }

    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    sendSuccess(res, {
      kpis: {
        totalRevenue,
        dineInRevenue,
        takeawayRevenue,
        deliveryRevenue,
        eventRevenue,
        totalOrders,
        averageOrderValue
      },
      timeline
    }, "Lấy dữ liệu doanh thu thành công");
  } catch (error) {
    console.error("Error in getRevenueOverview:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getPaymentMethods = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const startStr = startDate ? String(startDate) : undefined;
    const endStr = endDate ? String(endDate) : undefined;

    const stats = await db.getDbPaymentMethods(startStr, endStr);
    sendSuccess(res, stats, "Lấy thống kê phương thức thanh toán thành công");
  } catch (error) {
    console.error("Error in getPaymentMethods:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getTopSellingItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const startStr = startDate ? String(startDate) : undefined;
    const endStr = endDate ? String(endDate) : undefined;

    const items = await db.getDbTopItems(startStr, endStr);
    sendSuccess(res, items, "Lấy top sản phẩm bán chạy thành công");
  } catch (error) {
    console.error("Error in getTopSellingItems:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getCashFlow = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const startStr = startDate ? String(startDate) : undefined;
    const endStr = endDate ? String(endDate) : undefined;

    const cashFlow = await db.getDbCashFlow(startStr, endStr);
    sendSuccess(res, cashFlow, "Lấy báo cáo dòng tiền thành công");
  } catch (error) {
    console.error("Error in getCashFlow:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getPeakHours = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const startStr = startDate ? String(startDate) : undefined;
    const endStr = endDate ? String(endDate) : undefined;

    const peakHours = await db.getDbPeakHours(startStr, endStr);
    sendSuccess(res, peakHours, "Lấy thống kê lưu lượng giờ cao điểm thành công");
  } catch (error) {
    console.error("Error in getPeakHours:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};
