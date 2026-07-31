import { Router } from "express";
import { getMyAttendance, clockIn, clockOut, isCheckedInToday } from "../controllers/attendance.controller";
import { authStaff } from "../middlewares/authMiddleware";

const router = Router();

router.get("/me", authStaff, getMyAttendance);
router.get("/status", authStaff, isCheckedInToday);
router.post("/clock-in", authStaff, clockIn);
router.post("/clock-out", authStaff, clockOut);

export default router;
