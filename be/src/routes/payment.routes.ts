import { Router } from "express";
import {
  getAllPayments,
  getPaymentById,
  getPaymentsByOrderId,
  createPayment,
  updatePaymentStatus,
  getPaymentDetails,
  getPaymentStatistics,
  applyDiscount,
} from "../controllers/payment.controller";

const router = Router();

router.get("/", getAllPayments);
router.get("/statistics", getPaymentStatistics);
router.get("/order/:orderId", getPaymentsByOrderId);
router.get("/details/:orderId", getPaymentDetails);
router.get("/:id", getPaymentById);
router.post("/", createPayment);
router.patch("/:id/status", updatePaymentStatus);
router.patch("/:id/discount", applyDiscount);

export default router;
