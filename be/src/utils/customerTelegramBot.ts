import https from "https";
import * as db from "./db";
import type { BookingTableAllocationOption } from "./db";
import type { MenuItem } from "./types";
import {
  BOOKING_CHANNEL,
  BOOKING_DURATION_MINUTES,
  MAX_BOOKING_PARTY_SIZE,
  ONLINE_BOOKING_LAST_ARRIVAL_TIME,
  RESTAURANT_HOURS,
} from "../constants/booking";
import { getBookingDateValidationError, getBookingTimeValidationError } from "./bookingTime";
import { sendBookingConfirmationEmail } from "./email";
import { notifyWaitersAboutBooking } from "./telegram";
import { getPhoneNumberValidationError } from "./validation";

const BOT_COMMAND = {
  START: "/start",
  MENU: "/menu",
  BOOKING: "/booking",
  HOURS: "/hours",
  CONTACT: "/contact",
} as const;

const BOT_ACTION = {
  VIEW_MENU: "📋 Xem thực đơn",
  CREATE_BOOKING: "📅 Đặt bàn",
  CHECK_TABLE_AVAILABILITY: "🔎 Kiểm tra bàn trống",
  HOURS: "🕐 Giờ mở cửa",
  CONTACT: "☎️ Liên hệ",
  SKIP_EMAIL: "Bỏ qua",
  CONFIRM_BOOKING: "✅ Xác nhận đặt bàn",
  CHANGE_TIME: "🕐 Đổi giờ",
  CHANGE_DATE: "📅 Đổi ngày",
  CANCEL_BOOKING: "❌ Hủy",
} as const;

const BOOKING_OPTION_CALLBACK = {
  SELECT: "option:",
  PAGE: "option-page:",
} as const;

const TABLE_AVAILABILITY_CALLBACK = {
  START: "action:table-availability",
} as const;

const BOOKING_OPTIONS_PER_PAGE = 10;
const TABLE_CODE_PATTERN = /^B\d+$/i;
const MINUTES_PER_HOUR = 60;

/** Categories not shown in the customer-facing curated restaurant menu. */
const CUSTOMER_MENU_HIDDEN_CATEGORIES = new Set(["Lẩu"]);

const BOOKING_BOT_STEP = {
  GUEST_COUNT: "guest_count",
  DATE: "date",
  TIME: "time",
  TABLE: "table",
  NAME: "name",
  PHONE: "phone",
  EMAIL: "email",
  CONFIRMATION: "confirmation",
  AVAILABILITY_TABLE: "availability_table",
  AVAILABILITY_DATE: "availability_date",
} as const;

type BookingBotStep = (typeof BOOKING_BOT_STEP)[keyof typeof BOOKING_BOT_STEP];

interface TelegramUpdate {
  update_id: number;
  message?: {
    text?: string;
    chat: { id: number; type: string };
  };
  callback_query?: {
    id: string;
    data?: string;
    message?: { chat: { id: number; type: string } };
  };
}

interface TelegramInlineKeyboard {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
}

interface BookingSession {
  step: BookingBotStep;
  partySize?: number;
  date?: string;
  time?: string;
  startTime?: string;
  endTime?: string;
  availableOptions?: BookingTableAllocationOption[];
  selectedOption?: BookingTableAllocationOption;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  availabilityTableName?: string;
}

let isPolling = false;
let nextOffset = 0;
const bookingSessions = new Map<number, BookingSession>();

/** Reads the customer bot token without retaining whitespace copied from BotFather. */
const getBotToken = (): string | undefined =>
  process.env.TELEGRAM_CUSTOMER_BOT_TOKEN?.replace(/\s+/g, "");

/** Makes a typed Telegram Bot API request. */
const telegramRequest = async <T>(
  method: string,
  payload?: Record<string, unknown>,
): Promise<T> => {
  const token = getBotToken();
  if (!token) throw new Error("TELEGRAM_CUSTOMER_BOT_TOKEN chưa được cấu hình.");

  const body = payload ? JSON.stringify(payload) : "";
  return new Promise<T>((resolve, reject) => {
    const request = https.request(
      {
        hostname: "api.telegram.org",
        port: 443,
        path: `/bot${token}/${method}`,
        method: payload ? "POST" : "GET",
        headers: payload
          ? {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(body),
            }
          : undefined,
      },
      (response) => {
        let responseBody = "";
        response.on("data", (chunk: Buffer) => {
          responseBody += chunk.toString();
        });
        response.on("end", () => {
          try {
            const parsed = JSON.parse(responseBody) as {
              ok: boolean;
              result?: T;
              description?: string;
            };
            if (!parsed.ok) {
              reject(new Error(parsed.description || `Telegram API trả về HTTP ${response.statusCode}`));
              return;
            }
            resolve(parsed.result as T);
          } catch {
            reject(new Error(`Không đọc được phản hồi Telegram: ${responseBody}`));
          }
        });
      },
    );

    request.on("error", reject);
    if (payload) request.write(body);
    request.end();
  });
};

