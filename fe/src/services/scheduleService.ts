import api from "./axiosInstance";

/** A reusable work-time template configured by the restaurant. */
export interface ShiftTemplate {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
}

/** A manager-visible employee assignment for a work day. */
export interface AssignedSchedule {
  id: number;
  employee_id: number;
  shift_id: number;
  work_date: string;
  status: string;
  employee_name?: string;
  role_name?: string;
  shift_name?: string;
  start_time?: string;
  end_time?: string;
}

/** Payload used by a manager to assign an employee to one time template. */
export interface CreateSchedulePayload {
  employee_id: number;
  shift_id: number;
  work_date: string;
}

/** Global attendance validation rules configured by a manager. */
export interface ShiftPolicy {
  grace_minutes: number;
  require_late_reason: boolean;
  require_early_reason: boolean;
}

/** Payload for creating or editing a reusable template. */
export interface SaveShiftTemplatePayload {
  name: string;
  start_time: string;
  end_time: string;
}

/** A leave request displayed to a manager for approval. */
export interface LeaveRequest {
  id: number;
  employee_id: number;
  employee_name: string;
  leave_date: string;
  status: string;
}

/** A staff-to-staff shift-exchange request displayed to a manager. */
export interface ShiftSwapRequest {
  id: number;
  requester_name: string;
  target_employee_name: string;
  work_date: string;
  status: string;
}

/** Payload sent by a staff member to request a shift exchange. */
export interface CreateShiftSwapPayload {
  target_employee_id: number;
  requester_schedule_id: number;
  target_schedule_id: number;
}

/** Reads all configured lunch and dinner templates. */
export const getShiftTemplates = async (): Promise<ShiftTemplate[]> => {
  const response = await api.get("/v1/schedules/templates");
  return response.data.data as ShiftTemplate[];
};

/** Reads the current assignments for the schedule-management table. */
export const getSchedules = async (): Promise<AssignedSchedule[]> => {
  const response = await api.get("/v1/schedules");
  return response.data.data as AssignedSchedule[];
};

/** Assigns one shift template while the backend enforces overlap validation. */
export const createSchedule = async (payload: CreateSchedulePayload): Promise<AssignedSchedule> => {
  const response = await api.post("/v1/schedules", payload);
  return response.data.data as AssignedSchedule;
};

/** Creates a reusable work-shift template. */
export const createShiftTemplate = async (payload: SaveShiftTemplatePayload): Promise<ShiftTemplate> => {
  const response = await api.post("/v1/schedules/templates", payload);
  return response.data.data as ShiftTemplate;
};

/** Deletes a template that is not used by an assigned shift. */
export const deleteShiftTemplate = async (templateId: number): Promise<void> => {
  await api.delete(`/v1/schedules/templates/${templateId}`);
};

/** Gets the restaurant attendance grace-period configuration. */
export const getShiftPolicy = async (): Promise<ShiftPolicy> => {
  const response = await api.get("/v1/schedules/policy");
  return response.data.data as ShiftPolicy;
};

/** Saves the manager-configured attendance grace-period configuration. */
export const updateShiftPolicy = async (policy: ShiftPolicy): Promise<ShiftPolicy> => {
  const response = await api.patch("/v1/schedules/policy", policy);
  return response.data.data as ShiftPolicy;
};

/** Reads leave requests so managers can approve the pending ones. */
export const getLeaveRequests = async (): Promise<LeaveRequest[]> => {
  const response = await api.get("/v1/schedules/leaves");
  return response.data.data as LeaveRequest[];
};

/** Approves a leave request and releases its scheduled work time. */
export const approveLeaveRequest = async (leaveId: number): Promise<void> => {
  await api.patch(`/v1/schedules/leaves/${leaveId}/approve`);
};

/** Reads staff shift-exchange requests for manager review. */
export const getShiftSwapRequests = async (): Promise<ShiftSwapRequest[]> => {
  const response = await api.get("/v1/schedules/swap");
  return response.data.data as ShiftSwapRequest[];
};

/** Approves a target-accepted shift exchange. */
export const approveShiftSwapRequest = async (swapId: number): Promise<void> => {
  await api.post(`/v1/schedules/swap/${swapId}/approve`);
};

/** Gets the current staff member's own active schedules. */
export const getMySchedules = async (): Promise<AssignedSchedule[]> => {
  const response = await api.get("/v1/schedules/mine");
  return response.data.data as AssignedSchedule[];
};

/** Gets same-day coworker assignments eligible for one requested exchange. */
export const getShiftSwapCandidates = async (scheduleId: number): Promise<AssignedSchedule[]> => {
  const response = await api.get("/v1/schedules/swap/candidates", { params: { schedule_id: scheduleId } });
  return response.data.data as AssignedSchedule[];
};

/** Sends a staff-to-staff shift exchange request. */
export const createShiftSwapRequest = async (payload: CreateShiftSwapPayload): Promise<void> => {
  await api.post("/v1/schedules/swap", payload);
};

/** Reads exchanges requiring consent from the current employee. */
export const getShiftSwapInbox = async (): Promise<ShiftSwapRequest[]> => {
  const response = await api.get("/v1/schedules/swap/inbox");
  return response.data.data as ShiftSwapRequest[];
};

/** Lets the current employee consent to an incoming exchange request. */
export const acceptShiftSwapRequest = async (swapId: number): Promise<void> => {
  await api.patch(`/v1/schedules/swap/${swapId}/accept`);
};

/** Sends the currently signed-in employee's leave request for manager approval. */
export const createLeaveRequest = async (leaveDate: string): Promise<void> => {
  await api.post("/v1/schedules/leaves", { leave_date: leaveDate });
};
