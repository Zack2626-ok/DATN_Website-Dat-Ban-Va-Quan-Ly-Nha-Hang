import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendError, sendSuccess } from "../utils/response";

// Lấy tất cả khu vực bàn (table_areas)
export const getTableAreasHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const areas = await db.getTableAreas();
    sendSuccess(res, areas, "Lấy danh sách khu vực thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

// Lấy tất cả bàn (kèm thông tin khách + gộp/tách bàn)
export const getResmanagerTablesHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const areaId = req.query.area_id ? Number(req.query.area_id) : undefined;
    const tables = await db.getResmanagerTablesWithExtra(areaId);
    sendSuccess(res, tables, "Lấy danh sách bàn thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

// Lấy chỉ những bàn trống — dùng cho form tạo booking
export const getEmptyTablesHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const startTime = req.query.start_time as string | undefined;
    const tables = await db.getEmptyTablesForBooking(startTime);
    sendSuccess(res, tables, "Lấy danh sách bàn trống thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

// Lấy chi tiết 1 bàn
export const getResmanagerTableHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const table = await db.getResmanagerTableById(Number(id));
    if (!table) {
      sendError(res, "Không tìm thấy bàn", 404);
      return;
    }
    sendSuccess(res, table, "Lấy thông tin bàn thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

// Cập nhật trạng thái bàn
export const updateResmanagerTableStatusHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["empty", "reserved", "serving", "pending_payment"];
    if (!status || !validStatuses.includes(status)) {
      sendError(res, `Trạng thái phải là: ${validStatuses.join(", ")}`, 400);
      return;
    }

    const success = await db.updateResmanagerTableStatus(Number(id), status);
    if (!success) {
      sendError(res, "Không tìm thấy bàn", 404);
      return;
    }

    sendSuccess(res, { id, status }, "Cập nhật trạng thái bàn thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

// Chuyển bàn — POST /api/v1/tables/:id/transfer
export const transferTableHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const sourceTableId = Number(req.params.id);
    const { target_table_id } = req.body;

    if (!target_table_id) {
      sendError(res, "target_table_id là bắt buộc", 400);
      return;
    }

    const success = await db.transferResmanagerOrder(sourceTableId, Number(target_table_id));
    if (!success) {
      sendError(res, "Không tìm thấy order đang hoạt động tại bàn nguồn", 404);
      return;
    }

    // Emit socket event nếu có
    req.app.get("io")?.emit("table:transferred", { sourceTableId, targetTableId: Number(target_table_id) });

    sendSuccess(res, { sourceTableId, targetTableId: Number(target_table_id) }, "Chuyển bàn thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

// Gộp bàn — POST /api/v1/tables/:id/merge
export const mergeTableHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const primaryTableId = Number(req.params.id);
    const { merged_table_ids } = req.body;

    if (!merged_table_ids || !Array.isArray(merged_table_ids) || merged_table_ids.length === 0) {
      sendError(res, "merged_table_ids là bắt buộc (mảng ID bàn cần gộp)", 400);
      return;
    }

    const success = await db.mergeResmanagerTables(primaryTableId, merged_table_ids.map(Number));
    if (!success) {
      sendError(res, "Không thể gộp bàn", 400);
      return;
    }

    req.app.get("io")?.emit("table:merged", { primaryTableId, mergedTableIds: merged_table_ids });

    sendSuccess(res, { primaryTableId, mergedTableIds: merged_table_ids }, "Gộp bàn thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

// Bỏ gộp bàn — DELETE /api/v1/tables/:id/merge
export const unmergeTableHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const primaryTableId = Number(req.params.id);
    await db.unmergeResmanagerTable(primaryTableId);

    req.app.get("io")?.emit("table:unmerged", { primaryTableId });

    sendSuccess(res, { primaryTableId }, "Bỏ gộp bàn thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

// Tách bàn — POST /api/v1/tables/:id/split
export const splitTableHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const parentTableId = Number(req.params.id);
    const { target_table_id, child_label, item_ids } = req.body;

    if (!target_table_id || !child_label) {
      sendError(res, "target_table_id và child_label là bắt buộc", 400);
      return;
    }

    const result = await db.splitResmanagerTable(
      parentTableId,
      child_label,
      Number(target_table_id),
      Array.isArray(item_ids) ? item_ids.map(Number) : [],
    );

    if (!result.success) {
      sendError(res, "Không tìm thấy order để tách hoặc bàn nguồn không hợp lệ", 400);
      return;
    }

    req.app.get("io")?.emit("table:split", { parentTableId, targetTableId: Number(target_table_id), newOrderId: result.newOrderId });

    sendSuccess(res, { parentTableId, targetTableId: Number(target_table_id), newOrderId: result.newOrderId }, "Tách bàn thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};
