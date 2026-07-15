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
    const { status, maintenance_note } = req.body;

    const validStatuses = ["empty", "reserved", "serving", "pending_payment", "maintenance"];
    if (!status || !validStatuses.includes(status)) {
      sendError(res, `Trạng thái phải là: ${validStatuses.join(", ")}`, 400);
      return;
    }

    // Bắt buộc phải có lý do khi chuyển sang bảo trì
    if (status === "maintenance" && !maintenance_note?.trim()) {
      sendError(res, "Vui lòng nhập lý do bảo trì (maintenance_note)", 400);
      return;
    }

    const success = await db.updateResmanagerTableStatus(
      Number(id),
      status,
      maintenance_note?.trim() || undefined,
    );
    if (!success) {
      sendError(res, "Không tìm thấy bàn", 404);
      return;
    }

    sendSuccess(res, { id, status, maintenance_note: maintenance_note?.trim() || null }, "Cập nhật trạng thái bàn thành công");
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
      sendError(res, "Không thể chuyển bàn — bàn nguồn phải đang phục vụ hoặc chờ thanh toán", 400);
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

    const primaryTable = await db.getResmanagerTableById(primaryTableId);
    if (!primaryTable) {
      sendError(res, "Không tìm thấy bàn chính", 404);
      return;
    }

    for (const mergedId of merged_table_ids.map(Number)) {
      const mergedTable = await db.getResmanagerTableById(mergedId);
      if (!mergedTable) {
        sendError(res, `Không tìm thấy bàn #${mergedId}`, 404);
        return;
      }
      if (mergedTable.area_id !== primaryTable.area_id) {
        sendError(res, `Chỉ gộp được bàn cùng khu vực (${primaryTable.area_name})`, 400);
        return;
      }
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

// Thêm bàn mới — POST /api/v1/tables
export const createResmanagerTableHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { area_id, name, capacity, row_pos, col_pos } = req.body;

    if (!area_id || !name || !capacity || !row_pos || !col_pos) {
      sendError(res, "Các trường dữ liệu: khu vực, tên bàn, sức chứa, dòng và cột là bắt buộc!", 400);
      return;
    }

    if (row_pos.length !== 1 || !/[a-zA-Z]/.test(row_pos)) {
      sendError(res, "Dòng vị trí (row_pos) phải là một ký tự chữ cái (A-Z)!", 400);
      return;
    }

    const occupied = await db.checkTableCoordinatesOccupied(Number(area_id), row_pos, Number(col_pos));
    if (occupied) {
      sendError(res, `Tọa độ Dãy ${row_pos.toUpperCase()} - Cột ${col_pos} đã được đăng ký bởi bàn ${occupied.name}!`, 400);
      return;
    }

    const newTable = await db.createResmanagerTable({
      area_id: Number(area_id),
      name: name.trim(),
      capacity: Number(capacity),
      row_pos: row_pos.trim(),
      col_pos: Number(col_pos),
    });

    req.app.get("io")?.emit("table:transferred", {}); // Gọi fetch lại trên client

    sendSuccess(res, newTable, "Thêm bàn mới thành công", 201);
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

// Cập nhật thông tin bàn — PATCH /api/v1/tables/:id
export const updateResmanagerTableHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { area_id, name, capacity, row_pos, col_pos } = req.body;

    // Lấy thông tin tọa độ hiện tại trong DB
    const currentTable = await db.getResmanagerTableCoordinates(id);
    if (!currentTable) {
      sendError(res, "Không tìm thấy bàn cần cập nhật", 404);
      return;
    }

    const data: any = {};
    if (area_id !== undefined) data.area_id = Number(area_id);
    if (name !== undefined) data.name = name.trim();
    if (capacity !== undefined) data.capacity = Number(capacity);
    if (row_pos !== undefined) {
      if (row_pos.length !== 1 || !/[a-zA-Z]/.test(row_pos)) {
        sendError(res, "Dòng vị trí (row_pos) phải là một ký tự chữ cái (A-Z)!", 400);
        return;
      }
      data.row_pos = row_pos.trim();
    }
    if (col_pos !== undefined) data.col_pos = Number(col_pos);

    // Xác minh tọa độ sau khi ghép với các trường thay đổi
    const checkAreaId = data.area_id !== undefined ? data.area_id : currentTable.area_id;
    const checkRowPos = data.row_pos !== undefined ? data.row_pos : currentTable.row_pos;
    const checkColPos = data.col_pos !== undefined ? data.col_pos : currentTable.col_pos;

    const occupied = await db.checkTableCoordinatesOccupied(checkAreaId, checkRowPos, checkColPos, id);
    if (occupied) {
      sendError(
        res,
        `Tọa độ Dãy ${checkRowPos.toUpperCase()} - Cột ${checkColPos} đã được đăng ký bởi bàn ${occupied.name}!`,
        400
      );
      return;
    }

    const success = await db.updateResmanagerTable(id, data);
    if (!success) {
      sendError(res, "Không tìm thấy bàn cần cập nhật hoặc dữ liệu không đổi", 404);
      return;
    }

    req.app.get("io")?.emit("table:transferred", {}); // Gọi fetch lại trên client

    sendSuccess(res, { id, ...data }, "Cập nhật thông tin bàn thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

// Xóa mềm bàn — PATCH /api/v1/tables/:id/delete
export const deleteResmanagerTableHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    // 1) Kiểm tra bàn có tồn tại
    const table = await db.getResmanagerTableById(id);
    if (!table) {
      sendError(res, "Không tìm thấy bàn ăn cần xóa", 404);
      return;
    }

    // 2) Kiểm tra trạng thái bàn (chỉ cho xóa khi trống)
    if (table.status !== "empty") {
      sendError(res, "Bàn đang phục vụ khách hoặc chờ thanh toán, không thể xóa!", 400);
      return;
    }

    // 3) Kiểm tra active orders (phòng hờ đồng bộ trễ)
    const hasActiveOrders = await db.hasActiveOrdersForTable(id);
    if (hasActiveOrders) {
      sendError(res, "Bàn đang có hóa đơn hoạt động chưa thanh toán, không thể xóa!", 400);
      return;
    }

    // 4) Kiểm tra active bookings
    const hasActiveBookings = await db.hasActiveBookingsForTable(id);
    if (hasActiveBookings) {
      sendError(res, "Bàn đang có lịch đặt trước hoạt động chưa hoàn thành, không thể xóa!", 400);
      return;
    }

    // 5) Xóa mềm
    const success = await db.deleteResmanagerTable(id);
    if (!success) {
      sendError(res, "Xóa bàn thất bại", 400);
      return;
    }

    req.app.get("io")?.emit("table:transferred", {}); // Gọi fetch lại trên client

    sendSuccess(res, { id }, "Xóa bàn (Xóa mềm) thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

// Mở Tab nhanh (Takeaway / Quầy Bar) — POST /api/v1/tables/tab
export const openResmanagerTabHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { guest_name, guest_phone, note, created_by } = req.body;

    if (!guest_name) {
      sendError(res, "Tên khách hàng là bắt buộc khi mở Tab mang về / quầy bar!", 400);
      return;
    }

    // Tạo đơn hàng ảo với table_id = null và order_type = takeaway
    const newOrder = await db.createResmanagerOrder({
      table_id: null,
      customer_id: null,
      created_by: created_by ? Number(created_by) : 2, // Mặc định Quản lý/Thu ngân
      order_type: "takeaway",
      note: note || "Mở Tab mang về / Quầy bar",
      guest_name: guest_name.trim(),
      guest_phone: guest_phone ? guest_phone.trim() : null,
    });

    req.app.get("io")?.emit("table:status_changed", { tableId: 0, status: "serving" }); // Báo hiệu cập nhật

    sendSuccess(res, newOrder, "Mở Tab nhanh thành công", 201);
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};
