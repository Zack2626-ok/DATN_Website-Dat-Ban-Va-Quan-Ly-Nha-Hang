import { Router } from "express";
import { clockIn, clockInEmployeeByManager, clockOut, clockOutEmployeeByManager, getAllAttendance, getAttendanceEmployees, getMyAttendance, getMyWorkSummary, isCheckedInToday, MANAGE_ATTENDANCE_ROLES } from "../controllers/attendance.controller";
import { authStaff, checkRole } from "../middlewares/authMiddleware";
import { checkClockInScheduleMiddleware, checkClockOutScheduleMiddleware } from "../middlewares/attendanceSchedule.middleware";

const router = Router();

router.get("/", authStaff, checkRole(MANAGE_ATTENDANCE_ROLES), getAllAttendance);
router.get("/employees", authStaff, checkRole(MANAGE_ATTENDANCE_ROLES), getAttendanceEmployees);
router.get("/me", authStaff, getMyAttendance);
router.get("/summary", authStaff, getMyWorkSummary);
router.get("/status", authStaff, isCheckedInToday);
router.post("/clock-in", authStaff, checkClockInScheduleMiddleware, clockIn);
router.post("/clock-out", authStaff, checkClockOutScheduleMiddleware, clockOut);
router.post("/employee/clock-in", authStaff, checkRole(MANAGE_ATTENDANCE_ROLES), checkClockInScheduleMiddleware, clockInEmployeeByManager);
router.post("/employee/clock-out", authStaff, checkRole(MANAGE_ATTENDANCE_ROLES), checkClockOutScheduleMiddleware, clockOutEmployeeByManager);
export default router;
