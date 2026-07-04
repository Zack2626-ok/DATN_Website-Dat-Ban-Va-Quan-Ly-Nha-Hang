import { Router } from "express";
import {
  getAllBookings,
  getBookingByIdHandler,
  createBookingHandler,
  updateBookingStatusHandler,
  deleteBookingHandler,
} from "../controllers/booking.controller";

const router = Router();

router.get("/", getAllBookings);
router.post("/", createBookingHandler);
router.get("/:id", getBookingByIdHandler);
router.patch("/:id/status", updateBookingStatusHandler);
router.delete("/:id", deleteBookingHandler);

export default router;
