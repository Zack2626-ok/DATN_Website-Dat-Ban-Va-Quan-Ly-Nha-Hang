import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import {
  LEAVE_STATUS,
  SCHEDULE_STATUS,
  SHIFT_POLICY_DEFAULTS,
  SHIFT_SWAP_STATUS,
} from "../constants/shiftTime";
import { isShiftOverlapping } from "../utils/shiftHelper";
import { query, withTransaction } from "../utils/db";

export interface ShiftTemplateRecord {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
}

/** Restaurant-wide policy controlling attendance grace and explanation requirements. */
export interface ShiftPolicyRecord {
  grace_minutes: number;
  require_late_reason: boolean;
  require_early_reason: boolean;
}

/** Input accepted when a manager creates or edits a reusable shift template. */
export interface SaveShiftTemplateInput {
  name: string;
  startTime: string;
  endTime: string;
}

export interface ScheduleRecord {
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

interface ScheduleRow extends RowDataPacket, ScheduleRecord {}

interface ShiftTemplateRow extends RowDataPacket, ShiftTemplateRecord {}

interface ShiftSwapRow extends RowDataPacket {
  id: number;
  requester_id: number;
  target_employee_id: number;
  requester_schedule_id: number;
  target_schedule_id: number;
  status: string;
}

interface LeaveRow extends RowDataPacket {
  id: number;
  employee_id: number;
  leave_date: string;
  status: string;
}

export interface LeaveRequestRecord {
  id: number;
  employee_id: number;
  employee_name: string;
  leave_date: string;
  status: string;
}

export interface ShiftSwapRequestRecord {
  id: number;
  requester_name: string;
  target_employee_name: string;
  work_date: string;
  status: string;
}

interface ColumnRow extends RowDataPacket {
  COLUMN_NAME: string;
}

interface ScheduleOwnershipRow extends RowDataPacket {
  id: number;
  employee_id: number;
  work_date: string;
  status: string;
}

export interface CreateScheduleInput {
  employeeId: number;
  shiftId: number;
  workDate: string;
}

/** Creates supporting shift-management tables without changing existing attendance behaviour. */
export const ensureScheduleSchema = async (): Promise<void> => {
  await query(`
    CREATE TABLE IF NOT EXISTS shift_templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      UNIQUE KEY uq_shift_template_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS schedules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      employee_id INT NOT NULL,
      shift_id INT NOT NULL,
      work_date DATE NOT NULL,
      status ENUM('assigned','cancelled') NOT NULL DEFAULT 'assigned',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_schedule_employee_template_date (employee_id, shift_id, work_date),
      KEY idx_schedule_employee_date (employee_id, work_date),
      CONSTRAINT fk_schedule_employee FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_schedule_template FOREIGN KEY (shift_id) REFERENCES shift_templates(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS leaves (
      id INT AUTO_INCREMENT PRIMARY KEY,
      employee_id INT NOT NULL,
      leave_date DATE NOT NULL,
      status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_leave_employee_date (employee_id, leave_date),
      CONSTRAINT fk_leave_employee FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS shift_swaps (
      id INT AUTO_INCREMENT PRIMARY KEY,
      requester_id INT NOT NULL,
      target_employee_id INT NOT NULL,
      requester_schedule_id INT NOT NULL,
      target_schedule_id INT NOT NULL,
      status ENUM('pending_target','pending_manager','approved','rejected') NOT NULL DEFAULT 'pending_target',
      approved_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_swap_requester FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_swap_target FOREIGN KEY (target_employee_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_swap_requester_schedule FOREIGN KEY (requester_schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
      CONSTRAINT fk_swap_target_schedule FOREIGN KEY (target_schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS shift_settings (
      id TINYINT PRIMARY KEY,
      grace_minutes TINYINT UNSIGNED NOT NULL DEFAULT 15,
      require_late_reason TINYINT(1) NOT NULL DEFAULT 1,
      require_early_reason TINYINT(1) NOT NULL DEFAULT 1,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await query(
    "INSERT IGNORE INTO shift_settings (id, grace_minutes, require_late_reason, require_early_reason) VALUES (1, ?, ?, ?)",
    [SHIFT_POLICY_DEFAULTS.GRACE_MINUTES, Number(SHIFT_POLICY_DEFAULTS.REQUIRE_LATE_REASON), Number(SHIFT_POLICY_DEFAULTS.REQUIRE_EARLY_REASON)],
  );

  const attendanceColumns = await query<ColumnRow[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attendance'`,
  );
  const existingAttendanceColumns = new Set(attendanceColumns.map((column) => column.COLUMN_NAME));
  const optionalAttendanceColumns: Array<[string, string]> = [
    ["schedule_id", "INT NULL"],
    ["is_late", "TINYINT(1) NOT NULL DEFAULT 0"],
    ["late_reason", "VARCHAR(255) NULL"],
    ["is_early", "TINYINT(1) NOT NULL DEFAULT 0"],
    ["early_reason", "VARCHAR(255) NULL"],
    ["late_review_status", "ENUM('pending','approved','rejected') NULL"],
    ["early_review_status", "ENUM('pending','approved','rejected') NULL"],
  ];
  for (const [columnName, definition] of optionalAttendanceColumns) {
    if (!existingAttendanceColumns.has(columnName)) {
      await query(`ALTER TABLE attendance ADD COLUMN ${columnName} ${definition}`);
    }
  }

  const templates: Array<[string, string, string]> = [
    ["Ca trưa", "10:00:00", "15:00:00"],
    ["Ca tối", "17:00:00", "22:00:00"],
  ];
  for (const [name, startTime, endTime] of templates) {
    await query(
      "INSERT IGNORE INTO shift_templates (name, start_time, end_time) VALUES (?, ?, ?)",
      [name, startTime, endTime],
    );
  }
};

/** Lists the reusable lunch and dinner shift templates. */
export const listShiftTemplates = async (): Promise<ShiftTemplateRecord[]> => query<ShiftTemplateRow[]>(
  `SELECT id, name, TIME_FORMAT(start_time, '%H:%i') AS start_time, TIME_FORMAT(end_time, '%H:%i') AS end_time
   FROM shift_templates ORDER BY start_time ASC`,
);

/** Reads the singleton policy record used by the attendance terminal. */
export const getShiftPolicy = async (): Promise<ShiftPolicyRecord> => {
  const rows = await query<Array<RowDataPacket & ShiftPolicyRecord>>(
    "SELECT grace_minutes, require_late_reason, require_early_reason FROM shift_settings WHERE id = 1",
  );
  const policy = rows[0];
  return {
    grace_minutes: policy?.grace_minutes ?? SHIFT_POLICY_DEFAULTS.GRACE_MINUTES,
    require_late_reason: Boolean(policy?.require_late_reason ?? SHIFT_POLICY_DEFAULTS.REQUIRE_LATE_REASON),
    require_early_reason: Boolean(policy?.require_early_reason ?? SHIFT_POLICY_DEFAULTS.REQUIRE_EARLY_REASON),
  };
};

/** Persists the global grace period and mandatory-reason toggles. */
export const updateShiftPolicy = async (policy: ShiftPolicyRecord): Promise<ShiftPolicyRecord> => {
  await query(
    "UPDATE shift_settings SET grace_minutes = ?, require_late_reason = ?, require_early_reason = ? WHERE id = 1",
    [policy.grace_minutes, Number(policy.require_late_reason), Number(policy.require_early_reason)],
  );
  return getShiftPolicy();
};

/** Creates one reusable work-shift template. */
export const createShiftTemplate = async (input: SaveShiftTemplateInput): Promise<ShiftTemplateRecord> => {
  const result = await query<ResultSetHeader>(
    "INSERT INTO shift_templates (name, start_time, end_time) VALUES (?, ?, ?)",
    [input.name, input.startTime, input.endTime],
  );
  const rows = await query<ShiftTemplateRow[]>(
    "SELECT id, name, TIME_FORMAT(start_time, '%H:%i') AS start_time, TIME_FORMAT(end_time, '%H:%i') AS end_time FROM shift_templates WHERE id = ?",
    [result.insertId],
  );
  return rows[0];
};

/** Updates an unused reusable shift template. */
export const updateShiftTemplate = async (templateId: number, input: SaveShiftTemplateInput): Promise<boolean> => {
  const result = await query<ResultSetHeader>(
    "UPDATE shift_templates SET name = ?, start_time = ?, end_time = ? WHERE id = ?",
    [input.name, input.startTime, input.endTime, templateId],
  );
  return result.affectedRows > 0;
};

/** Removes a template only when it is not referenced by any schedule. */
export const deleteShiftTemplate = async (templateId: number): Promise<boolean> => {
  const usage = await query<Array<RowDataPacket & { total: number }>>(
    "SELECT COUNT(*) AS total FROM schedules WHERE shift_id = ?",
    [templateId],
  );
  if ((usage[0]?.total ?? 0) > 0) throw new Error("SHIFT_TEMPLATE_IN_USE");
  const result = await query<ResultSetHeader>("DELETE FROM shift_templates WHERE id = ?", [templateId]);
  return result.affectedRows > 0;
};

/** Lists assigned schedules with the display data required by manager screens. */
export const listSchedules = async (): Promise<ScheduleRecord[]> => query<ScheduleRow[]>(`
  SELECT s.id, s.employee_id, s.shift_id, DATE_FORMAT(s.work_date, '%Y-%m-%d') AS work_date, s.status,
    u.full_name AS employee_name, COALESCE(r.name, 'staff') AS role_name,
    st.name AS shift_name, TIME_FORMAT(st.start_time, '%H:%i') AS start_time, TIME_FORMAT(st.end_time, '%H:%i') AS end_time
  FROM schedules s
  INNER JOIN users u ON u.id = s.employee_id
  LEFT JOIN roles r ON r.id = u.role_id
  INNER JOIN shift_templates st ON st.id = s.shift_id
  ORDER BY s.work_date DESC, st.start_time ASC, u.full_name ASC
`);

/** Assigns a staff member to a template after ensuring there is no active overlap. */
export const createSchedule = async (input: CreateScheduleInput): Promise<ScheduleRecord> => {
  if (await isShiftOverlapping(input.employeeId, input.workDate, input.shiftId)) {
    const error = new Error("SHIFT_OVERLAPPED");
    throw error;
  }
  const result = await query<ResultSetHeader>(
    "INSERT INTO schedules (employee_id, shift_id, work_date, status) VALUES (?, ?, ?, ?)",
    [input.employeeId, input.shiftId, input.workDate, SCHEDULE_STATUS.ASSIGNED],
  );
  const rows = await query<ScheduleRow[]>(
    "SELECT id, employee_id, shift_id, DATE_FORMAT(work_date, '%Y-%m-%d') AS work_date, status FROM schedules WHERE id = ?",
    [result.insertId],
  );
  return rows[0];
};

/** Creates a three-step request to exchange two existing schedules. */
export const createShiftSwap = async (
  requesterId: number,
  targetEmployeeId: number,
  requesterScheduleId: number,
  targetScheduleId: number,
): Promise<number> => {
  const rows = await query<ScheduleOwnershipRow[]>(
    `SELECT id, employee_id, DATE_FORMAT(work_date, '%Y-%m-%d') AS work_date, status
     FROM schedules WHERE id IN (?, ?)`,
    [requesterScheduleId, targetScheduleId],
  );
  const requesterSchedule = rows.find((row) => row.id === requesterScheduleId);
  const targetSchedule = rows.find((row) => row.id === targetScheduleId);
  const canSwap = requesterSchedule
    && targetSchedule
    && requesterSchedule.employee_id === requesterId
    && targetSchedule.employee_id === targetEmployeeId
    && requesterSchedule.work_date === targetSchedule.work_date
    && requesterSchedule.status === SCHEDULE_STATUS.ASSIGNED
    && targetSchedule.status === SCHEDULE_STATUS.ASSIGNED;
  if (!canSwap) {
    throw new Error("SHIFT_SWAP_INVALID");
  }
  const result = await query<ResultSetHeader>(
    `INSERT INTO shift_swaps
      (requester_id, target_employee_id, requester_schedule_id, target_schedule_id, status)
     VALUES (?, ?, ?, ?, ?)`,
    [requesterId, targetEmployeeId, requesterScheduleId, targetScheduleId, SHIFT_SWAP_STATUS.PENDING_TARGET],
  );
  return result.insertId;
};

/** Marks a pending swap accepted by the intended target employee. */
export const acceptShiftSwap = async (swapId: number, targetEmployeeId: number): Promise<boolean> => {
  const result = await query<ResultSetHeader>(
    "UPDATE shift_swaps SET status = ? WHERE id = ? AND target_employee_id = ? AND status = ?",
    [SHIFT_SWAP_STATUS.PENDING_MANAGER, swapId, targetEmployeeId, SHIFT_SWAP_STATUS.PENDING_TARGET],
  );
  return result.affectedRows > 0;
};

/** Atomically exchanges both schedule owners after manager approval. */
export const approveShiftSwap = async (swapId: number, managerId: number): Promise<boolean> => withTransaction(async (connection: PoolConnection) => {
  const [swapRows] = await connection.query<ShiftSwapRow[]>("SELECT * FROM shift_swaps WHERE id = ? FOR UPDATE", [swapId]);
  const swap = swapRows[0];
  if (!swap || swap.status !== SHIFT_SWAP_STATUS.PENDING_MANAGER) return false;

  const [scheduleRows] = await connection.query<ScheduleRow[]>(
    "SELECT id, employee_id, shift_id, DATE_FORMAT(work_date, '%Y-%m-%d') AS work_date, status FROM schedules WHERE id IN (?, ?) FOR UPDATE",
    [swap.requester_schedule_id, swap.target_schedule_id],
  );
  const requesterSchedule = scheduleRows.find((row) => row.id === swap.requester_schedule_id);
  const targetSchedule = scheduleRows.find((row) => row.id === swap.target_schedule_id);
  if (!requesterSchedule || !targetSchedule || requesterSchedule.status !== SCHEDULE_STATUS.ASSIGNED || targetSchedule.status !== SCHEDULE_STATUS.ASSIGNED) {
    return false;
  }

  await connection.query(
    "UPDATE schedules SET employee_id = ? WHERE id = ?",
    [targetSchedule.employee_id, requesterSchedule.id],
  );
  await connection.query(
    "UPDATE schedules SET employee_id = ? WHERE id = ?",
    [requesterSchedule.employee_id, targetSchedule.id],
  );
  await connection.query(
    "UPDATE shift_swaps SET status = ?, approved_by = ? WHERE id = ?",
    [SHIFT_SWAP_STATUS.APPROVED, managerId, swap.id],
  );
  return true;
});

/** Creates a leave request awaiting manager approval. */
export const createLeave = async (employeeId: number, leaveDate: string): Promise<number> => {
  const result = await query<ResultSetHeader>(
    "INSERT INTO leaves (employee_id, leave_date, status) VALUES (?, ?, ?)",
    [employeeId, leaveDate, LEAVE_STATUS.PENDING],
  );
  return result.insertId;
};

/** Approves leave and cancels every assigned schedule for that staff member and date in one transaction. */
export const approveLeave = async (leaveId: number): Promise<boolean> => withTransaction(async (connection: PoolConnection) => {
  const [leaveRows] = await connection.query<LeaveRow[]>("SELECT * FROM leaves WHERE id = ? FOR UPDATE", [leaveId]);
  const leave = leaveRows[0];
  if (!leave || leave.status !== LEAVE_STATUS.PENDING) return false;

  await connection.query("UPDATE leaves SET status = ? WHERE id = ?", [LEAVE_STATUS.APPROVED, leave.id]);
  await connection.query(
    "UPDATE schedules SET status = ? WHERE employee_id = ? AND work_date = ? AND status = ?",
    [SCHEDULE_STATUS.CANCELLED, leave.employee_id, leave.leave_date, SCHEDULE_STATUS.ASSIGNED],
  );
  return true;
});

/** Lists leave requests so a manager can approve the pending queue. */
export const listLeaveRequests = async (): Promise<LeaveRequestRecord[]> => query<LeaveRequestRecord[]>(`
  SELECT l.id, l.employee_id, u.full_name AS employee_name,
    DATE_FORMAT(l.leave_date, '%Y-%m-%d') AS leave_date, l.status
  FROM leaves l INNER JOIN users u ON u.id = l.employee_id
  ORDER BY l.status = 'pending' DESC, l.leave_date ASC, l.id DESC
`);

/** Lists exchange requests together with both staff names for management review. */
export const listShiftSwapRequests = async (): Promise<ShiftSwapRequestRecord[]> => query<ShiftSwapRequestRecord[]>(`
  SELECT ss.id, requester.full_name AS requester_name, target.full_name AS target_employee_name,
    DATE_FORMAT(requester_schedule.work_date, '%Y-%m-%d') AS work_date, ss.status
  FROM shift_swaps ss
  INNER JOIN users requester ON requester.id = ss.requester_id
  INNER JOIN users target ON target.id = ss.target_employee_id
  INNER JOIN schedules requester_schedule ON requester_schedule.id = ss.requester_schedule_id
  ORDER BY ss.status IN ('pending_target', 'pending_manager') DESC, requester_schedule.work_date ASC, ss.id DESC
`);

/** Lists one employee's active future work assignments for the self-service screen. */
export const listMySchedules = async (employeeId: number): Promise<ScheduleRecord[]> => query<ScheduleRow[]>(
  `SELECT s.id, s.employee_id, s.shift_id, DATE_FORMAT(s.work_date, '%Y-%m-%d') AS work_date, s.status,
    st.name AS shift_name, TIME_FORMAT(st.start_time, '%H:%i') AS start_time, TIME_FORMAT(st.end_time, '%H:%i') AS end_time
   FROM schedules s INNER JOIN shift_templates st ON st.id = s.shift_id
   WHERE s.employee_id = ? AND s.status = ? AND s.work_date >= CURDATE()
   ORDER BY s.work_date ASC, st.start_time ASC`,
  [employeeId, SCHEDULE_STATUS.ASSIGNED],
);

/** Lists compatible coworkers' shifts for a staff member initiating a shift exchange. */
export const listShiftSwapCandidates = async (requesterId: number, requesterScheduleId: number): Promise<ScheduleRecord[]> => query<ScheduleRow[]>(
  `SELECT s.id, s.employee_id, s.shift_id, DATE_FORMAT(s.work_date, '%Y-%m-%d') AS work_date, s.status,
    u.full_name AS employee_name, COALESCE(r.name, 'staff') AS role_name,
    st.name AS shift_name, TIME_FORMAT(st.start_time, '%H:%i') AS start_time, TIME_FORMAT(st.end_time, '%H:%i') AS end_time
   FROM schedules requester_schedule
   INNER JOIN schedules s ON s.work_date = requester_schedule.work_date
   INNER JOIN users u ON u.id = s.employee_id
   LEFT JOIN roles r ON r.id = u.role_id
   INNER JOIN shift_templates st ON st.id = s.shift_id
   WHERE requester_schedule.id = ? AND requester_schedule.employee_id = ?
     AND requester_schedule.status = ? AND s.status = ? AND s.employee_id <> ?
   ORDER BY st.start_time ASC, u.full_name ASC`,
  [requesterScheduleId, requesterId, SCHEDULE_STATUS.ASSIGNED, SCHEDULE_STATUS.ASSIGNED, requesterId],
);

/** Lists only the exchange requests awaiting the current employee's consent. */
export const listShiftSwapInbox = async (employeeId: number): Promise<ShiftSwapRequestRecord[]> => query<ShiftSwapRequestRecord[]>(
  `SELECT ss.id, requester.full_name AS requester_name, target.full_name AS target_employee_name,
    DATE_FORMAT(requester_schedule.work_date, '%Y-%m-%d') AS work_date, ss.status
   FROM shift_swaps ss
   INNER JOIN users requester ON requester.id = ss.requester_id
   INNER JOIN users target ON target.id = ss.target_employee_id
   INNER JOIN schedules requester_schedule ON requester_schedule.id = ss.requester_schedule_id
   WHERE ss.target_employee_id = ? AND ss.status = ?
   ORDER BY requester_schedule.work_date ASC, ss.id DESC`,
  [employeeId, SHIFT_SWAP_STATUS.PENDING_TARGET],
);

/** Returns every schedule assigned to an employee on one local work date. */
export const getEmployeeSchedulesForDate = async (employeeId: number, workDate: string): Promise<ScheduleRecord[]> => query<ScheduleRow[]>(
    `SELECT s.id, s.employee_id, s.shift_id, DATE_FORMAT(s.work_date, '%Y-%m-%d') AS work_date, s.status,
      st.name AS shift_name, TIME_FORMAT(st.start_time, '%H:%i') AS start_time, TIME_FORMAT(st.end_time, '%H:%i') AS end_time
     FROM schedules s INNER JOIN shift_templates st ON st.id = s.shift_id
     WHERE s.employee_id = ? AND s.work_date = ? ORDER BY st.start_time ASC`,
    [employeeId, workDate],
  );

/** Keeps backward-compatible access for callers that only need the first scheduled shift. */
export const getEmployeeScheduleForDate = async (employeeId: number, workDate: string): Promise<ScheduleRecord | null> => {
  const schedules = await getEmployeeSchedulesForDate(employeeId, workDate);
  return schedules[0] ?? null;
};