/** Sends a bot response, optionally with a keyboard of safe text actions. */
const sendCustomerMessage = async (
  chatId: number,
  text: string,
  keyboard?: TelegramInlineKeyboard,
): Promise<void> => {
  await telegramRequest("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: keyboard,
  });
};

/** Builds the primary keyboard shown when no booking form is in progress. */
const getMainKeyboard = (): TelegramInlineKeyboard => ({
  inline_keyboard: [
    [
      { text: BOT_ACTION.VIEW_MENU, callback_data: "action:menu" },
      { text: BOT_ACTION.CREATE_BOOKING, callback_data: "action:booking" },
    ],
    [
      { text: BOT_ACTION.HOURS, callback_data: "action:hours" },
      { text: BOT_ACTION.CONTACT, callback_data: "action:contact" },
    ],
    [{ text: BOT_ACTION.CHECK_TABLE_AVAILABILITY, callback_data: TABLE_AVAILABILITY_CALLBACK.START }],
  ],
});

/** Builds a one-use keyboard from customer choices. */
const getChoiceKeyboard = (
  choices: Array<Array<{ text: string; callbackData: string }>>,
): TelegramInlineKeyboard => ({
  inline_keyboard: choices.map((row) =>
    row.map((choice) => ({ text: choice.text, callback_data: choice.callbackData })),
  ),
});

/** Formats a menu price for Vietnamese customers. */
const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

/** Formats one future booking allocation without claiming that tables are physically merged. */
const formatBookingOptionLabel = (option: BookingTableAllocationOption): string => {
  const tableNames = option.tables.map((table) => table.name).join(" + ");
  const kindLabel = option.allocationKind === "adjacent"
    ? "liền kề"
    : option.allocationKind === "separate"
      ? "nhiều khu"
      : "một bàn";
  return `${tableNames} · ${option.totalCapacity} chỗ · ${kindLabel}`;
};

/** Builds one navigable page of all valid table allocation choices for a Telegram booking. */
const getBookingOptionPageKeyboard = (
  options: BookingTableAllocationOption[],
  page: number,
): TelegramInlineKeyboard => {
  const pageCount = Math.ceil(options.length / BOOKING_OPTIONS_PER_PAGE);
  const pageStart = page * BOOKING_OPTIONS_PER_PAGE;
  const optionRows = options
    .slice(pageStart, pageStart + BOOKING_OPTIONS_PER_PAGE)
    .map((option, index) => [{
      text: formatBookingOptionLabel(option),
      callbackData: `${BOOKING_OPTION_CALLBACK.SELECT}${pageStart + index}`,
    }]);
  const navigationRow: Array<{ text: string; callbackData: string }> = [];

  if (page > 0) {
    navigationRow.push({ text: "⬅️ Trang trước", callbackData: `${BOOKING_OPTION_CALLBACK.PAGE}${page - 1}` });
  }
  if (page < pageCount - 1) {
    navigationRow.push({ text: "Trang sau ➡️", callbackData: `${BOOKING_OPTION_CALLBACK.PAGE}${page + 1}` });
  }

  return getChoiceKeyboard([
    ...optionRows,
    ...(navigationRow.length > 0 ? [navigationRow] : []),
    [
      { text: BOT_ACTION.CHANGE_TIME, callbackData: "action:change-time" },
      { text: BOT_ACTION.CHANGE_DATE, callbackData: "action:change-date" },
    ],
    [{ text: BOT_ACTION.CANCEL_BOOKING, callbackData: "action:cancel" }],
  ]);
};

