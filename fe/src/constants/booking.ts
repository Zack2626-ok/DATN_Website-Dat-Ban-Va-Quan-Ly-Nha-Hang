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

/** Checks whether a booking timestamp belongs to the restaurant's current calendar day in Vietnam timezone. */
export const isBookingScheduledToday = (startTime?: string | null): boolean => {
  if (!startTime) return false;
  try {
    const todayYMD = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()); // "YYYY-MM-DD"

    // Match DD/MM/YYYY format e.g. "10:44 (20/8/2026)" or "20/08/2026"
    const dmyMatch = startTime.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dmyMatch) {
      const dd = dmyMatch[1].padStart(2, "0");
      const mm = dmyMatch[2].padStart(2, "0");
      const yyyy = dmyMatch[3];
      return `${yyyy}-${mm}-${dd}` === todayYMD;
    }

    // Match YYYY-MM-DD format e.g. "2026-08-20 10:44:00"
    const ymdMatch = startTime.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
      return `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}` === todayYMD;
    }

    const normalized = startTime.replace(" ", "T");
    const bookingDate = new Date(
      normalized.endsWith("Z") || normalized.includes("+")
        ? normalized
        : `${normalized}+07:00`,
    );
    if (isNaN(bookingDate.getTime())) return false;
    const formatter = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(bookingDate) === todayYMD;
  } catch {
    return false;
  }
};
