import { Router } from "express";
import multer from "multer";
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
  uploadExcel,
  getSuppliers,
  addSupplier,
  updateSupplier,
  deleteSupplier,
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
router.post("/upload-excel", upload.single("file"), uploadExcel);
router.get("/low-stock", getLowStockItems);
router.post("/", createInventoryItem);
router.get("/:id", getInventoryById);
router.patch("/:id", updateInventoryItem);
router.patch("/:id/quantity", updateInventoryQuantity);
router.delete("/:id", deleteInventoryItem);

export default router;
