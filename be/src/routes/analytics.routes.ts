import { Router } from "express";
import { getDashboardAnalytics, getFinanceReport, getLossDebtReport } from "../controllers/analytics.controller";
import { authStaff, checkRole } from "../middlewares/authMiddleware";

const router = Router();

// Endpoint lấy toàn bộ dữ liệu báo cáo kinh doanh cho quản lý/admin
router.use(authStaff);
router.use(checkRole(["admin", "manager"]));

router.get("/dashboard", getDashboardAnalytics);
router.get("/finance-report", getFinanceReport);
router.get("/loss-debt", getLossDebtReport);

export default router;
