/** Public booking time boundaries, expressed in Vietnam local time. */
export const PUBLIC_BOOKING_HOURS = {
  OPEN: "10:00",
  CLOSE: "22:00",
} as const;

/** Checks whether a HH:mm value is within the restaurant's booking hours. */
export const isWithinPublicBookingHours = (time: string): boolean =>
  /^\d{2}:\d{2}$/.test(time) &&
  time >= PUBLIC_BOOKING_HOURS.OPEN &&
  time <= PUBLIC_BOOKING_HOURS.CLOSE;
