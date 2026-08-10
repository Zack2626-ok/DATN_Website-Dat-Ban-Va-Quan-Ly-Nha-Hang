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

let bookingTimeValidationEnabled = true;

export const isBookingTimeValidationEnabled = (): boolean => bookingTimeValidationEnabled;

export const setBookingTimeValidationEnabled = (enabled: boolean): void => {
  bookingTimeValidationEnabled = enabled;
};

/** Convert "HH:mm" clock to Minutes From Midnight (MFM) */
export const clockToMfm = (clockStr: string): number => {
  const clean = clockStr.trim().slice(0, 5);
  const match = /^(\d{2}):(\d{2})$/.exec(clean);
  if (!match) return -1;
  return Number(match[1]) * 60 + Number(match[2]);
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

  const mfm = clockToMfm(clock);
  // Khung giờ đặt online: Ca trưa (10:00-13:45 = 600-825), Ca tối (17:00-20:30 = 1020-1230)
  const isLunchValid = mfm >= 600 && mfm <= 825;
  const isDinnerValid = mfm >= 1020 && mfm <= 1230;

  if (!isLunchValid && !isDinnerValid) {
    if (mfm > 825 && mfm < 1020) {
      return "⚠️ Ca trưa ngưng nhận đặt bàn online sau 13:45 (Giờ nghỉ ca gãy 15:01 - 16:59). Vui lòng chọn khung giờ Ca tối từ 17:00 đến 20:30.";
    }
    if (mfm > 1230 || mfm < 600) {
      return "⚠️ Ca tối ngưng nhận đặt bàn online sau 20:30. Vui lòng chọn khung giờ Ca trưa (10:00 - 13:45) hoặc Ca tối (17:00 - 20:30).";
    }
    return `Đặt bàn online chỉ nhận khung giờ Ca trưa (10:00 - 13:45) và Ca tối (17:00 - 20:30).`;
  }

  return null;
};

/** Returns an error when a walk-in is opened outside the physical service window. */
export const getWalkInTimeValidationError = (
  now: Date = new Date(),
  isManagerOverride: boolean = false
): string | null => {
  if (!bookingTimeValidationEnabled) return null;
  if (isManagerOverride) return null; // Quản lý được phép ghi đè

  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);

  const mfm = clockToMfm(clock);

  // Ca trưa nhận walk-in: 10:00 - 14:00 (600 - 840)
  // Giờ nghỉ ca gãy: 15:01 - 16:59 (901 - 1019) -> KHÓA HOÀN TOÀN
  // Ca tối nhận walk-in: 17:00 - 21:00 (1020 - 1260)

  const isLunchWalkIn = mfm >= 600 && mfm <= 840;
  const isDinnerWalkIn = mfm >= 1020 && mfm <= 1260;

  if (!isLunchWalkIn && !isDinnerWalkIn) {
    if (mfm >= 901 && mfm <= 1019) {
      return `⚠️ NHÀ HÀNG ĐANG TRONG GIỜ NGHĨ CA GÃY (${clock}). Khóa mọi tính năng mở bàn/bán hàng từ 15:01 đến 16:59. Mở ca tối lúc 17:00.`;
    }
    if (mfm > 840 && mfm <= 900) {
      return `⚠️ ĐÃ HẾT GIỜ NHẬN KHÁCH CA TRƯA (${clock}). Ngưng nhận khách mới sau 14:00 để dọn dẹp và đóng ca lúc 15:00.`;
    }
    if (mfm > 1260 && mfm <= 1320) {
      return `⚠️ ĐÃ HẾT GIỜ NHẬN KHÁCH CA TỐI (${clock}). Ngưng nhận khách mới sau 21:00 để dọn dẹp và đóng cửa lúc 22:00.`;
    }
    return `⚠️ NHÀ HÀNG CHƯA ĐẾN GIỜ MỞ CỬA (${clock}). Khung giờ mở bàn trực tiếp: Ca trưa (10:00 - 14:00) & Ca tối (17:00 - 21:00).`;
  }

  return null;
};

