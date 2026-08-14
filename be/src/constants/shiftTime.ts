/** Centralised restaurant operating-time policy used by scheduling and service flows. */
export const SHIFT_TIME = {
  LUNCH: {
    START: "10:00",
    END: "15:00",
    ONLINE_LAST_BOOKING: "13:45",
    WALK_IN_LAST_SEATING: "14:00",
  },
  DINNER: {
    START: "17:00",
    END: "22:00",
    ONLINE_LAST_BOOKING: "20:30",
    WALK_IN_LAST_SEATING: "21:00",
  },
  ATTENDANCE_GRACE_MINUTES: 15,
} as const;

/** Status values used when a manager reviews a late or early attendance declaration. */
export const ATTENDANCE_REVIEW_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

/** Restaurant defaults for late and early attendance validation. */
export const SHIFT_POLICY_DEFAULTS = {
  GRACE_MINUTES: SHIFT_TIME.ATTENDANCE_GRACE_MINUTES,
  REQUIRE_LATE_REASON: true,
  REQUIRE_EARLY_REASON: true,
} as const;

/** Stable error codes returned by time-policy middleware. */
export const SHIFT_TIME_ERROR_CODE = {
  BOOKING_TIME_OUT_OF_BOUND: "BOOKING_TIME_OUT_OF_BOUND",
  WALK_IN_TIME_EXCEEDED: "WALK_IN_TIME_EXCEEDED",
  SHIFT_OVERLAPPED: "SHIFT_OVERLAPPED",
  SCHEDULE_CANCELLED: "SCHEDULE_CANCELLED",
  LATE_REASON_REQUIRED: "LATE_REASON_REQUIRED",
  EARLY_REASON_REQUIRED: "EARLY_REASON_REQUIRED",
} as const;

export type ShiftTimeErrorCode = (typeof SHIFT_TIME_ERROR_CODE)[keyof typeof SHIFT_TIME_ERROR_CODE];

/** Roles that may open a walk-in table outside of the normal time window. */
export const WALK_IN_OVERRIDE_ROLES = ["admin", "manager"] as const;

export const SCHEDULE_STATUS = {
  ASSIGNED: "assigned",
  CANCELLED: "cancelled",
} as const;

export const LEAVE_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export const SHIFT_SWAP_STATUS = {
  PENDING_TARGET: "pending_target",
  PENDING_MANAGER: "pending_manager",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;
