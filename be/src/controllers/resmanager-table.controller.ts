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

// Lấy tất cả bàn (resmanager schema)
export const getResmanagerTablesHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const areaId = req.query.area_id ? Number(req.query.area_id) : undefined;
    const tables = await db.getResmanagerTables(areaId);
    sendSuccess(res, tables, "Lấy danh sách bàn thành công");
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
