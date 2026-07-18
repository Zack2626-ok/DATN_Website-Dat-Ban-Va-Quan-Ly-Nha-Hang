import { Router } from "express";
import {
  getAllTables,
  getTableById,
  createTable,
  updateTable,
  deleteTable,
  getTablesByStatus,
  getTableAreasHandler,
} from "../controllers/table.controller";

const router = Router();

// Table areas
router.get("/table-areas", getTableAreasHandler);

// Table list
router.get("/", getAllTables);

router.get("/status/:status", getTablesByStatus);
router.post("/", createTable);
router.get("/:id", getTableById);
router.patch("/:id", updateTable);
router.delete("/:id", deleteTable);

export default router;
