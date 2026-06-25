import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendError, sendSuccess } from "../utils/response";

export const getWaitlistHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const waitlist = await db.getWaitlist();
    sendSuccess(res, waitlist, "Lấy danh sách chờ thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const addToWaitlistHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { guest_name, party_size, phone } = req.body;

    if (!guest_name || !party_size) {
      sendError(res, "Tên khách và số người là bắt buộc", 400);
      return;
    }

    const entry = await db.addToWaitlist({
      guest_name,
      party_size: Number(party_size),
      phone,
    });

    sendSuccess(res, entry, "Thêm vào danh sách chờ thành công", 201);
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const notifyWaitlistHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const success = await db.notifyWaitlistGuest(Number(id));
    if (!success) {
      sendError(res, "Không tìm thấy khách trong danh sách chờ", 404);
      return;
    }
    sendSuccess(res, { id }, "Đã thông báo cho khách");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const removeFromWaitlistHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const success = await db.removeFromWaitlist(Number(id));
    if (!success) {
      sendError(res, "Không tìm thấy khách trong danh sách chờ", 404);
      return;
    }
    sendSuccess(res, { id }, "Đã xóa khỏi danh sách chờ");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};
