import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendError, sendSuccess } from "../utils/response";

export const getEventsHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const events = await db.getEvents();
    sendSuccess(res, events, "Lấy danh sách tiệc thành công");
  } catch (err) {
    console.error("Error in getEventsHandler:", err);
    sendError(res, `Lỗi lấy danh sách tiệc: ${(err as Error).message}`, 500);
  }
};

export const getEventByIdHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const event = await db.getEventById(id);
    if (!event) {
      sendError(res, "Không tìm thấy tiệc", 404);
      return;
    }
    sendSuccess(res, event, "Lấy chi tiết tiệc thành công");
  } catch (err) {
    console.error("Error in getEventByIdHandler:", err);
    sendError(res, `Lỗi lấy chi tiết tiệc: ${(err as Error).message}`, 500);
  }
};

export const createEventHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customer_name, customer_phone, guest_count, event_date, start_time, end_time } = req.body;

    if (!customer_name || !customer_phone || !guest_count || !event_date || !start_time || !end_time) {
      sendError(res, "Vui lòng điền đầy đủ các thông tin bắt buộc!", 400);
      return;
    }

    const payload = {
      ...req.body,
      sales_id: (req.user as any)?.id // Assuming auth middleware injects user
    };

    const newEvent = await db.createEvent(payload);
    sendSuccess(res, newEvent, "Tạo tiệc mới thành công", 201);
  } catch (err) {
    console.error("Error in createEventHandler:", err);
    sendError(res, `Lỗi tạo tiệc: ${(err as Error).message}`, 500);
  }
};

export const updateEventHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const success = await db.updateEvent(id, req.body);
    
    if (!success) {
      sendError(res, "Không thể cập nhật tiệc", 400);
      return;
    }
    
    const updatedEvent = await db.getEventById(id);
    sendSuccess(res, updatedEvent, "Cập nhật tiệc thành công");
  } catch (err) {
    console.error("Error in updateEventHandler:", err);
    sendError(res, `Lỗi cập nhật tiệc: ${(err as Error).message}`, 500);
  }
};

export const updateStatusHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, deposit_amount } = req.body;

    if (!status) {
      sendError(res, "Trạng thái là bắt buộc", 400);
      return;
    }

    const payload: any = { status };
    if (deposit_amount !== undefined) {
      payload.deposit_amount = deposit_amount;
    }

    const success = await db.updateEvent(id, payload);
    
    if (!success) {
      sendError(res, "Không thể cập nhật trạng thái", 400);
      return;
    }
    
    sendSuccess(res, { id, status, deposit_amount }, "Cập nhật trạng thái thành công");
  } catch (err) {
    console.error("Error in updateStatusHandler:", err);
    sendError(res, `Lỗi cập nhật trạng thái: ${(err as Error).message}`, 500);
  }
};
