import type { Request, Response } from "express";
import { SHIFT_TIME_ERROR_CODE } from "../constants/shiftTime";
import {
  acceptShiftSwap,
  approveLeave,
  approveShiftSwap,
  createShiftTemplate,
  createLeave,
  createSchedule,
  createShiftSwap,
  deleteShiftTemplate,
  getShiftPolicy,
  listLeaveRequests,
  listMySchedules,
  listShiftTemplates,
  listSchedules,
  listShiftSwapCandidates,
  listShiftSwapInbox,
  listShiftSwapRequests,
  updateShiftPolicy,
  updateShiftTemplate,
} from "../repositories/schedule.repository";

/** Sends time-centre API failures in one shape for the manager screen. */
const sendScheduleError = (res: Response, code: string, message: string, status = 400): void => {
  res.status(status).json({ success: false, code, message });
};

/** Safely turns a request field into a positive integer identifier. */
const readPositiveId = (value: unknown): number | null => {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
};

/** Ensures a date is submitted in the database-safe YYYY-MM-DD format. */
const readWorkDate = (value: unknown): string | null => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
};

/** Validates HH:mm values used by reusable shift templates. */
const readTime = (value: unknown): string | null => (
  typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : null
);

/** Validates one shift-template body and keeps HTTP concerns out of the repository. */
const readTemplateInput = (body: Record<string, unknown>): { name: string; startTime: string; endTime: string } | null => {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const startTime = readTime(body.start_time);
  const endTime = readTime(body.end_time);
  return name && startTime && endTime && startTime < endTime ? { name, startTime, endTime } : null;
};

/** Lists schedules for the management screen. */
export const getSchedulesHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json({ success: true, data: await listSchedules() });
  } catch (error) {
    console.error("schedule:list", error);
    sendScheduleError(res, "SCHEDULE_LIST_FAILED", "Không thể tải danh sách phân ca.", 500);
  }
};

/** Lists the signed-in employee's scheduled shifts for browser-based self-service. */
export const getMySchedulesHandler = async (req: Request, res: Response): Promise<void> => {
  const employeeId = req.user?.userId;
  if (!employeeId) {
    sendScheduleError(res, "SCHEDULE_AUTH_REQUIRED", "Không xác định được nhân viên.", 401);
    return;
  }
  try {
    res.json({ success: true, data: await listMySchedules(Number(employeeId)) });
  } catch (error) {
    console.error("schedule:mine", error);
    sendScheduleError(res, "SCHEDULE_LIST_FAILED", "Không thể tải ca làm việc của bạn.", 500);
  }
};

/** Lists same-day coworker shifts that the signed-in employee may request to exchange. */
export const getShiftSwapCandidatesHandler = async (req: Request, res: Response): Promise<void> => {
  const employeeId = req.user?.userId;
  const scheduleId = readPositiveId(req.query.schedule_id);
  if (!employeeId || !scheduleId) {
    sendScheduleError(res, "SHIFT_SWAP_INPUT_INVALID", "Ca làm việc không hợp lệ.");
    return;
  }
  try {
    res.json({ success: true, data: await listShiftSwapCandidates(Number(employeeId), scheduleId) });
  } catch (error) {
    console.error("schedule:swap:candidates", error);
    sendScheduleError(res, "SHIFT_SWAP_CANDIDATE_LIST_FAILED", "Không thể tải ca có thể đổi.", 500);
  }
};

/** Lists shift exchanges awaiting the signed-in employee's acceptance. */
export const getShiftSwapInboxHandler = async (req: Request, res: Response): Promise<void> => {
  const employeeId = req.user?.userId;
  if (!employeeId) {
    sendScheduleError(res, "SHIFT_SWAP_INPUT_INVALID", "Không xác định được nhân viên.", 401);
    return;
  }
  try {
    res.json({ success: true, data: await listShiftSwapInbox(Number(employeeId)) });
  } catch (error) {
    console.error("schedule:swap:inbox", error);
    sendScheduleError(res, "SHIFT_SWAP_INBOX_FAILED", "Không thể tải yêu cầu đổi ca.", 500);
  }
};

/** Lists configured lunch and dinner shift templates for the manager form. */
export const getShiftTemplatesHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json({ success: true, data: await listShiftTemplates() });
  } catch (error) {
    console.error("schedule:templates", error);
    sendScheduleError(res, "SHIFT_TEMPLATE_LIST_FAILED", "Không thể tải mẫu ca làm việc.", 500);
  }
};

/** Creates a shift template for reusable weekly scheduling. */
export const createShiftTemplateHandler = async (req: Request, res: Response): Promise<void> => {
  const input = readTemplateInput(req.body as Record<string, unknown>);
  if (!input) {
    sendScheduleError(res, "SHIFT_TEMPLATE_INPUT_INVALID", "Tên ca và giờ bắt đầu/kết thúc hợp lệ là bắt buộc.");
    return;
  }
  try {
    res.status(201).json({ success: true, data: await createShiftTemplate(input) });
  } catch (error) {
    sendScheduleError(res, "SHIFT_TEMPLATE_CREATE_FAILED", (error as Error).message, 400);
  }
};

