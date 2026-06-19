import { Router } from "express";
import {
  getKdsItemsHandler,
  updateKdsItemStatusHandler,
  updateKdsBatchStatusHandler,
  recallKdsItemStatusHandler,
  getKdsVoidAlertsHandler,
} from "../controllers/kds.controller";

const router = Router();

// Lấy danh sách món trong bếp
router.get("/items", getKdsItemsHandler);

// Cập nhật trạng thái một món ăn
router.patch("/items/:id/status", updateKdsItemStatusHandler);

// Cập nhật trạng thái theo mẻ (hàng loạt)
router.patch("/batch/status", updateKdsBatchStatusHandler);

// Hoàn tác trạng thái món ăn
router.post("/items/:id/recall", recallKdsItemStatusHandler);

// Lấy danh sách cảnh báo hủy món
router.get("/void-alerts", getKdsVoidAlertsHandler);

export default router;
