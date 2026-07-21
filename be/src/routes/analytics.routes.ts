import { Router } from "express";
import { getDashboardAnalytics } from "../controllers/analytics.controller";

const router = Router();

// Endpoint lấy toàn bộ dữ liệu báo cáo kinh doanh cho quản lý
router.get("/dashboard", getDashboardAnalytics);

export default router;
