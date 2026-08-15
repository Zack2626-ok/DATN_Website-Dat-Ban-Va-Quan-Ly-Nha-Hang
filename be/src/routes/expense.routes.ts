import { Router } from "express";
import { expenseController } from "../controllers/expense.controller";

const router = Router();

router.get("/", expenseController.getExpenses);
router.post("/", expenseController.createExpense);
router.delete("/:id", expenseController.deleteExpense);

export default router;
