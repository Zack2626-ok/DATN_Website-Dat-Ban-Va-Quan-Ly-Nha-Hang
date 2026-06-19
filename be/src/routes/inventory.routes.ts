import { Router } from "express";
import {
  getAllInventory,
  getInventoryById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  updateInventoryQuantity,
  getLowStockItems,
} from "../controllers/inventory.controller";

const router = Router();

router.get("/", getAllInventory);
router.get("/low-stock", getLowStockItems);
router.post("/", createInventoryItem);
router.get("/:id", getInventoryById);
router.patch("/:id", updateInventoryItem);
router.patch("/:id/quantity", updateInventoryQuantity);
router.delete("/:id", deleteInventoryItem);

export default router;
