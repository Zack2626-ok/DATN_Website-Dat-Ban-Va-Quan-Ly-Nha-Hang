import { Router } from "express";
import {
  getAllInvoices,
  getInvoiceById,
  processPayment,
  cancelInvoice,
  splitBillEqual,
  splitBillByItems,
  mergeBills,
  payPartial,
  getInvoicePayments,
} from "../controllers/invoice.controller";

const router = Router();

router.get("/", getAllInvoices);
router.get("/:id", getInvoiceById);
router.get("/:id/payments", getInvoicePayments);
router.post("/:id/pay", processPayment);
router.post("/:id/pay-partial", payPartial);
router.patch("/:id/cancel", cancelInvoice);
router.post("/:id/split-equal", splitBillEqual);
router.post("/:id/split-items", splitBillByItems);
router.post("/merge", mergeBills);

export default router;
