import { Request, Response } from "express";
import { sendSuccess, sendError } from "../utils/response";
import {
  getKdsItemsFromDb,
  updateKdsItemStatusInDb,
  recallKdsItemStatusInDb,
  getKdsVoidAlertsFromDb,
} from "../utils/kdsDb";

/**
 * GET /api/kds/items
 * Fetch active KDS items, filtered by optional station query
 */
export const getKdsItemsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { station } = req.query;
    const items = await getKdsItemsFromDb(station as string);
    sendSuccess(res, items, "Tải danh sách món ăn KDS thành công!");
  } catch (err) {
    console.error("Error in getKdsItemsHandler:", err);
    sendError(res, `Lỗi tải danh sách món ăn KDS: ${(err as Error).message}`, 500);
  }
};

/**
 * PATCH /api/kds/items/:id/status
 * Update status of an individual order item
 */
export const updateKdsItemStatusHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      sendError(res, "Trạng thái mới là bắt buộc!", 400);
      return;
    }

    const success = await updateKdsItemStatusInDb(id, status);
    if (success) {
      sendSuccess(res, { id, status }, "Cập nhật trạng thái món ăn thành công!");
    } else {
      sendError(res, "Không tìm thấy hoặc không thể cập nhật món ăn!", 404);
    }
  } catch (err) {
    console.error("Error in updateKdsItemStatusHandler:", err);
    sendError(res, `Lỗi cập nhật trạng thái món ăn: ${(err as Error).message}`, 500);
  }
};

/**
 * PATCH /api/kds/batch/status
 * Update status of multiple order items in a batch
 */
export const updateKdsBatchStatusHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemIds, status } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      sendError(res, "Danh sách ID món ăn là bắt buộc!", 400);
      return;
    }

    if (!status) {
      sendError(res, "Trạng thái mới là bắt buộc!", 400);
      return;
    }

    let successCount = 0;
    for (const id of itemIds) {
      const success = await updateKdsItemStatusInDb(id, status);
      if (success) successCount++;
    }

    sendSuccess(
      res,
      { successCount, total: itemIds.length, status },
      `Cập nhật trạng thái cho ${successCount}/${itemIds.length} món ăn thành công!`
    );
  } catch (err) {
    console.error("Error in updateKdsBatchStatusHandler:", err);
    sendError(res, `Lỗi cập nhật trạng thái theo mẻ: ${(err as Error).message}`, 500);
  }
};

/**
 * POST /api/kds/items/:id/recall
 * Recall / Undo the last status change of an item
 */
export const recallKdsItemStatusHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const success = await recallKdsItemStatusInDb(id);
    if (success) {
      sendSuccess(res, { id }, "Hoàn tác trạng thái món ăn thành công!");
    } else {
      sendError(res, "Không thể hoàn tác trạng thái món ăn này (có thể không có lịch sử trạng thái cũ)!", 400);
    }
  } catch (err) {
    console.error("Error in recallKdsItemStatusHandler:", err);
    sendError(res, `Lỗi hoàn tác trạng thái món ăn: ${(err as Error).message}`, 500);
  }
};

/**
 * GET /api/kds/void-alerts
 * Fetch active void/cancel notifications
 */
export const getKdsVoidAlertsHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const alerts = await getKdsVoidAlertsFromDb();
    sendSuccess(res, alerts, "Tải danh sách cảnh báo hủy món thành công!");
  } catch (err) {
    console.error("Error in getKdsVoidAlertsHandler:", err);
    sendError(res, `Lỗi tải danh sách cảnh báo hủy món: ${(err as Error).message}`, 500);
  }
};
