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
  initiateBankTransfer,
  processBankTransferWebhook,
  simulateBankTransferPayment,
} from "../controllers/payment.controller";
import { authStaff, checkRole } from "../middlewares/authMiddleware";

const router = Router();

router.get("/", getAllPayments);
router.get("/statistics", getPaymentStatistics);
router.get("/order/:orderId", getPaymentsByOrderId);
router.get("/details/:orderId", getPaymentDetails);
router.post("/bank-transfer/initiate", authStaff, checkRole(["manager", "cashier", "admin"]), initiateBankTransfer);
router.post(
  "/bank-transfer/:paymentId/simulate",
  authStaff,
  checkRole(["manager", "cashier", "admin"]),
  simulateBankTransferPayment,
);
router.post("/webhook", processBankTransferWebhook);
router.get("/:id", getPaymentById);
router.post("/", createPayment);
router.patch("/:id/status", updatePaymentStatus);
router.patch("/:id/discount", applyDiscount);

export default router;
