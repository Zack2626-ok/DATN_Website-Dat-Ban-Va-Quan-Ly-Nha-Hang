import { Router } from "express";
import { getBookingValidationHandler, updateBookingValidationHandler } from "../controllers/system-settings.controller";

const router = Router();

router.get("/booking-validation", getBookingValidationHandler);
router.post("/booking-validation", updateBookingValidationHandler);

export default router;
