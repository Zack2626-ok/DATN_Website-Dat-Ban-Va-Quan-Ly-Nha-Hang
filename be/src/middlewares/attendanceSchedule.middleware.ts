import type { NextFunction, Request, RequestHandler, Response } from "express";
import { SCHEDULE_STATUS, SHIFT_TIME, SHIFT_TIME_ERROR_CODE } from "../constants/shiftTime";
import { getEmployeeSchedulesForDate, getShiftPolicy } from "../repositories/schedule.repository";
import type { ScheduleRecord } from "../repositories/schedule.repository";

/** Formats an instant as a calendar date in the restaurant's operating timezone. */
const getVietnamDate = (value: Date): string => new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Ho_Chi_Minh",
}).format(value);

/** Builds an instant in Vietnam timezone from a schedule date and HH:mm time. */
const getShiftInstant = (date: string, time: string): Date => new Date(`${date}T${time}:00+07:00`);

/** Selects the relevant split-shift window for a clock action at the current instant. */
const selectScheduleForAction = (schedules: ScheduleRecord[], action: "clock-in" | "clock-out", now: Date): ScheduleRecord | null => {
  if (schedules.length === 0) return null;
  const getBoundary = (schedule: ScheduleRecord): number => getShiftInstant(
    schedule.work_date,
    action === "clock-in" ? schedule.start_time ?? "00:00" : schedule.end_time ?? "23:59",
  ).getTime();
  const pastSchedules = schedules.filter((schedule) => getBoundary(schedule) <= now.getTime());
  if (pastSchedules.length > 0) return pastSchedules[pastSchedules.length - 1];
  return schedules[0];
};

/** Gets the employee being clocked from either the session or a manager terminal payload. */
const getAttendanceEmployeeId = (req: Request): number | null => {
  const requestedId = Number(req.body.employee_id);
  if (Number.isInteger(requestedId) && requestedId > 0) return requestedId;
  const sessionId = Number(req.user?.userId);
  return Number.isInteger(sessionId) && sessionId > 0 ? sessionId : null;
};

/** Sends a consistent policy failure without touching the legacy attendance controller. */
const sendAttendancePolicyError = (res: Response, code: string, message: string): void => {
  res.status(400).json({ success: false, code, message });
};

export interface AttendanceTimingMetadata {
  scheduleId: number | null;
  isLate: boolean;
  lateReason: string | null;
  isEarly: boolean;
  earlyReason: string | null;
}

/** Checks the assigned shift and validates late or early declarations before attendance is recorded. */
const checkAttendanceTiming = (action: "clock-in" | "clock-out"): RequestHandler => async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const employeeId = getAttendanceEmployeeId(req);
  if (!employeeId) {
    next();
    return;
  }

  try {
    const now = new Date();
    const schedule = selectScheduleForAction(
      await getEmployeeSchedulesForDate(employeeId, getVietnamDate(now)),
      action,
      now,
    );
    if (!schedule) {
      res.locals.attendanceTiming = {
        scheduleId: null,
        isLate: false,
        lateReason: null,
        isEarly: false,
        earlyReason: null,
      } satisfies AttendanceTimingMetadata;
      next();
      return;
    }
    if (schedule.status === SCHEDULE_STATUS.CANCELLED) {
      sendAttendancePolicyError(res, SHIFT_TIME_ERROR_CODE.SCHEDULE_CANCELLED, "Ca trực hôm nay đã bị hủy do lịch nghỉ phép.");
      return;
    }

    const policy = await getShiftPolicy();
    const graceMilliseconds = policy.grace_minutes * 60_000;
    const boundary = action === "clock-in"
      ? getShiftInstant(schedule.work_date, schedule.start_time ?? "00:00")
      : getShiftInstant(schedule.work_date, schedule.end_time ?? "23:59");
    const explanation = action === "clock-in" ? req.body.late_reason : req.body.early_reason;
    const requiresExplanation = action === "clock-in"
      ? now.getTime() > boundary.getTime() + graceMilliseconds
      : now.getTime() < boundary.getTime() - graceMilliseconds;
    const reasonRequired = action === "clock-in" ? policy.require_late_reason : policy.require_early_reason;
    if (requiresExplanation && reasonRequired && (typeof explanation !== "string" || !explanation.trim())) {
      const code = action === "clock-in"
        ? SHIFT_TIME_ERROR_CODE.LATE_REASON_REQUIRED
        : SHIFT_TIME_ERROR_CODE.EARLY_REASON_REQUIRED;
      const message = action === "clock-in"
        ? `Bạn đi muộn quá ${policy.grace_minutes} phút, vui lòng nhập lý do đi muộn.`
        : `Bạn về sớm quá ${policy.grace_minutes} phút, vui lòng nhập lý do về sớm.`;
      sendAttendancePolicyError(res, code, message);
      return;
    }
    const trimmedExplanation = typeof explanation === "string" ? explanation.trim() : "";
    res.locals.attendanceTiming = {
      scheduleId: schedule.id,
      isLate: action === "clock-in" && requiresExplanation,
      lateReason: action === "clock-in" && trimmedExplanation ? trimmedExplanation : null,
      isEarly: action === "clock-out" && requiresExplanation,
      earlyReason: action === "clock-out" && trimmedExplanation ? trimmedExplanation : null,
    } satisfies AttendanceTimingMetadata;
    next();
  } catch (error) {
    console.error("attendance:schedule-policy", error);
    res.status(500).json({ success: false, code: "ATTENDANCE_POLICY_FAILED", message: "Không thể kiểm tra quy định ca làm." });
  }
};

/** Validates schedule rules before a clock-in route reaches its existing controller. */
export const checkClockInScheduleMiddleware = checkAttendanceTiming("clock-in");

/** Validates schedule rules before a clock-out route reaches its existing controller. */
export const checkClockOutScheduleMiddleware = checkAttendanceTiming("clock-out");
