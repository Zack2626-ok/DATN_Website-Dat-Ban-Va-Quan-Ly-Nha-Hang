import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendError, sendSuccess } from "../utils/response";

export const getAllTables = async (req: Request, res: Response): Promise<void> => {
  try {
    const areaId = req.query.area_id ? Number(req.query.area_id) : undefined;
    const tables = await db.getTables(areaId);
    sendSuccess(res, tables, "Lấy danh sách bàn thành công");
  } catch (error) {
    console.error("Error fetching tables:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getTableAreasHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const areas = await db.getTableAreas();
    sendSuccess(res, areas, "Lấy danh sách khu vực thành công");
  } catch (error) {
    console.error("Error fetching table areas:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getTableById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      sendError(res, "ID bàn là bắt buộc", 400);
      return;
    }

    const table = await db.getTableById(id);
    if (!table) {
      sendError(res, "Không tìm thấy bàn", 404);
      return;
    }

    sendSuccess(res, table, "Lấy thông tin bàn thành công");
  } catch (error) {
    console.error("Error fetching table by id:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const createTable = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tableNumber, capacity, location, status, qrCode } = req.body;

    if (tableNumber === undefined || capacity === undefined) {
      sendError(res, "Số bàn và sức chứa là bắt buộc", 400);
      return;
    }

    if (capacity < 1 || capacity > 20) {
      sendError(res, "Sức chứa phải từ 1-20 người", 400);
      return;
    }

    const newTable = await db.createTable({
      tableNumber,
      capacity,
      status: status || "available",
      location,
      qrCode,
    });

    sendSuccess(res, newTable, "Tạo bàn thành công", 201);
  } catch (error) {
    console.error("Error creating table:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const updateTable = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { tableNumber, capacity, status, location, qrCode } = req.body;

    if (!id) {
      sendError(res, "ID bàn là bắt buộc", 400);
      return;
    }

    if (capacity !== undefined && (capacity < 1 || capacity > 20)) {
      sendError(res, "Sức chứa phải từ 1-20 người", 400);
      return;
    }

    const validStatuses = ["available", "occupied", "reserved"];
    if (status && !validStatuses.includes(status)) {
      sendError(res, `Trạng thái phải là: ${validStatuses.join(", ")}`, 400);
      return;
    }

    const updatedTable = await db.updateTable(id, { tableNumber, capacity, status, location, qrCode });
    if (!updatedTable) {
      sendError(res, "Không tìm thấy bàn cần cập nhật", 404);
      return;
    }

    sendSuccess(res, updatedTable, "Cập nhật bàn thành công");
  } catch (error) {
    console.error("Error updating table:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const deleteTable = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      sendError(res, "ID bàn là bắt buộc", 400);
      return;
    }

    const deleted = await db.deleteTable(id);
    if (!deleted) {
      sendError(res, "Không tìm thấy bàn cần xóa", 404);
      return;
    }

    sendSuccess(res, { id }, "Xóa bàn thành công");
  } catch (error) {
    console.error("Error deleting table:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getTablesByStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.params;
    const validStatuses = ["available", "occupied", "reserved"];
    if (!validStatuses.includes(status)) {
      sendError(res, `Trạng thái phải là: ${validStatuses.join(", ")}`, 400);
      return;
    }

    const tables = await db.getTablesByStatus(status);
    sendSuccess(res, tables, `Lấy danh sách bàn ${status} thành công`);
  } catch (error) {
    console.error("Error fetching tables by status:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};
