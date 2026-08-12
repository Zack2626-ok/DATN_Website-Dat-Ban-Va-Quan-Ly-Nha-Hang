import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendError, sendSuccess } from "../utils/response";
import { getPhoneNumberValidationError } from "../utils/validation";
import { sendBookingConfirmationEmail } from "../utils/email";
import { notifyWaitersAboutBooking } from "../utils/telegram";
import {
  BOOKING_CHANNEL,
  BOOKING_DURATION_MINUTES,
  MAX_BOOKING_PARTY_SIZE,
  type BookingChannel,
} from "../constants/booking";
import { getBookingTimeValidationError } from "../utils/bookingTime";
import { io } from "../server";

/** Builds a Vietnam-local booking datetime string from a date and time query. */
const buildBookingDateTime = (date: string, time: string): string => `${date} ${time}:00`;

/** Adds the configured booking duration to a local booking start time. */
const calculateBookingEndTime = (startTime: string): string => {
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

/** Returns tables available for a requested booking interval. */
export const getAvailableTablesHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const date = typeof req.query.date === "string" ? req.query.date : "";
    const time = typeof req.query.time === "string" ? req.query.time : "";
    const guests = Number(req.query.guests);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      sendError(res, "date phải là YYYY-MM-DD và time phải là HH:mm", 400);
      return;
    }
    if (!Number.isInteger(guests) || guests < 1 || guests > MAX_BOOKING_PARTY_SIZE) {
      sendError(res, `guests phải từ 1 đến ${MAX_BOOKING_PARTY_SIZE}`, 400);
      return;
    }

    const bookingTimeError = getBookingTimeValidationError(
      buildBookingDateTime(date, time),
      BOOKING_CHANNEL.ONLINE,
    );
    if (bookingTimeError) {
      sendError(res, bookingTimeError, 400);
      return;
    }

    const startTime = buildBookingDateTime(date, time);
    const endTime = calculateBookingEndTime(startTime);
    const tables = await db.getAvailableBookingTables(guests, startTime, endTime);
    sendSuccess(res, { start_time: startTime, end_time: endTime, tables }, "Lấy bàn trống thành công");
  } catch (error) {
    console.error("Error fetching available booking tables:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getAllBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.query.status as string | undefined;
    const bookings = await db.getBookings(status);
    sendSuccess(res, bookings, "Lấy danh sách đặt bàn thành công");
  } catch (error) {
    console.error("Error fetching bookings:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getBookingByIdHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const booking = await db.getBookingById(Number(id));
    if (!booking) {
      sendError(res, "Không tìm thấy đặt bàn", 404);
      return;
    }
    sendSuccess(res, booking, "Lấy thông tin đặt bàn thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const createBookingHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { table_id, table_ids, booking_channel, customer_id, promotion_id, guest_name, guest_phone, guest_email, email, party_size, start_time, end_time, guest_note, note, pre_ordered_items, items } =
      req.body;

    if (!table_id || !guest_name || !guest_phone || !party_size || !start_time) {
      sendError(res, "Thiếu thông tin bắt buộc", 400);
      return;
    }

    const phoneError = getPhoneNumberValidationError(guest_phone);
    if (phoneError) {
      sendError(res, phoneError, 400);
      return;
    }

    const partySizeNum = Number(party_size);
    if (isNaN(partySizeNum) || partySizeNum < 1 || partySizeNum > MAX_BOOKING_PARTY_SIZE) {
      sendError(res, `Số lượng khách phải từ 1 đến ${MAX_BOOKING_PARTY_SIZE} người`, 400);
      return;
    }

    // Parse start_time theo múi giờ Việt Nam (+07:00) để tránh lỗi UTC
    const channel: BookingChannel = booking_channel === BOOKING_CHANNEL.DIRECT && req.user
      ? BOOKING_CHANNEL.DIRECT
      : BOOKING_CHANNEL.ONLINE;
    const bookingTimeError = getBookingTimeValidationError(start_time, channel);
    if (bookingTimeError) {
      sendError(res, bookingTimeError, 400);
      return;
    }

    const calculatedEndTime = calculateBookingEndTime(start_time);

    const targetEmail = (guest_email || email || "").trim();

    const booking = await db.createBooking({
      table_id: Number(table_id),
      table_ids,
      booking_channel: booking_channel || channel,
      customer_id: customer_id ? Number(customer_id) : null,
      promotion_id: promotion_id ? Number(promotion_id) : null,
      guest_name,
      guest_phone,
      guest_email: targetEmail || null,
      party_size: Number(party_size),
      start_time,
      end_time: calculatedEndTime,
      guest_note,
      note,
      pre_ordered_items: pre_ordered_items || items,
    });

    // Send Confirmation Email to Customer & generate local preview URL
    let emailPreviewUrl = null;
    try {
      const fullBooking = await db.getBookingById(booking.id);
      if (fullBooking) {
        // Emit Socket.io events for real-time table status update on Waiter/Manager UI
        io.emit("booking:created", { booking: fullBooking });
        if (fullBooking.table_id) {
          io.emit("table:status_changed", {
            tableId: fullBooking.table_id,
            status: "reserved",
            guest_name: fullBooking.guest_name,
          });
        }

        // Gửi thông báo Telegram tới nhóm Waiter
        notifyWaitersAboutBooking(fullBooking).catch((tgErr) => {
          console.error("⚠️ Lỗi khi gửi Telegram cho nhóm Waiter:", (tgErr as Error).message);
        });

        emailPreviewUrl = await sendBookingConfirmationEmail({
          ...fullBooking,
          guest_email: targetEmail || fullBooking.guest_email || undefined,
        });
      }
    } catch (emailErr) {
      console.error("Lỗi khi gửi email xác nhận đặt bàn:", emailErr);
    }

    sendSuccess(res, { ...booking, email_preview_url: emailPreviewUrl }, "Tạo đặt bàn thành công", 201);
  } catch (error) {
    const msg = (error as Error).message;
    sendError(res, msg, msg.includes("trùng") ? 400 : 500);
  }
};

/** Returns the staff calendar for all tables or one selected table over a controlled date range. */
export const getBookingScheduleHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const startDate = typeof req.query.start_date === "string" ? req.query.start_date : undefined;
    const endDate = typeof req.query.end_date === "string" ? req.query.end_date : undefined;
    const tableIdValue = typeof req.query.table_id === "string" ? Number(req.query.table_id) : undefined;
    const includeCancelled = req.query.include_cancelled === "true";
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    if ((startDate && !datePattern.test(startDate)) || (endDate && !datePattern.test(endDate))) {
      sendError(res, "Ngày lọc phải theo định dạng YYYY-MM-DD.", 400);
      return;
    }
    if (tableIdValue !== undefined && (!Number.isInteger(tableIdValue) || tableIdValue <= 0)) {
      sendError(res, "table_id không hợp lệ.", 400);
      return;
    }
    if (startDate && endDate && startDate > endDate) {
      sendError(res, "Khoảng ngày lọc không hợp lệ.", 400);
      return;
    }

    const schedule = await db.getBookingSchedule({
      tableId: tableIdValue,
      startDate,
      endDate,
      includeCancelled,
    });
    sendSuccess(res, schedule, "Lấy lịch đặt bàn thành công");
  } catch (error) {
    console.error("Error fetching booking schedule:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

/** Creates a staff-only direct booking while keeping the public endpoint online-only. */
export const createDirectBookingHandler = async (req: Request, res: Response): Promise<void> => {
  req.body = { ...req.body, booking_channel: BOOKING_CHANNEL.DIRECT };
  await createBookingHandler(req, res);
};

export const updateBookingStatusHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, cancel_reason } = req.body;

    const validStatuses = ["pending", "confirmed", "cancelled", "completed"];
    if (!status || !validStatuses.includes(status)) {
      sendError(res, `Trạng thái phải là: ${validStatuses.join(", ")}`, 400);
      return;
    }

    const userId = req.user?.userId ? Number(req.user.userId) : undefined;
    const success = await db.updateBookingStatus(Number(id), status, userId, cancel_reason);
    if (!success) {
      sendError(res, "Không tìm thấy đặt bàn", 404);
      return;
    }

    sendSuccess(res, { id, status }, "Cập nhật trạng thái đặt bàn thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const deleteBookingHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const success = await db.deleteCancelledBooking(Number(id));
    if (!success) {
      sendError(res, "Không tìm thấy đặt bàn đã hủy hoặc không thể xóa", 404);
      return;
    }
    sendSuccess(res, null, "Xóa đặt bàn thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const payBookingDepositHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const success = await db.payBookingDeposit(Number(id));
    if (!success) {
      sendError(res, "Không tìm thấy đặt bàn hoặc trạng thái cọc không hợp lệ", 404);
      return;
    }
    sendSuccess(res, { id }, "Thanh toán tiền cọc thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const assignBookingHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { assignedArea, assignedWaiterName, assignedWaiterId, guestName, guestPhone, partySize, startTime } = req.body;

    const payload = {
      id: `ASSIGN-${Date.now()}`,
      bookingId: Number(id),
      assignedArea: assignedArea || "Tầng 2",
      assignedWaiterName: assignedWaiterName || "Tất cả nhân viên ca trực Tầng 2",
      assignedWaiterId: assignedWaiterId ? Number(assignedWaiterId) : null,
      guestName,
      guestPhone,
      partySize,
      startTime,
      assignedAt: new Date().toLocaleString("vi-VN"),
      assignedTimestamp: Date.now(),
    };

    const ioApp = req.app.get("io") || io;
    if (ioApp) {
      ioApp.emit("booking:assigned", payload);
    }

    sendSuccess(res, payload, "Phân công đặt bàn thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};
