import { Router } from "express";
import {
  getTableAreasHandler,
  getResmanagerTablesHandler,
  getEmptyTablesHandler,
  getResmanagerTableHandler,
  getTableBookingScheduleHandler,
  checkInTableBookingHandler,
  getActiveOrderForTableHandler,
  updateResmanagerTableStatusHandler,
  transferTableHandler,
  mergeTableHandler,
  arrangeGroupSeatingHandler,
  unmergeTableHandler,
  splitTableHandler,
  unsplitTableHandler,
  getTableSplitsHandler,
  moveSplitItemsHandler,
  createResmanagerTableHandler,
  updateResmanagerTableHandler,
  deleteResmanagerTableHandler,
  openResmanagerTabHandler,
} from "../controllers/resmanager-table.controller";

const router = Router();

// GET /api/v1/tables/areas  — danh sách khu vực
router.get("/areas", getTableAreasHandler);

// GET /api/v1/tables/empty - bàn trống
router.get("/empty", getEmptyTablesHandler);

// GET /api/v1/tables?area_id=1  — tất cả bàn (lọc theo khu vực nếu có)
router.get("/", getResmanagerTablesHandler);

// POST /api/v1/tables - Thêm bàn mới
router.post("/", createResmanagerTableHandler);

// POST /api/v1/tables/tab - Mở Tab nhanh (Takeaway/Bar)
router.post("/tab", openResmanagerTabHandler);

// GET /api/v1/tables/:id
router.get("/:id/active-order", getActiveOrderForTableHandler);
router.get("/:id/booking-schedule", getTableBookingScheduleHandler);
router.post("/:id/bookings/:bookingId/check-in", checkInTableBookingHandler);
router.get("/:id", getResmanagerTableHandler);

// PATCH /api/v1/tables/:id - Sửa bàn
router.patch("/:id", updateResmanagerTableHandler);

// PATCH /api/v1/tables/:id/delete - Xóa mềm bàn
router.patch("/:id/delete", deleteResmanagerTableHandler);

// PATCH /api/v1/tables/:id/status
router.patch("/:id/status", updateResmanagerTableStatusHandler);

// POST /api/v1/tables/:id/transfer
router.post("/:id/transfer", transferTableHandler);

// POST /api/v1/tables/:id/merge
router.post("/:id/merge", mergeTableHandler);

// POST /api/v1/tables/:id/group-seating
router.post("/:id/group-seating", arrangeGroupSeatingHandler);

// DELETE /api/v1/tables/:id/merge
router.delete("/:id/merge", unmergeTableHandler);

// GET /api/v1/tables/:id/splits
router.get("/:id/splits", getTableSplitsHandler);

// POST /api/v1/tables/:id/split
router.post("/:id/split", splitTableHandler);

// DELETE /api/v1/tables/:id/split - Hủy tách bàn
router.delete("/:id/split", unsplitTableHandler);

// POST /api/v1/tables/:id/split/items/move
router.post("/:id/split/items/move", moveSplitItemsHandler);

export default router;