/** Updates a reusable shift template when it does not invalidate existing schedules. */
export const updateShiftTemplateHandler = async (req: Request, res: Response): Promise<void> => {
  const templateId = readPositiveId(req.params.id);
  const input = readTemplateInput(req.body as Record<string, unknown>);
  if (!templateId || !input) {
    sendScheduleError(res, "SHIFT_TEMPLATE_INPUT_INVALID", "Mẫu ca hoặc dữ liệu giờ không hợp lệ.");
    return;
  }
  const updated = await updateShiftTemplate(templateId, input);
  if (!updated) {
    sendScheduleError(res, "SHIFT_TEMPLATE_NOT_FOUND", "Không tìm thấy mẫu ca.", 404);
    return;
  }
  res.json({ success: true, message: "Đã cập nhật mẫu ca." });
};

/** Deletes an unused shift template. */
export const deleteShiftTemplateHandler = async (req: Request, res: Response): Promise<void> => {
  const templateId = readPositiveId(req.params.id);
  if (!templateId) {
    sendScheduleError(res, "SHIFT_TEMPLATE_INPUT_INVALID", "Mẫu ca không hợp lệ.");
    return;
  }
  try {
    const deleted = await deleteShiftTemplate(templateId);
    if (!deleted) {
      sendScheduleError(res, "SHIFT_TEMPLATE_NOT_FOUND", "Không tìm thấy mẫu ca.", 404);
      return;
    }
    res.json({ success: true, message: "Đã xóa mẫu ca." });
  } catch (error) {
    sendScheduleError(res, "SHIFT_TEMPLATE_IN_USE", "Mẫu ca đã được phân công, không thể xóa.");
  }
};

/** Returns the manager-configured attendance grace and explanation policy. */
export const getShiftPolicyHandler = async (_req: Request, res: Response): Promise<void> => {
  res.json({ success: true, data: await getShiftPolicy() });
};

/** Updates attendance grace and explanation requirements. */
export const updateShiftPolicyHandler = async (req: Request, res: Response): Promise<void> => {
  const graceMinutes = Number(req.body.grace_minutes);
  const requireLateReason = Boolean(req.body.require_late_reason);
  const requireEarlyReason = Boolean(req.body.require_early_reason);
  if (!Number.isInteger(graceMinutes) || graceMinutes < 0 || graceMinutes > 120) {
    sendScheduleError(res, "SHIFT_POLICY_INPUT_INVALID", "Thời gian ân hạn phải từ 0 đến 120 phút.");
    return;
  }
  res.json({ success: true, data: await updateShiftPolicy({ grace_minutes: graceMinutes, require_late_reason: requireLateReason, require_early_reason: requireEarlyReason }) });
};

/** Assigns a shift template after the overlap rule is checked by the repository. */
export const createScheduleHandler = async (req: Request, res: Response): Promise<void> => {
  const employeeId = readPositiveId(req.body.employee_id);
  const shiftId = readPositiveId(req.body.shift_id);
  const workDate = readWorkDate(req.body.work_date);
  if (!employeeId || !shiftId || !workDate) {
    sendScheduleError(res, "SCHEDULE_INPUT_INVALID", "employee_id, shift_id và work_date là bắt buộc.");
    return;
  }

  try {
    const schedule = await createSchedule({ employeeId, shiftId, workDate });
    res.status(201).json({ success: true, data: schedule, message: "Đã phân ca cho nhân viên." });
  } catch (error) {
    if ((error as Error).message === SHIFT_TIME_ERROR_CODE.SHIFT_OVERLAPPED) {
      sendScheduleError(res, SHIFT_TIME_ERROR_CODE.SHIFT_OVERLAPPED, "Nhân viên đã có ca bị chồng giờ trong ngày này.");
      return;
    }
    console.error("schedule:create", error);
    sendScheduleError(res, "SCHEDULE_CREATE_FAILED", "Không thể phân ca cho nhân viên.", 500);
  }
};

/** Creates the first step of a staff-to-staff schedule exchange. */
export const createShiftSwapHandler = async (req: Request, res: Response): Promise<void> => {
  const requesterId = req.user?.userId;
  const targetEmployeeId = readPositiveId(req.body.target_employee_id);
  const requesterScheduleId = readPositiveId(req.body.requester_schedule_id);
  const targetScheduleId = readPositiveId(req.body.target_schedule_id);
  if (!requesterId || !targetEmployeeId || !requesterScheduleId || !targetScheduleId) {
    sendScheduleError(res, "SHIFT_SWAP_INPUT_INVALID", "Thiếu thông tin ca hoặc nhân viên cần đổi.");
    return;
  }

  try {
    const id = await createShiftSwap(Number(requesterId), targetEmployeeId, requesterScheduleId, targetScheduleId);
    res.status(201).json({ success: true, data: { id, status: "pending_target" }, message: "Đã gửi yêu cầu đổi ca." });
  } catch (error) {
    if ((error as Error).message === "SHIFT_SWAP_INVALID") {
      sendScheduleError(res, "SHIFT_SWAP_INVALID", "Hai ca đổi không hợp lệ hoặc không cùng ngày làm việc.");
      return;
    }
    console.error("schedule:swap:create", error);
    sendScheduleError(res, "SHIFT_SWAP_CREATE_FAILED", "Không thể tạo yêu cầu đổi ca.", 500);
  }
};

