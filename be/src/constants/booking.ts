/** Booking statuses that reserve a table time slot. */
export const BOOKING_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
} as const;

export type BookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

/** Default service duration used when a customer does not choose an end time. */
export const BOOKING_DURATION_MINUTES = 180;

/** Minutes before a reservation starts when staff may begin serving it. */
export const BOOKING_CHECK_IN_EARLY_MINUTES = 5;

/** Views used to keep operational bookings separate from completed booking history. */
export const BOOKING_SCHEDULE_MODE = {
  CURRENT: "current",
  HISTORY: "history",
} as const;

export type BookingScheduleMode = (typeof BOOKING_SCHEDULE_MODE)[keyof typeof BOOKING_SCHEDULE_MODE];

/** Longest future period that can be reserved through the booking calendar. */
export const BOOKING_MAX_ADVANCE_DAYS = 30;

/** Maximum party size accepted by the public booking flow. */
export const MAX_BOOKING_PARTY_SIZE = 30;

/** Restaurant-local operating hours. */
export const RESTAURANT_HOURS = {
  OPEN: "10:00",
  CLOSE: "22:00",
} as const;

/** Latest arrival accepted for an online customer booking. */
export const ONLINE_BOOKING_LAST_ARRIVAL_TIME = "19:00";

/** Public booking window retained for APIs that return a human-readable range. */
export const PUBLIC_BOOKING_HOURS = {
  OPEN: RESTAURANT_HOURS.OPEN,
  CLOSE: ONLINE_BOOKING_LAST_ARRIVAL_TIME,
} as const;

/** Latest arrival that staff may create directly at the restaurant. */
export const DIRECT_BOOKING_LAST_ARRIVAL_TIME = "19:00";

/** Latest time a walk-in customer may be seated without creating a future booking. */
export const WALK_IN_LAST_ARRIVAL_TIME = "21:00";

/** Identifies the business channel that created a booking. */
export const BOOKING_CHANNEL = {
  ONLINE: "online",
  DIRECT: "direct",
} as const;

export type BookingChannel = (typeof BOOKING_CHANNEL)[keyof typeof BOOKING_CHANNEL];

/** Roles allowed to create an advance booking at the restaurant. */
export const DIRECT_BOOKING_ROLES = ["admin", "manager"];

/** Roles allowed to inspect the operational booking calendar. */
export const BOOKING_SCHEDULE_ROLES = ["admin", "manager", "waiter"];

/** Maximum number of tables offered in one future group-seating option. */
export const MAX_BOOKING_ALLOCATION_TABLES = 10;
