import { Request, Response } from "express";
import * as db from "../utils/db";
import { io } from "../server";

// ==================== 1. BÁO CÁO THỐNG KÊ (ANALYTICS) ====================

export const getDetailedReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const startFilter = startDate ? `${startDate} 00:00:00` : null;
    const endFilter = endDate ? `${endDate} 23:59:59` : null;

    // 1. Tổng doanh thu & tổng đơn hoàn thành (từ bảng invoices status = 'paid')
    let kpiSql = `
      SELECT
        COALESCE(SUM(total), 0) AS totalRevenue,
        COUNT(id) AS totalCompletedOrders
      FROM invoices
      WHERE status = 'paid'
    `;
    const kpiParams: any[] = [];
    if (startFilter && endFilter) {
      kpiSql += ` AND (paid_at BETWEEN ? AND ? OR created_at BETWEEN ? AND ?)`;
      kpiParams.push(startFilter, endFilter, startFilter, endFilter);
    }
    const kpiResult: any = await db.query(kpiSql, kpiParams);

    let totalRevenue = Number(kpiResult[0]?.totalRevenue ?? 0);
    let totalCompletedOrders = Number(kpiResult[0]?.totalCompletedOrders ?? 0);

    // Fallback if invoices has 0 row
    if (totalRevenue === 0 && totalCompletedOrders === 0) {
      const orderKpi: any = await db.query(
        `SELECT
          COALESCE(SUM(total_amount), 0) AS totalRevenue,
          COUNT(id) AS totalCompletedOrders
        FROM orders
        WHERE status IN ('completed', 'paid')`
      );
      totalRevenue = Number(orderKpi[0]?.totalRevenue ?? 0);
      totalCompletedOrders = Number(orderKpi[0]?.totalCompletedOrders ?? 0);
    }

    // 2. Bàn đang phục vụ (occupied tables)
    const occupiedTablesRows: any = await db.query(
      `SELECT COUNT(id) AS occupiedTables FROM tables WHERE status IN ('serving', 'occupied', 'pending_payment', 'reserved')`
    );

    // 3. Đơn hàng đang xử lý
    const activeOrdersRows: any = await db.query(
      `SELECT COUNT(id) AS activeOrdersCount FROM orders WHERE status IN ('open', 'serving', 'pending_payment')`
    );

    // 4. Đặt bàn chờ xử lý (booking stats)
    const bookingStatsRaw: any = await db.query(
      `SELECT status, COUNT(id) AS count FROM bookings GROUP BY status`
    );
    const bookingStats = (Array.isArray(bookingStatsRaw) ? bookingStatsRaw : []).map((b: any) => ({
      status: b.status,
      count: Number(b.count || 0),
    }));

    // 5. Doanh thu 7 ngày qua (Revenue by date) - Compatible with ONLY_FULL_GROUP_BY
    const revenueByDateRaw: any = await db.query(
      `SELECT
        DATE_FORMAT(report_date, '%d/%m') AS date,
        report_date AS rawDate,
        COALESCE(SUM(total), 0) AS totalRevenue,
        COUNT(id) AS totalOrders
      FROM (
        SELECT id, total, status, DATE(COALESCE(paid_at, created_at)) AS report_date
        FROM invoices
        WHERE status = 'paid' AND COALESCE(paid_at, created_at) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      ) AS sub
      GROUP BY report_date
      ORDER BY report_date ASC`
    );

    let rawList = Array.isArray(revenueByDateRaw) ? revenueByDateRaw : [];

    // Fallback revenue by date from orders if invoices daily query is empty
    if (rawList.length === 0) {
      const ordersDaily: any = await db.query(
        `SELECT
          DATE_FORMAT(report_date, '%d/%m') AS date,
          report_date AS rawDate,
          COALESCE(SUM(total_amount), 0) AS totalRevenue,
          COUNT(id) AS totalOrders
        FROM (
          SELECT id, total_amount, status, DATE(created_at) AS report_date
          FROM orders
          WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        ) AS sub
        GROUP BY report_date
        ORDER BY report_date ASC`
      );
      if (Array.isArray(ordersDaily) && ordersDaily.length > 0) {
        rawList = ordersDaily;
      }
    }

    const revenueByDate = rawList.map((row: any) => ({
      date: row.date,
      totalRevenue: Number(row.totalRevenue || 0),
      totalOrders: Number(row.totalOrders || 0),
    }));

    // 6. Top 5 món bán chạy nhất
    const topItemsRaw: any = await db.query(
      `SELECT
        mi.id,
        mi.name,
        COALESCE(SUM(oi.quantity), 0) AS totalQty,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS totalRevenue
      FROM order_items oi
      JOIN menu_items mi ON mi.id = oi.menu_item_id
      LEFT JOIN orders o ON o.id = oi.order_id
      GROUP BY mi.id, mi.name
      ORDER BY totalQty DESC
      LIMIT 5`
    );

    const topItems = (Array.isArray(topItemsRaw) ? topItemsRaw : []).map((row: any) => ({
      id: Number(row.id),
      name: row.name,
      totalQty: Number(row.totalQty || 0),
      totalRevenue: Number(row.totalRevenue || 0),
    }));

    return res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        totalCompletedOrders,
        activeOrdersCount: Number(activeOrdersRows[0]?.activeOrdersCount ?? 0),
        occupiedTables: Number(occupiedTablesRows[0]?.occupiedTables ?? 0),
        revenueByDate,
        bookingStats,
        topItems,
      },
    });
  } catch (error: any) {
    console.error("Lỗi khi lấy báo cáo manager dashboard:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== 2. CẤU HÌNH HỆ THỐNG (SYSTEM SETTINGS) ====================

export const getSystemSettings = async (_req: Request, res: Response) => {
  try {
    const info = await db.getRestaurantInfo();
    return res.status(200).json({ success: true, data: info });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSystemSettings = async (req: Request, res: Response) => {
  try {
    const updated = await db.updateRestaurantInfo(req.body);
    try {
      io.emit("restaurant_info_updated", updated);
      io.emit("settings_updated", updated);
      io.emit("invoice:updated");
      io.emit("order_updated");
    } catch {}
    return res.status(200).json({ success: true, data: updated, message: "Cập nhật cấu hình hệ thống thành công!" });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};