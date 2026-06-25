import { Router } from "express";
import {
  getTableAreasHandler,
  getResmanagerTablesHandler,
  getResmanagerTableHandler,
  updateResmanagerTableStatusHandler,
} from "../controllers/resmanager-table.controller";

const router = Router();

// GET /api/v1/tables/areas  — danh sách khu vực
router.get("/areas", getTableAreasHandler);

// GET /api/v1/tables?area_id=1  — tất cả bàn (lọc theo khu vực nếu có)
router.get("/", getResmanagerTablesHandler);

// GET /api/v1/tables/:id
router.get("/:id", getResmanagerTableHandler);

// PATCH /api/v1/tables/:id/status
router.patch("/:id/status", updateResmanagerTableStatusHandler);

export default router;
