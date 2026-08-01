import https from "https";
import * as db from "./db";
import type { AvailableBookingTable } from "./db";
import type { MenuItem } from "./types";
import { BOOKING_DURATION_MINUTES, MAX_BOOKING_PARTY_SIZE } from "../constants/booking";
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
  HOURS: "🕐 Giờ mở cửa",
  CONTACT: "☎️ Liên hệ",
  SKIP_EMAIL: "Bỏ qua",
  CONFIRM_BOOKING: "✅ Xác nhận đặt bàn",
  CHANGE_TIME: "🕐 Đổi giờ",
  CHANGE_DATE: "📅 Đổi ngày",
  CANCEL_BOOKING: "❌ Hủy",
} as const;

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
  availableTables?: AvailableBookingTable[];
  table?: AvailableBookingTable;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
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

/** Formats an available table in a compact customer-facing form. */
const formatTableLabel = (table: AvailableBookingTable): string =>
  `Bàn ${table.name} · ${table.capacity} chỗ${table.area_name ? ` · ${table.area_name}` : ""}`;

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
    "Bạn muốn đến lúc mấy giờ? Nhập theo HH:mm, ví dụ 19:00.",
    getChoiceKeyboard([
      [
        { text: "18:00", callbackData: "time:18:00" },
        { text: "18:30", callbackData: "time:18:30" },
        { text: "19:00", callbackData: "time:19:00" },
        { text: "19:30", callbackData: "time:19:30" },
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
    `Bàn: ${formatTableLabel(session.table as AvailableBookingTable)}`,
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
    !session.table ||
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
      table_id: session.table.id,
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
      `✅ Đặt bàn thành công!\n\nMã booking: ${booking.confirmation_code}\n${formatTableLabel(session.table)}\nThời gian: ${session.time} ${session.date}\nSố khách: ${session.partySize}`,
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
    session.endTime = calculateEndTime(session.startTime);
    const tables = await db.getAvailableBookingTables(session.partySize, session.startTime, session.endTime);
    if (tables.length === 0) {
      bookingSessions.delete(chatId);
      await sendCustomerMessage(chatId, "Rất tiếc, không còn bàn phù hợp trong khung giờ này. Vui lòng thử giờ khác.", getMainKeyboard());
      return;
    }
    session.availableTables = tables;
    session.step = BOOKING_BOT_STEP.TABLE;
    await sendCustomerMessage(
      chatId,
      `Có ${tables.length} bàn trống cho ${session.partySize} khách lúc ${session.time}. Hãy chọn bàn:`,
      getChoiceKeyboard([
        ...tables.slice(0, 10).map((table) => [
          { text: formatTableLabel(table), callbackData: `table:${table.id}` },
        ]),
        [
          { text: BOT_ACTION.CHANGE_TIME, callbackData: "action:change-time" },
          { text: BOT_ACTION.CHANGE_DATE, callbackData: "action:change-date" },
        ],
        [{ text: BOT_ACTION.CANCEL_BOOKING, callbackData: "action:cancel" }],
      ]),
    );
    return;
  }

  if (session.step === BOOKING_BOT_STEP.TABLE) {
    if (isValidBookingTime(text)) {
      session.step = BOOKING_BOT_STEP.TIME;
      await handleBookingInput(chatId, session, text);
      return;
    }
    const selectedTable = session.availableTables?.find((table) => formatTableLabel(table) === text);
    if (!selectedTable) {
      await sendCustomerMessage(chatId, "Vui lòng chọn một bàn trong các nút đang hiển thị.");
      return;
    }
    session.table = selectedTable;
    session.step = BOOKING_BOT_STEP.NAME;
    await sendCustomerMessage(chatId, "Vui lòng cho biết tên của bạn.");
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
  if (callbackData.startsWith("table:")) {
    const tableId = Number(callbackData.slice("table:".length));
    const table = session.availableTables?.find((item) => item.id === tableId);
    if (table) {
      await handleBookingInput(chatId, session, formatTableLabel(table));
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