/** Sends a page of every valid allocation, keeping non-adjacent tables available as valid choices. */
const showBookingOptionPage = async (
  chatId: number,
  session: BookingSession,
  requestedPage: number,
): Promise<void> => {
  const options = session.availableOptions ?? [];
  if (options.length === 0 || !session.partySize || !session.time) {
    await sendCustomerMessage(chatId, "Không tìm thấy phương án bàn phù hợp. Vui lòng chọn lại giờ đặt.", getMainKeyboard());
    return;
  }

  const pageCount = Math.ceil(options.length / BOOKING_OPTIONS_PER_PAGE);
  const page = Math.min(Math.max(requestedPage, 0), pageCount - 1);
  const rangeStart = page * BOOKING_OPTIONS_PER_PAGE + 1;
  const rangeEnd = Math.min(rangeStart + BOOKING_OPTIONS_PER_PAGE - 1, options.length);
  await sendCustomerMessage(
    chatId,
    `Có ${options.length} phương án xếp bàn cho ${session.partySize} khách lúc ${session.time}. Trang ${page + 1}/${pageCount}, hiển thị phương án ${rangeStart}-${rangeEnd}. Bạn có thể xem toàn bộ danh sách, kể cả các bàn ở khu vực xa.`,
    getBookingOptionPageKeyboard(options, page),
  );
};

/** Returns a SQL DATETIME-like string from a booking date and clock time. */
const toBookingDateTime = (date: string, time: string): string => `${date} ${time}:00`;

/** Calculates the booking end time using the configured restaurant service duration. */
const calculateEndTime = (startTime: string): string => {
  const start = new Date(`${startTime.replace(" ", "T")}+07:00`);
  const end = new Date(start.getTime() + BOOKING_DURATION_MINUTES * 60 * 1000);
  const vietnamTime = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(end);
  return vietnamTime.replace("T", " ");
};

/** Prompts the customer to choose or type another arrival time. */
const askForBookingTime = async (chatId: number): Promise<void> => {
  await sendCustomerMessage(
    chatId,
    `Bạn muốn đến lúc mấy giờ? Nhập theo HH:mm (có thể nhập 10:46). Nhà hàng nhận đặt online từ ${RESTAURANT_HOURS.OPEN} đến ${ONLINE_BOOKING_LAST_ARRIVAL_TIME}.`,
    getChoiceKeyboard([
      [
        { text: "10:00", callbackData: "time:10:00" },
        { text: "12:00", callbackData: "time:12:00" },
        { text: "18:00", callbackData: "time:18:00" },
        { text: ONLINE_BOOKING_LAST_ARRIVAL_TIME, callbackData: `time:${ONLINE_BOOKING_LAST_ARRIVAL_TIME}` },
      ],
      [{ text: BOT_ACTION.CANCEL_BOOKING, callbackData: "action:cancel" }],
    ]),
  );
};

