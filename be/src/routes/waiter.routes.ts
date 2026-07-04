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
  holdOrderItemsHandler,
  getWaiterNotificationsHandler,
  markItemServedHandler,
} from "../controllers/waiter.controller";

const router = Router();

// Menu & Categories
router.get("/menu", getResmanagerMenuItemsHandler);
router.get("/categories", getResmanagerCategoriesHandler);

// Notifications — món đã xong cần mang ra bàn
router.get("/notifications", getWaiterNotificationsHandler);

// Orders by table
router.get("/orders/by-table/:tableId", getOrdersByTableHandler);
router.get("/orders/:orderId/items", getOrderItemsHandler);
router.post("/orders", createResmanagerOrderHandler);
router.post("/orders/:orderId/items", addOrderItemHandler);
router.patch("/orders/:orderId/items/:itemId/void", voidOrderItemHandler);
router.patch("/orders/:orderId/items/:itemId/served", markItemServedHandler);
router.post("/orders/:orderId/send-to-kitchen", sendItemsToKitchenHandler);
router.post("/orders/:orderId/hold-items", holdOrderItemsHandler);

export default router;
