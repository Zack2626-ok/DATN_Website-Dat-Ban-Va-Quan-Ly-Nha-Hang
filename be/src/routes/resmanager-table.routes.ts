import { Router } from "express";
import {
  getTableAreasHandler,
  getResmanagerTablesHandler,
  getEmptyTablesHandler,
  getResmanagerTableHandler,
  updateResmanagerTableStatusHandler,
  transferTableHandler,
  mergeTableHandler,
  unmergeTableHandler,
  splitTableHandler,
} from "../controllers/resmanager-table.controller";

const router = Router();

// GET /api/v1/tables/areas  — danh sách khu vực
router.get("/areas", getTableAreasHandler);

// GET /api/v1/tables/empty - bàn trống
router.get("/empty", getEmptyTablesHandler);

// GET /api/v1/tables?area_id=1  — tất cả bàn (lọc theo khu vực nếu có)
router.get("/", getResmanagerTablesHandler);

// GET /api/v1/tables/:id
router.get("/:id", getResmanagerTableHandler);

// PATCH /api/v1/tables/:id/status
router.patch("/:id/status", updateResmanagerTableStatusHandler);

// POST /api/v1/tables/:id/transfer
router.post("/:id/transfer", transferTableHandler);

// POST /api/v1/tables/:id/merge
router.post("/:id/merge", mergeTableHandler);

// DELETE /api/v1/tables/:id/merge
router.delete("/:id/merge", unmergeTableHandler);

// POST /api/v1/tables/:id/split
router.post("/:id/split", splitTableHandler);

export default router;
