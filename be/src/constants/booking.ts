/** Booking statuses that reserve a table time slot. */
export const BOOKING_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
} as const;

export type BookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

/** Default service duration used when a customer does not choose an end time. */
export const BOOKING_DURATION_MINUTES = 120;

/** Maximum party size accepted by the public booking flow. */
export const MAX_BOOKING_PARTY_SIZE = 30;
