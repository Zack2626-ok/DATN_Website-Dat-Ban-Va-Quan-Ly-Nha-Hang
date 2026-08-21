import { Router } from "express";
import { expenseController } from "../controllers/expense.controller";
import { authStaff, checkRole } from "../middlewares/authMiddleware";

const router = Router();

router.use(authStaff);
router.use(checkRole(["admin", "manager"]));

router.get("/", expenseController.getExpenses);
router.get("/deleted", expenseController.getDeletedExpenses);
router.post("/", expenseController.createExpense);
router.post("/import", expenseController.importExpenses);
router.delete("/:id", expenseController.deleteExpense);
router.patch("/:id/restore", expenseController.restoreExpense);
router.delete("/:id/permanent", expenseController.permanentDeleteExpense);

export default router;
