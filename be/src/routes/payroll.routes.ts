import { Router } from "express";
import { payrollController } from "../controllers/payroll.controller";
import { authStaff, checkRole } from "../middlewares/authMiddleware";

const router = Router();

router.use(authStaff);
router.use(checkRole(["admin", "manager"]));

router.post("/calculate", payrollController.calculatePayroll);
router.get("/", payrollController.getPayrolls);
router.post("/:id/pay", payrollController.markAsPaid);

export default router;