/** Parses YYYY-MM-DD or DD/MM/YYYY while rejecting invalid calendar dates. */
const parseBookingDate = (value: string): string | null => {
  const normalized = value.trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  const vietnameseMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(normalized);
  const year = Number(isoMatch?.[1] ?? vietnameseMatch?.[3]);
  const month = Number(isoMatch?.[2] ?? vietnameseMatch?.[2]);
  const day = Number(isoMatch?.[3] ?? vietnameseMatch?.[1]);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    !Number.isInteger(year) ||
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

/** Validates a 24-hour HH:mm time supplied by a customer. */
const isValidBookingTime = (value: string): boolean => {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return false;
  return Number(match[1]) < 24 && Number(match[2]) < 60;
};

interface TableArrivalRange {
  start: string;
  end: string;
}

/** Converts a valid HH:mm restaurant-local clock value into minutes since midnight. */
const clockToMinutes = (clock: string): number => {
  const [hours, minutes] = clock.split(":").map(Number);
  return hours * MINUTES_PER_HOUR + minutes;
};

/** Formats a minute offset since midnight as a customer-readable restaurant-local clock. */
const minutesToClock = (minutes: number): string => {
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const minutePart = minutes % MINUTES_PER_HOUR;
  return `${String(hours).padStart(2, "0")}:${String(minutePart).padStart(2, "0")}`;
};

/** Calculates arrival-time ranges that retain the configured three-hour booking service window. */
const getAvailableArrivalRanges = (
  bookedIntervals: db.BookingTableBookedInterval[],
): TableArrivalRange[] => {
  const openingMinute = clockToMinutes(RESTAURANT_HOURS.OPEN);
  const closingMinute = clockToMinutes(RESTAURANT_HOURS.CLOSE);
  const lastOnlineArrivalMinute = clockToMinutes(ONLINE_BOOKING_LAST_ARRIVAL_TIME);
  const sortedIntervals = bookedIntervals
    .map((interval) => ({
      start: clockToMinutes(interval.start_time),
      end: clockToMinutes(interval.end_time),
    }))
    .filter((interval) => interval.end > openingMinute && interval.start < closingMinute && interval.end > interval.start)
    .sort((first, second) => first.start - second.start);
  const ranges: TableArrivalRange[] = [];
  let freeFromMinute = openingMinute;

  for (const interval of sortedIntervals) {
    const blockedStartMinute = Math.max(interval.start, openingMinute);
    const blockedEndMinute = Math.min(interval.end, closingMinute);
    const latestArrivalMinute = Math.min(
      blockedStartMinute - BOOKING_DURATION_MINUTES,
      lastOnlineArrivalMinute,
    );

    if (latestArrivalMinute >= freeFromMinute) {
      ranges.push({
        start: minutesToClock(freeFromMinute),
        end: minutesToClock(latestArrivalMinute),
      });
    }
    freeFromMinute = Math.max(freeFromMinute, blockedEndMinute);
  }

  const latestArrivalMinute = Math.min(
    closingMinute - BOOKING_DURATION_MINUTES,
    lastOnlineArrivalMinute,
  );
  if (latestArrivalMinute >= freeFromMinute) {
    ranges.push({
      start: minutesToClock(freeFromMinute),
      end: minutesToClock(latestArrivalMinute),
    });
  }
  return ranges;
};

/** Shows one table's booked slots and all arrival ranges still available on a valid booking date. */
const showTableAvailability = async (
  chatId: number,
  tableName: string,
  date: string,
): Promise<void> => {
  const availability = await db.getBookingTableAvailabilityForDate(tableName, date);
  if (!availability) {
    await sendCustomerMessage(
      chatId,
      `Không tìm thấy bàn ${tableName}. Vui lòng kiểm tra lại mã bàn, ví dụ B01.`,
      getMainKeyboard(),
    );
    return;
  }

  const bookedText = availability.bookedIntervals.length > 0
    ? availability.bookedIntervals.map((interval) => `${interval.start_time}–${interval.end_time}`).join(", ")
    : "Chưa có lịch đặt";
  const freeRanges = getAvailableArrivalRanges(availability.bookedIntervals);
  const freeText = freeRanges.length > 0
    ? freeRanges.map((range) => range.start === range.end ? range.start : `${range.start}–${range.end}`).join(", ")
    : "Không còn khung giờ đủ 3 giờ phục vụ";

  await sendCustomerMessage(
    chatId,
    `🔎 LỊCH BÀN ${availability.name} — ${date}\nSức chứa: ${availability.capacity} khách\n\nĐã có khách: ${bookedText}\nCó thể nhận khách lúc: ${freeText}\n\nMỗi booking được giữ khung phục vụ ${BOOKING_DURATION_MINUTES / MINUTES_PER_HOUR} giờ.`,
    getMainKeyboard(),
  );
};

/** Shows available menu items from the same database used by the website. */
const showMenu = async (chatId: number): Promise<void> => {
  const menuItems = await db.getMenuItems();
  const availableItems = menuItems.filter(
    (item: MenuItem) => item.available && !CUSTOMER_MENU_HIDDEN_CATEGORIES.has(item.category),
  );
  if (availableItems.length === 0) {
    await sendCustomerMessage(chatId, "Hiện nhà hàng chưa có món phục vụ. Vui lòng liên hệ hotline để được hỗ trợ.", getMainKeyboard());
    return;
  }

  const itemsByCategory = new Map<string, MenuItem[]>();
  for (const item of availableItems) {
    const categoryItems = itemsByCategory.get(item.category) ?? [];
    categoryItems.push(item);
    itemsByCategory.set(item.category, categoryItems);
  }

  const menuText = [...itemsByCategory.entries()]
    .map(([category, items]) => {
      const itemLines = items
        .map((item) => `• ${item.name} — ${formatCurrency(Number(item.price))}`)
        .join("\n");
      return `【${category.toLocaleUpperCase("vi-VN")}】\n${itemLines}`;
    })
    .join("\n\n");
  await sendCustomerMessage(
    chatId,
    `📋 THỰC ĐƠN NHÀ HÀNG\n\n${menuText}`,
    getMainKeyboard(),
  );
};

/** Starts a new booking session for a Telegram customer. */
const startBookingConversation = async (chatId: number): Promise<void> => {
  bookingSessions.set(chatId, { step: BOOKING_BOT_STEP.GUEST_COUNT });
  await sendCustomerMessage(
    chatId,
    `Bạn đi bao nhiêu người? Hãy nhập số nguyên từ 1 đến ${MAX_BOOKING_PARTY_SIZE}.`,
  );
};

/** Starts the customer flow for checking the calendar availability of a specific table. */
const startTableAvailabilityConversation = async (chatId: number): Promise<void> => {
  bookingSessions.set(chatId, { step: BOOKING_BOT_STEP.AVAILABILITY_TABLE });
  await sendCustomerMessage(
    chatId,
    "Nhập mã bàn cần kiểm tra, ví dụ B01. Tôi sẽ cho biết các khung giờ còn trống theo ngày bạn chọn.",
    getChoiceKeyboard([[{ text: BOT_ACTION.CANCEL_BOOKING, callbackData: "action:cancel" }]]),
  );
};

/** Stops the current booking flow and restores the primary actions. */
const cancelBookingConversation = async (chatId: number): Promise<void> => {
  bookingSessions.delete(chatId);
  await sendCustomerMessage(chatId, "Đã hủy thao tác đặt bàn.", getMainKeyboard());
};

/** Displays a confirmation summary before the booking is persisted. */
const askForConfirmation = async (chatId: number, session: BookingSession): Promise<void> => {
  const summary = [
    "📋 XÁC NHẬN ĐẶT BÀN",
    `Khách hàng: ${session.guestName}`,
    `SĐT: ${session.guestPhone}`,
    `Số khách: ${session.partySize}`,
    `Thời gian: ${session.time} ${session.date}`,
    `Bàn: ${formatBookingOptionLabel(session.selectedOption as BookingTableAllocationOption)}`,
    `Email: ${session.guestEmail ?? "Không cung cấp"}`,
  ].join("\n");
  await sendCustomerMessage(
    chatId,
    `${summary}\n\nBạn xác nhận đặt bàn chứ?`,
    getChoiceKeyboard([
      [{ text: BOT_ACTION.CONFIRM_BOOKING, callbackData: "action:confirm" }],
      [{ text: BOT_ACTION.CANCEL_BOOKING, callbackData: "action:cancel" }],
    ]),
  );
};

/** Persists a confirmed Telegram booking and triggers the existing staff/email notifications. */
const confirmBooking = async (chatId: number, session: BookingSession): Promise<void> => {
  if (
    !session.selectedOption ||
    !session.partySize ||
    !session.startTime ||
    !session.endTime ||
    !session.guestName ||
    !session.guestPhone
  ) {
    await cancelBookingConversation(chatId);
    return;
  }

  try {
    const booking = await db.createBooking({
      table_id: session.selectedOption.primaryTable.id,
      table_ids: session.selectedOption.tables.map((table) => table.id),
      booking_channel: BOOKING_CHANNEL.ONLINE,
      customer_id: null,
      promotion_id: null,
      guest_name: session.guestName,
      guest_phone: session.guestPhone,
      guest_email: session.guestEmail ?? null,
      party_size: session.partySize,
      start_time: session.startTime,
      end_time: session.endTime,
      guest_note: "Đặt qua Telegram Customer Bot",
      note: "Đặt qua Telegram Customer Bot",
      pre_ordered_items: [],
    });

    bookingSessions.delete(chatId);
    notifyWaitersAboutBooking(booking).catch((error: unknown) => {
      console.error("Không thể gửi thông báo booking Telegram cho waiter:", (error as Error).message);
    });
    sendBookingConfirmationEmail(booking).catch((error: unknown) => {
      console.error("Không thể gửi email xác nhận booking Telegram:", (error as Error).message);
    });
    await sendCustomerMessage(
      chatId,
      `✅ Đặt bàn thành công!\n\nMã booking: ${booking.confirmation_code}\n${formatBookingOptionLabel(session.selectedOption)}\nThời gian: ${session.time} ${session.date}\nSố khách: ${session.partySize}`,
      getMainKeyboard(),
    );
  } catch (error) {
    bookingSessions.delete(chatId);
    await sendCustomerMessage(
      chatId,
      `Rất tiếc, bàn vừa không còn trống. ${error instanceof Error ? error.message : "Vui lòng đặt lại."}`,
      getMainKeyboard(),
    );
  }
};

/** Advances the booking form based on a normal Telegram text message. */
const handleBookingInput = async (chatId: number, session: BookingSession, text: string): Promise<void> => {
  if (text === BOT_ACTION.CANCEL_BOOKING) {
    await cancelBookingConversation(chatId);
    return;
  }

  if (session.step === BOOKING_BOT_STEP.AVAILABILITY_TABLE) {
    const tableName = text.trim().toUpperCase();
    if (!TABLE_CODE_PATTERN.test(tableName)) {
      await sendCustomerMessage(chatId, "Mã bàn chưa hợp lệ. Vui lòng nhập theo dạng B01, B25 hoặc B40.");
      return;
    }
    session.availabilityTableName = tableName;
    session.step = BOOKING_BOT_STEP.AVAILABILITY_DATE;
    await sendCustomerMessage(chatId, "Bạn muốn kiểm tra ngày nào? Nhập theo DD/MM/YYYY hoặc YYYY-MM-DD.");
    return;
  }

  if (session.step === BOOKING_BOT_STEP.AVAILABILITY_DATE) {
    const date = parseBookingDate(text);
    if (!date) {
      await sendCustomerMessage(chatId, "Ngày chưa hợp lệ. Ví dụ: 05/08/2026.");
      return;
    }
    const bookingDateError = getBookingDateValidationError(date);
    if (bookingDateError) {
      await sendCustomerMessage(chatId, bookingDateError);
      return;
    }
    const tableName = session.availabilityTableName;
    bookingSessions.delete(chatId);
    await showTableAvailability(chatId, tableName ?? "", date);
    return;
  }

  if (session.step === BOOKING_BOT_STEP.GUEST_COUNT) {
    const partySize = Number(text);
    if (!Number.isInteger(partySize) || partySize < 1 || partySize > MAX_BOOKING_PARTY_SIZE) {
      await sendCustomerMessage(chatId, `Vui lòng nhập số nguyên từ 1 đến ${MAX_BOOKING_PARTY_SIZE}.`);
      return;
    }
    session.partySize = partySize;
    session.step = BOOKING_BOT_STEP.DATE;
    await sendCustomerMessage(chatId, "Bạn muốn đặt ngày nào? Nhập theo DD/MM/YYYY hoặc YYYY-MM-DD.");
    return;
  }

  if (session.step === BOOKING_BOT_STEP.DATE) {
    const date = parseBookingDate(text);
    if (!date) {
      await sendCustomerMessage(chatId, "Ngày chưa hợp lệ. Ví dụ: 05/08/2026.");
      return;
    }
    const bookingDateError = getBookingDateValidationError(date);
    if (bookingDateError) {
      await sendCustomerMessage(chatId, bookingDateError);
      return;
    }
    session.date = date;
    session.step = BOOKING_BOT_STEP.TIME;
    await askForBookingTime(chatId);
    return;
  }

  if (session.step === BOOKING_BOT_STEP.TIME) {
    if (!isValidBookingTime(text) || !session.date || !session.partySize) {
      await sendCustomerMessage(chatId, "Giờ chưa hợp lệ. Ví dụ: 19:00.");
      return;
    }
    session.time = text.trim();
    session.startTime = toBookingDateTime(session.date, session.time);
    const bookingTimeError = getBookingTimeValidationError(session.startTime, BOOKING_CHANNEL.ONLINE);
    if (bookingTimeError) {
      await sendCustomerMessage(chatId, bookingTimeError);
      return;
    }
    session.endTime = calculateEndTime(session.startTime);
    const options = await db.getAvailableBookingTableOptions(session.partySize, session.startTime, session.endTime);
    if (options.length === 0) {
      bookingSessions.delete(chatId);
      await sendCustomerMessage(chatId, "Rất tiếc, không còn bàn phù hợp trong khung giờ này. Vui lòng thử giờ khác.", getMainKeyboard());
      return;
    }
    session.availableOptions = options;
    session.step = BOOKING_BOT_STEP.TABLE;
    await showBookingOptionPage(chatId, session, 0);
    return;
  }

  if (session.step === BOOKING_BOT_STEP.TABLE) {
    if (isValidBookingTime(text)) {
      session.step = BOOKING_BOT_STEP.TIME;
      await handleBookingInput(chatId, session, text);
      return;
    }
    await sendCustomerMessage(chatId, "Vui lòng chọn một phương án xếp bàn trong các nút đang hiển thị.");
    return;
  }

  if (session.step === BOOKING_BOT_STEP.NAME) {
    if (text.trim().length < 2) {
      await sendCustomerMessage(chatId, "Tên cần có ít nhất 2 ký tự. Vui lòng nhập lại.");
      return;
    }
    session.guestName = text.trim();
    session.step = BOOKING_BOT_STEP.PHONE;
    await sendCustomerMessage(chatId, "Vui lòng nhập số điện thoại liên hệ.");
    return;
  }

  if (session.step === BOOKING_BOT_STEP.PHONE) {
    const phone = text.trim();
    const phoneError = getPhoneNumberValidationError(phone);
    if (phoneError) {
      await sendCustomerMessage(chatId, phoneError);
      return;
    }
    session.guestPhone = phone;
    session.step = BOOKING_BOT_STEP.EMAIL;
    await sendCustomerMessage(
      chatId,
      "Nhập email để nhận xác nhận (hoặc chọn Bỏ qua).",
      getChoiceKeyboard([
        [{ text: BOT_ACTION.SKIP_EMAIL, callbackData: "email:skip" }],
        [{ text: BOT_ACTION.CANCEL_BOOKING, callbackData: "action:cancel" }],
      ]),
    );
    return;
  }

  if (session.step === BOOKING_BOT_STEP.EMAIL) {
    if (text !== BOT_ACTION.SKIP_EMAIL && !/^\S+@\S+\.\S+$/.test(text.trim())) {
      await sendCustomerMessage(chatId, "Email chưa hợp lệ. Vui lòng nhập lại hoặc chọn Bỏ qua.");
      return;
    }
    session.guestEmail = text === BOT_ACTION.SKIP_EMAIL ? undefined : text.trim();
    session.step = BOOKING_BOT_STEP.CONFIRMATION;
    await askForConfirmation(chatId, session);
    return;
  }

  if (session.step === BOOKING_BOT_STEP.CONFIRMATION) {
    if (text === BOT_ACTION.CONFIRM_BOOKING) {
      await confirmBooking(chatId, session);
      return;
    }
    await sendCustomerMessage(chatId, "Vui lòng chọn Xác nhận đặt bàn hoặc Hủy.");
  }
};

/** Handles top-level bot commands and delegates booking input to its session. */
const replyToCustomer = async (chatId: number, rawText: string): Promise<void> => {
  const text = rawText.trim();
  const normalizedText = text.toLocaleLowerCase("vi-VN");

  if (normalizedText.startsWith(BOT_COMMAND.START)) {
    bookingSessions.delete(chatId);
    await sendCustomerMessage(chatId, "Xin chào! Tôi là trợ lý ResManager. Bạn muốn xem thực đơn hay đặt bàn?", getMainKeyboard());
    return;
  }

  if (normalizedText === BOT_COMMAND.MENU || text === BOT_ACTION.VIEW_MENU || normalizedText === "menu") {
    bookingSessions.delete(chatId);
    await showMenu(chatId);
    return;
  }

  if (normalizedText === BOT_COMMAND.BOOKING || text === BOT_ACTION.CREATE_BOOKING || normalizedText === "đặt bàn") {
    await startBookingConversation(chatId);
    return;
  }

  if (text === BOT_ACTION.CHECK_TABLE_AVAILABILITY || normalizedText === "kiểm tra bàn trống") {
    await startTableAvailabilityConversation(chatId);
    return;
  }

  if (normalizedText === BOT_COMMAND.HOURS || text === BOT_ACTION.HOURS) {
    await sendCustomerMessage(chatId, "Nhà hàng mở cửa hằng ngày từ 10:00 đến 22:00.", getMainKeyboard());
    return;
  }

  if (normalizedText === BOT_COMMAND.CONTACT || text === BOT_ACTION.CONTACT) {
    await sendCustomerMessage(chatId, "Hotline nhà hàng: 028 3829 4000. Chúng tôi rất hân hạnh được hỗ trợ bạn!", getMainKeyboard());
    return;
  }

  const session = bookingSessions.get(chatId);
  if (session) {
    await handleBookingInput(chatId, session, text);
    return;
  }

  await sendCustomerMessage(chatId, "Tôi chưa hiểu yêu cầu. Hãy chọn một chức năng bên dưới hoặc gõ /start.", getMainKeyboard());
};

/** Answers a Telegram button click and advances the corresponding booking state. */
const handleCallbackQuery = async (
  callbackId: string,
  chatId: number,
  callbackData: string,
): Promise<void> => {
  await telegramRequest("answerCallbackQuery", { callback_query_id: callbackId });

  if (callbackData === "action:menu") {
    bookingSessions.delete(chatId);
    await showMenu(chatId);
    return;
  }
  if (callbackData === "action:booking") {
    await startBookingConversation(chatId);
    return;
  }
  if (callbackData === TABLE_AVAILABILITY_CALLBACK.START) {
    await startTableAvailabilityConversation(chatId);
    return;
  }
  if (callbackData === "action:hours") {
    await sendCustomerMessage(chatId, "Nhà hàng mở cửa hằng ngày từ 10:00 đến 22:00.", getMainKeyboard());
    return;
  }
  if (callbackData === "action:contact") {
    await sendCustomerMessage(chatId, "Hotline nhà hàng: 028 3829 4000. Chúng tôi rất hân hạnh được hỗ trợ bạn!", getMainKeyboard());
    return;
  }
  if (callbackData === "action:cancel") {
    await cancelBookingConversation(chatId);
    return;
  }

  const session = bookingSessions.get(chatId);
  if (!session) {
    await sendCustomerMessage(chatId, "Phiên đặt bàn đã hết hạn. Hãy bấm Đặt bàn để bắt đầu lại.", getMainKeyboard());
    return;
  }

  if (callbackData === "action:change-time") {
    session.step = BOOKING_BOT_STEP.TIME;
    await askForBookingTime(chatId);
    return;
  }
  if (callbackData === "action:change-date") {
    session.step = BOOKING_BOT_STEP.DATE;
    await sendCustomerMessage(chatId, "Bạn muốn đặt ngày nào? Nhập theo DD/MM/YYYY hoặc YYYY-MM-DD.");
    return;
  }

  if (callbackData === "action:confirm") {
    await handleBookingInput(chatId, session, BOT_ACTION.CONFIRM_BOOKING);
    return;
  }
  if (callbackData === "email:skip") {
    await handleBookingInput(chatId, session, BOT_ACTION.SKIP_EMAIL);
    return;
  }
  if (callbackData.startsWith("guest:")) {
    await handleBookingInput(chatId, session, callbackData.slice("guest:".length));
    return;
  }
  if (callbackData.startsWith("time:")) {
    await handleBookingInput(chatId, session, callbackData.slice("time:".length));
    return;
  }
  if (callbackData.startsWith(BOOKING_OPTION_CALLBACK.PAGE)) {
    const requestedPage = Number(callbackData.slice(BOOKING_OPTION_CALLBACK.PAGE.length));
    if (Number.isInteger(requestedPage)) {
      await showBookingOptionPage(chatId, session, requestedPage);
      return;
    }
  }
  if (callbackData.startsWith(BOOKING_OPTION_CALLBACK.SELECT)) {
    const optionIndex = Number(callbackData.slice(BOOKING_OPTION_CALLBACK.SELECT.length));
    const option = session.availableOptions?.[optionIndex];
    if (option) {
      session.selectedOption = option;
      session.step = BOOKING_BOT_STEP.NAME;
      await sendCustomerMessage(chatId, "Vui lòng cho biết tên của bạn.");
      return;
    }
  }

  await sendCustomerMessage(chatId, "Lựa chọn không hợp lệ. Vui lòng thử lại.", getMainKeyboard());
};

/** Retrieves Telegram updates and processes private customer messages in order. */
const pollCustomerBot = async (): Promise<void> => {
  try {
    const updates = await telegramRequest<TelegramUpdate[]>(`getUpdates?timeout=25&offset=${nextOffset}`);
    for (const update of updates) {
      nextOffset = update.update_id + 1;
      const message = update.message;
      if (message?.text && message.chat.type === "private") {
        try {
          await replyToCustomer(message.chat.id, message.text);
        } catch (error) {
          console.error("Không thể trả lời khách qua Telegram:", (error as Error).message);
        }
        continue;
      }

      const callback = update.callback_query;
      if (callback?.data && callback.message?.chat.type === "private") {
        try {
          await handleCallbackQuery(callback.id, callback.message.chat.id, callback.data);
        } catch (error) {
          console.error("Không thể xử lý nút Telegram của khách:", (error as Error).message);
        }
      }
    }
  } catch (error) {
    console.error("Telegram Customer Bot polling lỗi:", (error as Error).message);
  }
};

/** Starts local long-polling for the customer-facing Telegram bot. */
export const startCustomerTelegramBot = (): void => {
  if (isPolling) return;
  if (!getBotToken()) {
    console.log("Customer Telegram Bot chưa chạy: thiếu TELEGRAM_CUSTOMER_BOT_TOKEN.");
    return;
  }

  isPolling = true;
  console.log("Customer Telegram Bot đang chạy (long-polling).");
  void (async () => {
    while (isPolling) {
      await pollCustomerBot();
    }
  })();
};
