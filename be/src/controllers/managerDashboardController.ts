  import { Request, Response } from 'express';
  import * as db from '../utils/db';

  // ==================== 1. BÁO CÁO THỐNG KÊ (ANALYTICS) ====================

  export const getDetailedReport = async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? `${startDate} 00:00:00` : '1970-01-01 00:00:00';
      const end = endDate ? `${endDate} 23:59:59` : '2099-12-31 23:59:59';

      const [revenueByDate]: any = await db.query(
        `SELECT
          DATE_FORMAT(o.created_at, '%Y-%m-%d') AS date,
          COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS totalRevenue,
          COUNT(DISTINCT o.id) AS totalOrders
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status = 'completed' AND o.created_at BETWEEN ? AND ?
        GROUP BY DATE_FORMAT(o.created_at, '%Y-%m-%d')
        ORDER BY date ASC`,
        [start, end],
      );

      const [kpiResult]: any = await db.query(
        `SELECT
          COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS totalRevenue,
          COUNT(DISTINCT o.id) AS totalCompletedOrders
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status = 'completed' AND o.created_at BETWEEN ? AND ?`,
        [start, end],
      );

      const [bookingStats]: any = await db.query(
        `SELECT status, COUNT(id) AS count
        FROM bookings
        WHERE created_at BETWEEN ? AND ?
        GROUP BY status`,
        [start, end],
      );

      const [activeOrdersRows]: any = await db.query(
        `SELECT COUNT(id) AS activeOrdersCount FROM orders WHERE status NOT IN ('completed','cancelled')`,
      );

      const [occupiedTablesRows]: any = await db.query(
        `SELECT COUNT(id) AS occupiedTables FROM tables WHERE status IN ('serving','pending_payment')`,
      );

      const [topItems]: any = await db.query(
        `SELECT
          mi.id,
          mi.name,
          SUM(oi.quantity) AS totalQty,
          SUM(oi.quantity * oi.unit_price) AS totalRevenue
        FROM order_items oi
        JOIN menu_items mi ON mi.id = oi.menu_item_id
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status = 'completed' AND o.created_at BETWEEN ? AND ?
        GROUP BY mi.id, mi.name
        ORDER BY totalQty DESC
        LIMIT 5`,
        [start, end],
      );

      return res.status(200).json({
        success: true,
        data: {
          totalRevenue: Number(kpiResult[0]?.totalRevenue ?? 0),
          totalCompletedOrders: Number(kpiResult[0]?.totalCompletedOrders ?? 0),
          activeOrdersCount: Number(activeOrdersRows[0]?.activeOrdersCount ?? 0),
          occupiedTables: Number(occupiedTablesRows[0]?.occupiedTables ?? 0),
          revenueByDate,
          bookingStats,
          topItems,
        },
      });
    } catch (error: any) {
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
      return res.status(200).json({ success: true, data: updated, message: 'Cập nhật cấu hình hệ thống thành công!' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };