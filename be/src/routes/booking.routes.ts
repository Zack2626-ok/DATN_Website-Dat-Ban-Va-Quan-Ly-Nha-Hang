import { Router } from "express";
import {
  getAllBookings,
  getBookingByIdHandler,
  createBookingHandler,
  updateBookingStatusHandler,
} from "../controllers/booking.controller";

const router = Router();

router.get("/", getAllBookings);
router.post("/", createBookingHandler);
router.get("/:id", getBookingByIdHandler);
router.patch("/:id/status", updateBookingStatusHandler);

export default router;