/** Lets the requested employee accept a shift exchange before manager review. */
export const acceptShiftSwapHandler = async (req: Request, res: Response): Promise<void> => {
  const swapId = readPositiveId(req.params.id);
  const userId = req.user?.userId;
  if (!swapId || !userId) {
    sendScheduleError(res, "SHIFT_SWAP_INPUT_INVALID", "Yêu cầu đổi ca không hợp lệ.");
    return;
  }
  try {
    const accepted = await acceptShiftSwap(swapId, Number(userId));
    if (!accepted) {
      sendScheduleError(res, "SHIFT_SWAP_NOT_ACTIONABLE", "Yêu cầu không tồn tại hoặc không thuộc về bạn.", 404);
      return;
    }
    res.json({ success: true, message: "Đã chuyển yêu cầu đổi ca cho quản lý duyệt." });
  } catch (error) {
    console.error("schedule:swap:accept", error);
    sendScheduleError(res, "SHIFT_SWAP_ACCEPT_FAILED", "Không thể chấp nhận yêu cầu đổi ca.", 500);
  }
};

/** Executes the final transactional manager approval of a schedule exchange. */
export const approveShiftSwapHandler = async (req: Request, res: Response): Promise<void> => {
  const swapId = readPositiveId(req.params.id);
  const managerId = req.user?.userId;
  if (!swapId || !managerId) {
    sendScheduleError(res, "SHIFT_SWAP_INPUT_INVALID", "Yêu cầu đổi ca không hợp lệ.");
    return;
  }
  try {
    const approved = await approveShiftSwap(swapId, Number(managerId));
    if (!approved) {
      sendScheduleError(res, "SHIFT_SWAP_NOT_ACTIONABLE", "Yêu cầu chưa được nhân viên đích chấp nhận hoặc ca đã thay đổi.");
      return;
    }
    res.json({ success: true, message: "Đã phê duyệt và hoán đổi ca trực an toàn." });
  } catch (error) {
    console.error("schedule:swap:approve", error);
    sendScheduleError(res, "SHIFT_SWAP_APPROVE_FAILED", "Không thể phê duyệt đổi ca.", 500);
  }
};

/** Creates a leave request for the currently signed-in staff member. */
export const createLeaveHandler = async (req: Request, res: Response): Promise<void> => {
  const employeeId = req.user?.userId;
  const leaveDate = readWorkDate(req.body.leave_date);
  if (!employeeId || !leaveDate) {
    sendScheduleError(res, "LEAVE_INPUT_INVALID", "leave_date phải có định dạng YYYY-MM-DD.");
    return;
  }
  try {
    const id = await createLeave(Number(employeeId), leaveDate);
    res.status(201).json({ success: true, data: { id, status: "pending" }, message: "Đã gửi yêu cầu nghỉ phép." });
  } catch (error) {
    console.error("schedule:leave:create", error);
    sendScheduleError(res, "LEAVE_CREATE_FAILED", "Không thể tạo yêu cầu nghỉ phép.", 500);
  }
};

/** Lists leave requests so managers can review pending staff absences. */
export const getLeaveRequestsHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json({ success: true, data: await listLeaveRequests() });
  } catch (error) {
    console.error("schedule:leave:list", error);
    sendScheduleError(res, "LEAVE_LIST_FAILED", "Khong the tai danh sach xin nghi phep.", 500);
  }
};

/** Lists shift-exchange requests for manager oversight. */
export const getShiftSwapRequestsHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json({ success: true, data: await listShiftSwapRequests() });
  } catch (error) {
    console.error("schedule:swap:list", error);
    sendScheduleError(res, "SHIFT_SWAP_LIST_FAILED", "Khong the tai danh sach doi ca.", 500);
  }
};

/** Approves leave and atomically cancels that employee's assigned schedules for the date. */
export const approveLeaveHandler = async (req: Request, res: Response): Promise<void> => {
  const leaveId = readPositiveId(req.params.id);
  if (!leaveId) {
    sendScheduleError(res, "LEAVE_INPUT_INVALID", "Yêu cầu nghỉ phép không hợp lệ.");
    return;
  }
  try {
    const approved = await approveLeave(leaveId);
    if (!approved) {
      sendScheduleError(res, "LEAVE_NOT_ACTIONABLE", "Yêu cầu không tồn tại hoặc đã được xử lý.", 404);
      return;
    }
    res.json({ success: true, message: "Đã duyệt nghỉ phép và hủy các ca liên quan." });
  } catch (error) {
    console.error("schedule:leave:approve", error);
    sendScheduleError(res, "LEAVE_APPROVE_FAILED", "Không thể duyệt nghỉ phép.", 500);
  }
};
