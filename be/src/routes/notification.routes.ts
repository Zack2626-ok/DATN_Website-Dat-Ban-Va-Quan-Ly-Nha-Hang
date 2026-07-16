import { Router } from "express";
import {
  getNotificationsHandler,
  markAsReadHandler,
  clearNotificationsHandler,
} from "../controllers/notification.controller";

const router = Router();

// Lấy danh sách thông báo
router.get("/", getNotificationsHandler);

// Đánh dấu đã đọc một thông báo
router.patch("/:id/read", markAsReadHandler);

// Đánh dấu đã đọc tất cả thông báo
router.post("/clear", clearNotificationsHandler);

export default router;
