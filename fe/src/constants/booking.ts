/** Public booking time boundaries, expressed in Vietnam local time. */
export const PUBLIC_BOOKING_HOURS = {
  OPEN: "10:00",
  CLOSE: "19:00",
} as const;

/** Latest customer arrival accepted by the online booking flow. */
export const ONLINE_BOOKING_LAST_ARRIVAL_TIME = "19:00";

/** Standard slot occupied by one scheduled booking, including reset time. */
export const BOOKING_DURATION_MINUTES = 180;

/** Furthest date selectable in the customer booking flow. */
export const BOOKING_MAX_ADVANCE_DAYS = 30;

/** Largest party size supported by the public and staff booking forms. */
export const MAX_BOOKING_PARTY_SIZE = 30;

/** Checks whether a HH:mm value is within the restaurant's booking hours. */
export const isWithinPublicBookingHours = (time: string): boolean =>
  /^\d{2}:\d{2}$/.test(time) &&
  time >= PUBLIC_BOOKING_HOURS.OPEN &&
  time <= ONLINE_BOOKING_LAST_ARRIVAL_TIME;
