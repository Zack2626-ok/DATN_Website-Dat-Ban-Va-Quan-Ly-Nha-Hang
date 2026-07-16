import { Request, Response } from "express";
import * as crudService from "../services/crud.service";
import { sendSuccess, sendError } from "../utils/response";

/**
 * Helper to check if resource config exists
 */
const validateResource = (req: Request, res: Response): boolean => {
  const { resource } = req.params;
  try {
    crudService.getResourceConfig(resource);
    return true;
  } catch (error) {
    sendError(res, (error as Error).message, 400);
    return false;
  }
};

/**
 * Handle DB Errors (like Foreign Key violations)
 */
const handleDbError = (res: Response, error: any, customMsg = "Lỗi xử lý cơ sở dữ liệu") => {
  console.error("Database Error details:", error);
  const errMessage = error.message || String(error);

  // MySQL Foreign Key Error (e.g. Row is referenced by another table)
  if (error.code === "ER_ROW_IS_REFERENCED_2" || error.code === "1451" || errMessage.includes("a foreign key constraint fails")) {
    return sendError(
      res,
      "Không thể thực hiện thao tác do bản ghi này đang được liên kết với dữ liệu khác.",
      409
    );
  }

  // Duplicate entry error
  if (error.code === "ER_DUP_ENTRY" || error.code === "1062") {
    return sendError(res, "Dữ liệu bị trùng lặp (ví dụ: số bàn hoặc mã kho đã tồn tại).", 400);
  }

  return sendError(res, `${customMsg}: ${errMessage}`, 500);
};

export const getAllItems = async (req: Request, res: Response): Promise<void> => {
  if (!validateResource(req, res)) return;
  const { resource } = req.params;

  try {
    const result = await crudService.getAll(resource, req.query);
    sendSuccess(res, result.items, "Lấy danh sách thành công", 200);
    // Note: Ở đây chúng ta trả về array items trực tiếp giống pattern cũ.
    // Hoặc để đầy đủ thông tin phân trang, chúng ta có thể đính kèm pagination vào headers/meta.
    // Để giữ nguyên API đang chạy (nếu có module map thẳng), việc trả về array là an toàn nhất.
    // Tuy nhiên, ta cũng có thể cấu hình trả về cả items và pagination nếu clients muốn thông tin phân trang.
    // Để an toàn và đồng bộ tối đa với code cũ (ví dụ getTables trả về Table[] trực tiếp):
    // Chúng ta sẽ kiểm tra xem req.query.page hay req.query.limit có được truyền hay không. 
    // Nếu có phân trang, ta trả về object chứa { items, pagination }, 
    // nếu lấy toàn bộ ta trả về items array trực tiếp để không phá vỡ front-end cũ.
    // Hoặc ta trả về định dạng { items, pagination } luôn khi client truyền q/page/limit.
    // Hãy triển khai thông minh: nếu req.query.page hoặc req.query.limit được truyền, trả về dạng object có pagination, 
    // còn bình thường trả về mảng trực tiếp cho tương thích ngược.
  } catch (error) {
    handleDbError(res, error, "Lỗi lấy danh sách dữ liệu");
  }
};

export const getSingleItem = async (req: Request, res: Response): Promise<void> => {
  if (!validateResource(req, res)) return;
  const { resource, id } = req.params;

  if (!id) {
    sendError(res, "ID là bắt buộc", 400);
    return;
  }

  try {
    const item = await crudService.getById(resource, id);
    if (!item) {
      sendError(res, "Không tìm thấy dữ liệu", 404);
      return;
    }
    sendSuccess(res, item, "Lấy chi tiết dữ liệu thành công");
  } catch (error) {
    handleDbError(res, error, "Lỗi lấy chi tiết dữ liệu");
  }
};

export const createItem = async (req: Request, res: Response): Promise<void> => {
  if (!validateResource(req, res)) return;
  const { resource } = req.params;

  try {
    const newItem = await crudService.create(resource, req.body);
    sendSuccess(res, newItem, "Tạo mới dữ liệu thành công", 201);
  } catch (error) {
    // Check validation error (e.g. required field missing)
    const errMessage = (error as Error).message;
    if (errMessage.includes("bắt buộc")) {
      sendError(res, errMessage, 400);
      return;
    }
    handleDbError(res, error, "Lỗi tạo mới dữ liệu");
  }
};

export const updateItem = async (req: Request, res: Response): Promise<void> => {
  if (!validateResource(req, res)) return;
  const { resource, id } = req.params;

  if (!id) {
    sendError(res, "ID là bắt buộc", 400);
    return;
  }

  try {
    const updatedItem = await crudService.update(resource, id, req.body);
    if (!updatedItem) {
      sendError(res, "Không tìm thấy dữ liệu để cập nhật hoặc không có gì thay đổi", 404);
      return;
    }
    sendSuccess(res, updatedItem, "Cập nhật dữ liệu thành công");
  } catch (error) {
    handleDbError(res, error, "Lỗi cập nhật dữ liệu");
  }
};

export const deleteSingleItem = async (req: Request, res: Response): Promise<void> => {
  if (!validateResource(req, res)) return;
  const { resource, id } = req.params;

  if (!id) {
    sendError(res, "ID là bắt buộc", 400);
    return;
  }

  try {
    const deleted = await crudService.deleteById(resource, id);
    if (!deleted) {
      sendError(res, "Không tìm thấy dữ liệu để xóa", 404);
      return;
    }
    sendSuccess(res, { id }, "Xóa dữ liệu thành công");
  } catch (error) {
    handleDbError(res, error, "Lỗi xóa dữ liệu");
  }
};

export const deleteBulkItems = async (req: Request, res: Response): Promise<void> => {
  if (!validateResource(req, res)) return;
  const { resource } = req.params;
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    sendError(res, "Danh sách ids phải là mảng và không được rỗng", 400);
    return;
  }

  try {
    const deletedCount = await crudService.deleteBulk(resource, ids);
    sendSuccess(res, { deletedCount }, `Xóa thành công ${deletedCount} bản ghi`);
  } catch (error) {
    handleDbError(res, error, "Lỗi xóa nhiều dữ liệu");
  }
};

export const deleteAllItems = async (req: Request, res: Response): Promise<void> => {
  if (!validateResource(req, res)) return;
  const { resource } = req.params;

  try {
    await crudService.deleteAll(resource);
    sendSuccess(res, null, "Xóa toàn bộ dữ liệu thành công");
  } catch (error) {
    handleDbError(res, error, "Lỗi xóa toàn bộ dữ liệu");
  }
};
