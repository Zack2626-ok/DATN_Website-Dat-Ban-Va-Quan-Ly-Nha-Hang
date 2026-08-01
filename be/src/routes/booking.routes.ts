import { Router } from "express";
import {
  getAllBookings,
  getAvailableTablesHandler,
  getBookingByIdHandler,
  createBookingHandler,
  updateBookingStatusHandler,
  deleteBookingHandler,
  payBookingDepositHandler,
} from "../controllers/booking.controller";

const router = Router();

router.get("/", getAllBookings);
router.get("/available-tables", getAvailableTablesHandler);
router.post("/", createBookingHandler);
router.get("/:id", getBookingByIdHandler);
router.patch("/:id/status", updateBookingStatusHandler);
router.delete("/:id", deleteBookingHandler);
router.patch("/:id/pay-deposit", payBookingDepositHandler);

export default router;
