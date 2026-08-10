import { Router } from "express";
import {
  getAllBookings,
  getBookingScheduleHandler,
  getAvailableTablesHandler,
  getBookingByIdHandler,
  createBookingHandler,
  createDirectBookingHandler,
  updateBookingStatusHandler,
  deleteBookingHandler,
  payBookingDepositHandler,
} from "../controllers/booking.controller";
import { authStaff, checkRole } from "../middlewares/authMiddleware";
import { BOOKING_SCHEDULE_ROLES, DIRECT_BOOKING_ROLES } from "../constants/booking";
import { checkOnlineBookingTimeMiddleware } from "../middlewares/shiftTime.middleware";

const router = Router();

router.get("/", getAllBookings);
router.get("/available-tables", getAvailableTablesHandler);
router.get("/schedule", authStaff, checkRole(BOOKING_SCHEDULE_ROLES), getBookingScheduleHandler);
router.post("/", checkOnlineBookingTimeMiddleware, createBookingHandler);
router.post("/direct", authStaff, checkRole(DIRECT_BOOKING_ROLES), createDirectBookingHandler);
router.get("/:id", getBookingByIdHandler);
router.patch("/:id/status", updateBookingStatusHandler);
router.delete("/:id", deleteBookingHandler);
router.patch("/:id/pay-deposit", payBookingDepositHandler);

export default router;
