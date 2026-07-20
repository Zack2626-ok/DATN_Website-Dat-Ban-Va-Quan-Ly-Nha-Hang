import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendError, sendSuccess } from "../utils/response";
import { isValidPhoneNumber, getPhoneNumberValidationError } from "../utils/validation";
import { sendBookingNotification } from "../services/telegram.service";
import { sendBookingConfirmationEmail } from "../services/email.service";

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
    const { table_id, customer_id, promotion_id, guest_name, guest_phone, party_size, start_time, end_time, guest_note, note, pre_ordered_items, items } =
      req.body;

    if (!table_id || !guest_name || !guest_phone || !party_size || !start_time || !end_time) {
      sendError(res, "Thiếu thông tin bắt buộc", 400);
      return;
    }

    const phoneError = getPhoneNumberValidationError(guest_phone);
    if (phoneError) {
      sendError(res, phoneError, 400);
      return;
    }

    const partySizeNum = Number(party_size);
    if (isNaN(partySizeNum) || partySizeNum < 1 || partySizeNum > 30) {
      sendError(res, "Số lượng khách phải từ 1 đến 30 người", 400);
      return;
    }

    // Parse start_time theo múi giờ Việt Nam (+07:00) để tránh lỗi UTC
    // Chuỗi dạng "2026-07-16 21:00:00" nếu parse thẳng sẽ bị Node.js hiểu là UTC → sai 7 tiếng
    const normalizedStart = start_time.trim().replace(' ', 'T');
    const bookingStart = new Date(normalizedStart.includes('+') || normalizedStart.endsWith('Z')
      ? normalizedStart
      : normalizedStart + '+07:00'
    );
    const now = new Date();
    // Cho phép dung sai 60 phút phòng trường hợp chọn slot sắp qua và điền form lâu
    if (bookingStart.getTime() < now.getTime() - 60 * 60 * 1000) {
      sendError(res, "Thời gian đặt bàn không được ở quá khứ", 400);
      return;
    }

    const booking = await db.createBooking({
      table_id: Number(table_id),
      customer_id: customer_id ? Number(customer_id) : null,
      promotion_id: promotion_id ? Number(promotion_id) : null,
      guest_name,
      guest_phone,
      party_size: Number(party_size),
      start_time,
      end_time,
      guest_note,
      note,
      pre_ordered_items: pre_ordered_items || items,
    });

    sendBookingNotification(booking);
    sendBookingConfirmationEmail(booking).catch(() => {});

    sendSuccess(res, booking, "Tạo đặt bàn thành công", 201);
  } catch (error) {
    const msg = (error as Error).message;
    sendError(res, msg, msg.includes("trùng") ? 400 : 500);
  }
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
      sendError(res, "Chỉ xóa được booking đã hủy", 400);
      return;
    }
    sendSuccess(res, { id: Number(id) }, "Đã xóa booking");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const payBookingDepositHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const success = await db.payBookingDeposit(Number(id));
    if (!success) {
      sendError(res, "Không tìm thấy đặt bàn hoặc đơn không thể đặt cọc", 404);
      return;
    }
    sendSuccess(res, { id: Number(id), deposit_status: "paid" }, "Thanh toán tiền cọc thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};
