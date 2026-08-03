import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendError, sendSuccess } from "../utils/response";
import { TABLE_STATUS, type TableStatus } from "../constants/table";
import { BOOKING_SCHEDULE_MODE, type BookingScheduleMode } from "../constants/booking";

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
    const endTime = req.query.end_time as string | undefined;
    const tables = await db.getEmptyTablesForBooking(startTime, endTime);
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

/** Returns one table's booking calendar without changing its physical service status. */
export const getTableBookingScheduleHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const tableId = Number(req.params.id);
    if (!Number.isInteger(tableId) || tableId <= 0) {
      sendError(res, "Mã bàn không hợp lệ.", 400);
      return;
    }
    const table = await db.getResmanagerTableById(tableId);
    if (!table) {
      sendError(res, "Không tìm thấy bàn.", 404);
      return;
    }
    const startDate = typeof req.query.start_date === "string" ? req.query.start_date : undefined;
    const endDate = typeof req.query.end_date === "string" ? req.query.end_date : undefined;
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if ((startDate && !datePattern.test(startDate)) || (endDate && !datePattern.test(endDate))) {
      sendError(res, "Ngày lọc phải theo định dạng YYYY-MM-DD.", 400);
      return;
    }
    const requestedMode = typeof req.query.mode === "string" ? req.query.mode : BOOKING_SCHEDULE_MODE.CURRENT;
    if (requestedMode !== BOOKING_SCHEDULE_MODE.CURRENT && requestedMode !== BOOKING_SCHEDULE_MODE.HISTORY) {
      sendError(res, "Chế độ lịch đặt không hợp lệ.", 400);
      return;
    }
    const schedule = await db.getBookingSchedule({
      tableId,
      startDate,
      endDate,
      mode: requestedMode as BookingScheduleMode,
    });
    sendSuccess(res, { table, schedule }, "Lấy lịch đặt của bàn thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

/** Checks a booked party in and opens its linked service order within the allowed time window. */
export const checkInTableBookingHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const tableId = Number(req.params.id);
    const bookingId = Number(req.params.bookingId);
    const createdBy = Number(req.body.created_by);
    if (!Number.isInteger(tableId) || tableId <= 0 || !Number.isInteger(bookingId) || bookingId <= 0) {
      sendError(res, "Bàn hoặc lịch đặt không hợp lệ.", 400);
      return;
    }
    if (!Number.isInteger(createdBy) || createdBy <= 0) {
      sendError(res, "Không xác định được nhân viên thực hiện check-in.", 400);
      return;
    }
    const result = await db.checkInScheduledBooking(tableId, bookingId, createdBy);
    req.app.get("io")?.emit("table:booking_checked_in", result);
    sendSuccess(res, result, "Khách đã đến, bàn đang được phục vụ.", 201);
  } catch (error) {
    sendError(res, (error as Error).message, 400);
  }
};

/** Resolve a selected table to the active order owned by its merge root. */
export const getActiveOrderForTableHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const tableId = Number(req.params.id);
    if (!Number.isInteger(tableId) || tableId <= 0) {
      sendError(res, "Mã bàn không hợp lệ", 400);
      return;
    }
    const resolution = await db.getResmanagerActiveOrderForTable(tableId);
    sendSuccess(res, resolution, "Lấy đơn đang phục vụ thành công");
  } catch (error) {
    const statusCode = error instanceof db.TableMergeValidationError ? 400 : 500;
    sendError(res, (error as Error).message, statusCode);
  }
};

