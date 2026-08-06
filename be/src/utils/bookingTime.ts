import {
  BOOKING_CHANNEL,
  BOOKING_MAX_ADVANCE_DAYS,
  DIRECT_BOOKING_LAST_ARRIVAL_TIME,
  ONLINE_BOOKING_LAST_ARRIVAL_TIME,
  RESTAURANT_HOURS,
  WALK_IN_LAST_ARRIVAL_TIME,
  type BookingChannel,
} from "../constants/booking";

const BOOKING_CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Checks a value is an actual 24-hour clock in HH:mm format. */
export const isValidBookingClock = (time: string): boolean => {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  return Boolean(match) && Number(match?.[1]) < 24 && Number(match?.[2]) < 60;
};

/** Extracts the Vietnam-local clock from a SQL datetime or ISO datetime. */
export const getBookingClock = (value: string): string => value.trim().replace(" ", "T").slice(11, 16);

/** Formats an instant as a SQL datetime in the restaurant's Vietnam timezone. */
export const formatVietnamBookingDateTime = (value: Date = new Date()): string =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(value).replace("T", " ");

/** Formats a date as a Vietnam-local calendar day. */
const getVietnamCalendarDate = (value: Date): string => new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(value);

/** Parses a local booking input as an instant in Vietnam time. */
const parseVietnamBookingDateTime = (value: string): Date => {
  const normalized = value.trim().replace(" ", "T");
  return new Date(normalized.includes("+") || normalized.endsWith("Z") ? normalized : `${normalized}+07:00`);
};

/** Adds whole calendar days while preserving Vietnam-local calendar semantics. */
const addCalendarDays = (calendarDate: string, days: number): string => {
  const date = new Date(`${calendarDate}T00:00:00+07:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return getVietnamCalendarDate(date);
};

/** Returns an error when a booking calendar day falls outside the permitted booking window. */
export const getBookingDateValidationError = (
  bookingDate: string,
  now: Date = new Date(),
): string | null => {
  if (!BOOKING_CALENDAR_DATE_PATTERN.test(bookingDate)) {
    return "Ngày đặt bàn không hợp lệ.";
  }

  const parsedDate = new Date(`${bookingDate}T00:00:00+07:00`);
  if (Number.isNaN(parsedDate.getTime()) || getVietnamCalendarDate(parsedDate) !== bookingDate) {
    return "Ngày đặt bàn không hợp lệ.";
  }

  const currentCalendarDate = getVietnamCalendarDate(now);
  if (bookingDate < currentCalendarDate) {
    return "Ngày đặt bàn không được ở quá khứ.";
  }
  if (bookingDate > addCalendarDays(currentCalendarDate, BOOKING_MAX_ADVANCE_DAYS)) {
    return `Chỉ có thể đặt bàn trong vòng ${BOOKING_MAX_ADVANCE_DAYS} ngày kể từ hôm nay.`;
  }

  return null;
};

/** Gets the latest permitted arrival time for the given booking channel. */
export const getBookingLastArrivalTime = (channel: BookingChannel): string =>
  channel === BOOKING_CHANNEL.DIRECT ? DIRECT_BOOKING_LAST_ARRIVAL_TIME : ONLINE_BOOKING_LAST_ARRIVAL_TIME;

let bookingTimeValidationEnabled = false;

export const isBookingTimeValidationEnabled = (): boolean => bookingTimeValidationEnabled;

export const setBookingTimeValidationEnabled = (enabled: boolean): void => {
  bookingTimeValidationEnabled = enabled;
};

/** Returns a customer-safe error when a requested booking time violates restaurant policy. */
export const getBookingTimeValidationError = (
  startTime: string,
  channel: BookingChannel,
  now: Date = new Date(),
): string | null => {
  if (!bookingTimeValidationEnabled) return null;

  const bookingStart = parseVietnamBookingDateTime(startTime);
  if (Number.isNaN(bookingStart.getTime())) {
    return "Thời gian đặt bàn không hợp lệ.";
  }

  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(bookingStart);

  if (!isValidBookingClock(clock)) {
    return "Thời gian đặt bàn không hợp lệ.";
  }

  const bookingCalendarDate = getVietnamCalendarDate(bookingStart);
  const bookingDateError = getBookingDateValidationError(bookingCalendarDate, now);
  if (bookingDateError) {
    return bookingDateError;
  }
  if (bookingStart.getTime() < now.getTime()) {
    return "Thời gian đặt bàn không được ở quá khứ.";
  }

  const latestArrival = getBookingLastArrivalTime(channel);
  if (clock < RESTAURANT_HOURS.OPEN || clock > latestArrival) {
    const channelMessage = channel === BOOKING_CHANNEL.DIRECT ? "tại nhà hàng" : "online";
    return `Đặt bàn ${channelMessage} nhận giờ đến từ ${RESTAURANT_HOURS.OPEN} đến ${latestArrival}.`;
  }

  return null;
};

/** Returns an error when a walk-in is opened outside the physical service window. */
export const getWalkInTimeValidationError = (now: Date = new Date()): string | null => {
  if (!bookingTimeValidationEnabled) return null;

  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  if (clock < RESTAURANT_HOURS.OPEN || clock > WALK_IN_LAST_ARRIVAL_TIME) {
    return `Nhà hàng chỉ nhận khách vãng lai từ ${RESTAURANT_HOURS.OPEN} đến ${WALK_IN_LAST_ARRIVAL_TIME}.`;
  }
  return null;
};
