import { Router } from "express";
import {
  createOrderHandler,
  getOrdersHandler,
  updateOrderStatusHandler,
} from "../controllers/order.controller";

const router = Router();

// Create order
router.post("/", createOrderHandler);

// Get all orders
router.get("/", getOrdersHandler);

// Update status
router.patch("/:id/status", updateOrderStatusHandler);

export default router;
