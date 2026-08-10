import { Router } from "express";
import {
  acceptShiftSwapHandler,
  approveLeaveHandler,
  approveShiftSwapHandler,
  createLeaveHandler,
  createScheduleHandler,
  createShiftSwapHandler,
  createShiftTemplateHandler,
  deleteShiftTemplateHandler,
  getShiftPolicyHandler,
  getLeaveRequestsHandler,
  getMySchedulesHandler,
  getSchedulesHandler,
  getShiftTemplatesHandler,
  getShiftSwapRequestsHandler,
  getShiftSwapCandidatesHandler,
  getShiftSwapInboxHandler,
  updateShiftPolicyHandler,
  updateShiftTemplateHandler,
} from "../controllers/schedule.controller";
import { authStaff, checkRole } from "../middlewares/authMiddleware";
import { MANAGE_ATTENDANCE_ROLES } from "../controllers/attendance.controller";

const router = Router();

router.get("/", authStaff, checkRole(MANAGE_ATTENDANCE_ROLES), getSchedulesHandler);
router.get("/mine", authStaff, getMySchedulesHandler);
router.get("/templates", authStaff, checkRole(MANAGE_ATTENDANCE_ROLES), getShiftTemplatesHandler);
router.post("/templates", authStaff, checkRole(MANAGE_ATTENDANCE_ROLES), createShiftTemplateHandler);
router.patch("/templates/:id", authStaff, checkRole(MANAGE_ATTENDANCE_ROLES), updateShiftTemplateHandler);
router.delete("/templates/:id", authStaff, checkRole(MANAGE_ATTENDANCE_ROLES), deleteShiftTemplateHandler);
router.get("/policy", authStaff, checkRole(MANAGE_ATTENDANCE_ROLES), getShiftPolicyHandler);
router.patch("/policy", authStaff, checkRole(MANAGE_ATTENDANCE_ROLES), updateShiftPolicyHandler);
router.post("/", authStaff, checkRole(MANAGE_ATTENDANCE_ROLES), createScheduleHandler);
router.post("/swap", authStaff, createShiftSwapHandler);
router.get("/swap", authStaff, checkRole(MANAGE_ATTENDANCE_ROLES), getShiftSwapRequestsHandler);
router.get("/swap/candidates", authStaff, getShiftSwapCandidatesHandler);
router.get("/swap/inbox", authStaff, getShiftSwapInboxHandler);
router.patch("/swap/:id/accept", authStaff, acceptShiftSwapHandler);
router.post("/swap/:id/approve", authStaff, checkRole(MANAGE_ATTENDANCE_ROLES), approveShiftSwapHandler);
router.post("/leaves", authStaff, createLeaveHandler);
router.get("/leaves", authStaff, checkRole(MANAGE_ATTENDANCE_ROLES), getLeaveRequestsHandler);
router.patch("/leaves/:id/approve", authStaff, checkRole(MANAGE_ATTENDANCE_ROLES), approveLeaveHandler);

export default router;
