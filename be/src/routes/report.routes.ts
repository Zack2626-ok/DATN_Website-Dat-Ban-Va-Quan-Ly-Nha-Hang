import { Router } from "express";
import { getRevenueOverview, getPaymentMethods, getTopSellingItems, getCashFlow, getPeakHours } from "../controllers/report.controller";

const router = Router();

router.get("/revenue-overview", getRevenueOverview);
router.get("/payment-methods", getPaymentMethods);
router.get("/top-items", getTopSellingItems);
router.get("/cash-flow", getCashFlow);
router.get("/peak-hours", getPeakHours);

export default router;