// Cập nhật trạng thái bàn
export const updateResmanagerTableStatusHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, maintenance_note } = req.body;

    const validStatuses = Object.values(TABLE_STATUS);
    if (typeof status !== "string" || !validStatuses.includes(status as TableStatus)) {
      sendError(res, `Trạng thái phải là: ${validStatuses.join(", ")}`, 400);
      return;
    }

    // Bắt buộc phải có lý do khi chuyển sang bảo trì
    const tableStatus = status as TableStatus;
    if (tableStatus === TABLE_STATUS.MAINTENANCE && !maintenance_note?.trim()) {
      sendError(res, "Vui lòng nhập lý do bảo trì (maintenance_note)", 400);
      return;
    }

    const updateResult = await db.updateResmanagerTableStatus(
      Number(id),
      tableStatus,
      maintenance_note?.trim() || undefined,
    );
    if (!updateResult) {
      sendError(res, "Không tìm thấy bàn", 404);
      return;
    }

    const io = req.app.get("io");
    updateResult.updatedTableIds.forEach((tableId) => {
      io?.emit("table:status_changed", { tableId, status: tableStatus });
    });

    sendSuccess(res, { id, status, maintenance_note: maintenance_note?.trim() || null }, "Cập nhật trạng thái bàn thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

interface TransferTableRequestBody {
  target_table_id?: unknown;
  reason?: unknown;
}

/** Transfers one standalone active order to an empty physical table. */
export const transferTableHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const sourceTableId = Number(req.params.id);
    const { target_table_id, reason } = req.body as TransferTableRequestBody;
    const targetTableId = Number(target_table_id);

    if (!Number.isInteger(sourceTableId) || sourceTableId <= 0
      || !Number.isInteger(targetTableId) || targetTableId <= 0) {
      sendError(res, "ID bàn nguồn và target_table_id phải hợp lệ", 400);
      return;
    }

    const transferredByValue = req.user?.userId ? Number(req.user.userId) : null;
    const transferredBy = Number.isInteger(transferredByValue) && Number(transferredByValue) > 0
      ? Number(transferredByValue)
      : null;
    const transferReason = typeof reason === "string" ? reason.trim().slice(0, 500) : undefined;
    const result = await db.transferResmanagerOrder(
      sourceTableId,
      targetTableId,
      transferredBy,
      transferReason || undefined,
    );

    const io = req.app.get("io");
    io?.to("pos_lounge").emit("table:transferred", result);
    io?.emit("table:transferred", result);
    io?.emit("kds:order_table_transferred", result);
    sendSuccess(res, result, "Chuyển bàn thành công");
    return;
  } catch (error) {
    if (error instanceof db.TableTransferValidationError) {
      sendError(res, error.message, 400);
      return;
    }
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

    const clusterTables = [primaryTable];
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

      // Kiểm tra tính liền kề (Adjacency check theo grid row/col hoặc số thứ tự tên bàn)
      const isAdjacent = clusterTables.some((t) => {
        const rowDiff = Math.abs((t.row_pos || 'A').charCodeAt(0) - (mergedTable.row_pos || 'A').charCodeAt(0));
        const colDiff = Math.abs(Number(t.col_pos || 1) - Number(mergedTable.col_pos || 1));
        const isGridAdjacent = (rowDiff === 0 && colDiff === 1) || (colDiff === 0 && rowDiff === 1);

        const num1 = parseInt((t.name || "").replace(/\D/g, ""), 10);
        const num2 = parseInt((mergedTable.name || "").replace(/\D/g, ""), 10);
        const isNumAdjacent = !isNaN(num1) && !isNaN(num2) && Math.abs(num1 - num2) === 1;

        return isGridAdjacent || isNumAdjacent;
      });

      if (!isAdjacent) {
        sendError(res, `Bàn ${mergedTable.name} không liền kề với các bàn đang chọn gộp. Chỉ được phép gộp các bàn liền kề nhau (ví dụ B08 gộp B09)!`, 400);
        return;
      }

      clusterTables.push(mergedTable);
    }

    const mergedBy = req.user?.userId ? Number(req.user.userId) : null;
    const result = await db.mergeResmanagerTablesTransactionally(
      primaryTableId,
      merged_table_ids.map(Number),
      Number.isInteger(mergedBy) && Number(mergedBy) > 0 ? Number(mergedBy) : null,
    );

    const io = req.app.get("io");
    io?.to("pos_lounge").emit("table:merged", result);
    io?.emit("table:merged", result);

    sendSuccess(res, result, "Gộp bàn thành công");
  } catch (error) {
    const statusCode = error instanceof db.TableMergeValidationError ? 400 : 500;
    sendError(res, (error as Error).message, statusCode);
  }
};

// Bỏ gộp bàn — DELETE /api/v1/tables/:id/merge
/** Allocate a large party to separate tables while keeping one primary order and invoice. */
export const arrangeGroupSeatingHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const primaryTableId = Number(req.params.id);
    const { assigned_table_ids } = req.body;
    if (!Number.isInteger(primaryTableId) || primaryTableId <= 0) {
      sendError(res, "ID bàn chính không hợp lệ", 400);
      return;
    }
    if (!Array.isArray(assigned_table_ids) || assigned_table_ids.length === 0) {
      sendError(res, "assigned_table_ids là bắt buộc (mảng các bàn xếp cho đoàn)", 400);
      return;
    }

    const arrangedBy = req.user?.userId ? Number(req.user.userId) : null;
    const result = await db.arrangeGroupSeatingTransactionally(
      primaryTableId,
      assigned_table_ids.map(Number),
      Number.isInteger(arrangedBy) && Number(arrangedBy) > 0 ? Number(arrangedBy) : null,
    );
    const io = req.app.get("io");
    io?.to("pos_lounge").emit("table:group_seating_changed", result);
    io?.emit("table:group_seating_changed", result);
    sendSuccess(res, result, "Xếp bàn đoàn thành công");
  } catch (error) {
    const statusCode = error instanceof db.TableMergeValidationError ? 400 : 500;
    sendError(res, (error as Error).message, statusCode);
  }
};

export const unmergeTableHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const primaryTableId = Number(req.params.id);
    const mergedTableIds = await db.unmergeResmanagerTablesTransactionally(primaryTableId);

    req.app.get("io")?.emit("table:unmerged", { primaryTableId });

    sendSuccess(res, { primaryTableId, mergedTableIds }, "Bỏ gộp bàn thành công");
  } catch (error) {
    const statusCode = error instanceof db.TableMergeValidationError ? 400 : 500;
    sendError(res, (error as Error).message, statusCode);
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

    // Lấy thông tin bàn hiện tại trong DB
    const currentTable = await db.getResmanagerTableById(id);
    if (!currentTable) {
      sendError(res, "Không tìm thấy bàn cần cập nhật", 404);
      return;
    }

    // Chặn thay đổi sức chứa khi có khách đang ngồi hoặc có lịch đặt bàn
    if (capacity !== undefined && Number(capacity) !== Number(currentTable.capacity)) {
      const hasActiveOrders = await db.hasActiveOrdersForTable(id);
      const hasActiveBookings = await db.hasActiveBookingsForTable(id);
      if (hasActiveOrders || hasActiveBookings) {
        sendError(
          res,
          "Không thể thay đổi sức chứa của bàn khi đang có khách ngồi hoặc có lịch đặt bàn!",
          400
        );
        return;
      }
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
