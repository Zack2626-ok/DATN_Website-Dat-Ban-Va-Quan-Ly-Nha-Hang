import { Router } from "express";
import {
  getResmanagerMenuItemsHandler,
  getResmanagerCategoriesHandler,
  getOrdersByTableHandler,
  getOrderItemsHandler,
  createResmanagerOrderHandler,
  addOrderItemHandler,
  voidOrderItemHandler,
  sendItemsToKitchenHandler,
} from "../controllers/waiter.controller";

const router = Router();

// Menu & Categories
router.get("/menu", getResmanagerMenuItemsHandler);
router.get("/categories", getResmanagerCategoriesHandler);

// Orders by table
router.get("/orders/by-table/:tableId", getOrdersByTableHandler);
router.get("/orders/:orderId/items", getOrderItemsHandler);
router.post("/orders", createResmanagerOrderHandler);
router.post("/orders/:orderId/items", addOrderItemHandler);
router.patch("/orders/:orderId/items/:itemId/void", voidOrderItemHandler);
router.post("/orders/:orderId/send-to-kitchen", sendItemsToKitchenHandler);

export default router;
