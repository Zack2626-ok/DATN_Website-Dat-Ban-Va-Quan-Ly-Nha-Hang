import { Router } from "express";

import {
  getAllInventory,
  getInventoryById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  updateInventoryQuantity,
  getLowStockItems,
  getIngredientsList,
  getTransactionsList,
} from "../controllers/inventory.controller";

import {
  // ...các import cũ giữ nguyên...
  submitStockCheck,
  getTodayCheckList,
  paySupplierDebt,
  getDebtHistory,
} from "../controllers/inventory.controller";

const router = Router();

router.get("/", getAllInventory);
router.get("/ingredients", getIngredientsList);
router.get("/transactions", getTransactionsList);
router.get("/low-stock", getLowStockItems);
router.post("/", createInventoryItem);
router.get("/:id", getInventoryById);
router.patch("/:id", updateInventoryItem);
router.patch("/:id/quantity", updateInventoryQuantity);
router.delete("/:id", deleteInventoryItem);
router.get("/stock-check/today", getTodayCheckList);
router.post("/stock-check", submitStockCheck);
router.patch("/suppliers/:id/pay", paySupplierDebt);
router.get("/suppliers/:id/debt-history", getDebtHistory);

export default router;
