import { Router } from "express";
import {
  getAllTables,
  getTableById,
  createTable,
  updateTable,
  deleteTable,
  getTablesByStatus,
} from "../controllers/table.controller";

const router = Router();

router.get("/", getAllTables);
router.get("/status/:status", getTablesByStatus);
router.post("/", createTable);
router.get("/:id", getTableById);
router.patch("/:id", updateTable);
router.delete("/:id", deleteTable);

export default router;
