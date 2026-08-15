import { Router } from "express";
import { payrollController } from "../controllers/payroll.controller";

const router = Router();

router.post("/calculate", payrollController.calculatePayroll);
router.get("/", payrollController.getPayrolls);
router.post("/:id/pay", payrollController.markAsPaid);

export default router;
