import { Router } from "express";
import { clockIn, clockInEmployeeByManager, clockOut, clockOutEmployeeByManager, getAllAttendance, getAttendanceEmployees, getMyAttendance, isCheckedInToday, MANAGE_ATTENDANCE_ROLES } from "../controllers/attendance.controller";
import { authStaff, checkRole } from "../middlewares/authMiddleware";

const router = Router();

router.get("/", authStaff, checkRole(MANAGE_ATTENDANCE_ROLES), getAllAttendance);
router.get("/employees", authStaff, checkRole(MANAGE_ATTENDANCE_ROLES), getAttendanceEmployees);
router.get("/me", authStaff, getMyAttendance);
router.get("/status", authStaff, isCheckedInToday);
router.post("/clock-in", authStaff, clockIn);
router.post("/clock-out", authStaff, clockOut);
router.post("/employee/clock-in", authStaff, checkRole(MANAGE_ATTENDANCE_ROLES), clockInEmployeeByManager);
router.post("/employee/clock-out", authStaff, checkRole(MANAGE_ATTENDANCE_ROLES), clockOutEmployeeByManager);

export default router;
