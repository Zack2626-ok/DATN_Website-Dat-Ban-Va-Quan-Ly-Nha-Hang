import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendError, sendSuccess } from "../utils/response";

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
    const { table_id, customer_id, guest_name, guest_phone, party_size, start_time, end_time, guest_note, note } =
      req.body;

    if (!table_id || !guest_name || !guest_phone || !party_size || !start_time || !end_time) {
      sendError(res, "Thiếu thông tin bắt buộc", 400);
      return;
    }

    const booking = await db.createBooking({
      table_id: Number(table_id),
      customer_id: customer_id ? Number(customer_id) : null,
      guest_name,
      guest_phone,
      party_size: Number(party_size),
      start_time,
      end_time,
      guest_note,
      note,
    });

    sendSuccess(res, booking, "Tạo đặt bàn thành công", 201);
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const updateBookingStatusHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["pending", "confirmed", "cancelled", "completed"];
    if (!status || !validStatuses.includes(status)) {
      sendError(res, `Trạng thái phải là: ${validStatuses.join(", ")}`, 400);
      return;
    }

    const userId = req.user?.userId ? Number(req.user.userId) : undefined;
    const success = await db.updateBookingStatus(Number(id), status, userId);
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
