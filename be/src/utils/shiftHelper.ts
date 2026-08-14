import { query } from "./db";
import { SHIFT_TIME } from "../constants/shiftTime";

interface OverlapRow {
  start_time: string;
  end_time: string;
}

const CLOCK_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

/** Converts a HH:mm or HH:mm:ss value to the number of minutes since midnight. */
export const timeToMinutes = (timeStr: string): number => {
  const normalizedTime = timeStr.trim();
  if (!CLOCK_PATTERN.test(normalizedTime)) {
    return -1;
  }

  const [hour, minute] = normalizedTime.split(":");
  return Number(hour) * 60 + Number(minute);
};

/** Checks whether a customer-selected online booking time belongs to a serving period. */
export const validateOnlineBookingTime = (bookingTimeStr: string): boolean => {
  const bookingMinute = timeToMinutes(bookingTimeStr);
  const lunchStart = timeToMinutes(SHIFT_TIME.LUNCH.START);
  const lunchLastBooking = timeToMinutes(SHIFT_TIME.LUNCH.ONLINE_LAST_BOOKING);
  const dinnerStart = timeToMinutes(SHIFT_TIME.DINNER.START);
  const dinnerLastBooking = timeToMinutes(SHIFT_TIME.DINNER.ONLINE_LAST_BOOKING);

  return (bookingMinute >= lunchStart && bookingMinute <= lunchLastBooking)
    || (bookingMinute >= dinnerStart && bookingMinute <= dinnerLastBooking);
};

/** Checks whether a server-time instant is eligible for a normal waiter walk-in. */
export const validateWalkInOpeningTime = (serverTime: Date): boolean => {
  const vietnamClock = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(serverTime);
  const currentMinute = timeToMinutes(vietnamClock);

  const isLunchService = currentMinute >= timeToMinutes(SHIFT_TIME.LUNCH.START)
    && currentMinute < timeToMinutes(SHIFT_TIME.LUNCH.WALK_IN_LAST_SEATING);
  const isDinnerService = currentMinute >= timeToMinutes(SHIFT_TIME.DINNER.START)
    && currentMinute < timeToMinutes(SHIFT_TIME.DINNER.WALK_IN_LAST_SEATING);

  return isLunchService || isDinnerService;
};

/** Determines whether a new schedule template overlaps an assigned schedule for one employee and date. */
export const isShiftOverlapping = async (
  employeeId: number,
  date: string,
  newShiftId: number,
): Promise<boolean> => {
  const rows = await query<OverlapRow[]>(
    `SELECT existing_template.start_time, existing_template.end_time
     FROM schedules existing_schedule
     INNER JOIN shift_templates existing_template ON existing_template.id = existing_schedule.shift_id
     WHERE existing_schedule.employee_id = ?
       AND existing_schedule.work_date = ?
       AND existing_schedule.status = 'assigned'
       AND existing_schedule.shift_id <> ?`,
    [employeeId, date, newShiftId],
  );
  const candidateRows = await query<OverlapRow[]>(
    "SELECT start_time, end_time FROM shift_templates WHERE id = ? LIMIT 1",
    [newShiftId],
  );
  const candidate = candidateRows[0];
  if (!candidate) {
    throw new Error("Không tìm thấy mẫu ca làm việc.");
  }

  const candidateStart = timeToMinutes(candidate.start_time);
  const candidateEnd = timeToMinutes(candidate.end_time);
  return rows.some((row) => {
    const existingStart = timeToMinutes(row.start_time);
    const existingEnd = timeToMinutes(row.end_time);
    return candidateStart < existingEnd && existingStart < candidateEnd;
  });
};
