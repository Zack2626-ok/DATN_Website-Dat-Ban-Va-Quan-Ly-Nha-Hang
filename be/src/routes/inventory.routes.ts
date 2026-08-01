import { Router } from "express";
import multer from "multer";
import {
  getAllInventory,
  getInventoryById,
  getIngredientBatches,
  wasteExpiredBatches,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  updateInventoryQuantity,
  getLowStockItems,
  getIngredientsList,
  getTransactionsList,
  uploadExcel,
  getSuppliers,
  addSupplier,
  updateSupplier,
  deleteSupplier,
} from "../controllers/inventory.controller";

import {
  // ...các import cũ giữ nguyên...
  submitStockCheck,
  getTodayCheckList,
  paySupplierDebt,
  getDebtHistory,
} from "../controllers/inventory.controller";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", getAllInventory);
router.get("/ingredients", getIngredientsList);
router.get("/transactions", getTransactionsList);
router.get("/suppliers", getSuppliers);
router.post("/suppliers", addSupplier);
router.put("/suppliers/:id", updateSupplier);
router.delete("/suppliers/:id", deleteSupplier);
router.post("/upload-excel", upload.single("file") as any, uploadExcel);
router.get("/low-stock", getLowStockItems);
router.post("/", createInventoryItem);
router.post("/waste-expired", wasteExpiredBatches);
router.get("/:id", getInventoryById);
router.get("/:id/batches", getIngredientBatches);
router.patch("/:id", updateInventoryItem);
router.patch("/:id/quantity", updateInventoryQuantity);
router.delete("/:id", deleteInventoryItem);
router.get("/stock-check/today", getTodayCheckList);
router.post("/stock-check", submitStockCheck);
router.patch("/suppliers/:id/pay", paySupplierDebt);
router.get("/suppliers/:id/debt-history", getDebtHistory);

export default router;
