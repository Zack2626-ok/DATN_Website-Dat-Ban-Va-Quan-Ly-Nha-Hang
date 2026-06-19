import { Router } from "express";
import {
  createOrderHandler,
  getOrdersHandler,
  updateOrderStatusHandler,
} from "../controllers/order.controller";

const router = Router();

router.post("/", createOrderHandler);
router.get("/", getOrdersHandler);
router.patch("/:id/status", updateOrderStatusHandler);

export default router;
