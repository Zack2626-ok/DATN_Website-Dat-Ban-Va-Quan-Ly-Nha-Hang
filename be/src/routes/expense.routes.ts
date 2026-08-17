import { Router } from "express";
import { expenseController } from "../controllers/expense.controller";
import { authStaff, checkRole } from "../middlewares/authMiddleware";

const router = Router();

router.use(authStaff);
router.use(checkRole(["admin", "manager"]));

router.get("/", expenseController.getExpenses);
router.post("/", expenseController.createExpense);
router.delete("/:id", expenseController.deleteExpense);

export default router;
