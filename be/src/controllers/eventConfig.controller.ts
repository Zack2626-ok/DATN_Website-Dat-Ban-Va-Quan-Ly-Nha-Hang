import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendError, sendSuccess } from "../utils/response";

// ===== Sảnh Tiệc (Halls) Controllers =====

export const getHallsHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const halls = await db.getHalls();
    sendSuccess(res, halls, "Lấy danh sách sảnh tiệc thành công");
  } catch (err) {
    console.error("Error in getHallsHandler:", err);
    sendError(res, `Lỗi lấy danh sách sảnh tiệc: ${(err as Error).message}`, 500);
  }
};

export const createHallHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, capacity, description } = req.body;

    if (!name || capacity === undefined) {
      sendError(res, "Tên sảnh và sức chứa là bắt buộc!", 400);
      return;
    }

    if (Number(capacity) <= 0) {
      sendError(res, "Sức chứa sảnh phải lớn hơn 0!", 400);
      return;
    }

    const newHall = await db.createHall({
      name,
      capacity: Number(capacity),
      description,
    });

    sendSuccess(res, newHall, "Tạo sảnh tiệc thành công!", 201);
  } catch (err) {
    console.error("Error in createHallHandler:", err);
    sendError(res, `Lỗi tạo sảnh tiệc: ${(err as Error).message}`, 500);
  }
};

export const updateHallHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, capacity, description, is_active } = req.body;

    if (!id) {
      sendError(res, "ID sảnh tiệc là bắt buộc", 400);
      return;
    }

    const payload: any = {
      name,
      capacity: capacity !== undefined ? Number(capacity) : undefined,
      description,
      is_active,
    };

    // Clean up undefined fields
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    const success = await db.updateHall(id, payload);
    if (!success) {
      sendError(res, "Không tìm thấy sảnh tiệc hoặc không có thay đổi", 404);
      return;
    }

    sendSuccess(res, { id, ...payload }, "Cập nhật sảnh tiệc thành công!");
  } catch (err) {
    console.error("Error in updateHallHandler:", err);
    sendError(res, `Lỗi cập nhật sảnh tiệc: ${(err as Error).message}`, 500);
  }
};

export const toggleHallHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (!id || is_active === undefined) {
      sendError(res, "ID và trạng thái hoạt động là bắt buộc", 400);
      return;
    }

    const success = await db.updateHall(id, { is_active: Number(is_active) });
    if (!success) {
      sendError(res, "Không tìm thấy sảnh tiệc hoặc không thể chuyển đổi trạng thái", 404);
      return;
    }

    sendSuccess(res, null, "Thay đổi trạng thái sảnh tiệc thành công!");
  } catch (err) {
    console.error("Error in toggleHallHandler:", err);
    sendError(res, `Lỗi thay đổi trạng thái sảnh: ${(err as Error).message}`, 500);
  }
};

// ===== Gói Set Menu Tiệc (Event Packages) Controllers =====

export const getPackagesHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const packages = await db.getEventPackages();
    sendSuccess(res, packages, "Lấy danh sách gói set menu thành công");
  } catch (err) {
    console.error("Error in getPackagesHandler:", err);
    sendError(res, `Lỗi lấy danh sách gói tiệc: ${(err as Error).message}`, 500);
  }
};

export const createPackageHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, price_per_person, description, items } = req.body;

    if (!name || price_per_person === undefined) {
      sendError(res, "Tên gói tiệc và giá mỗi khách là bắt buộc!", 400);
      return;
    }

    if (Number(price_per_person) <= 0) {
      sendError(res, "Giá mỗi khách phải lớn hơn 0!", 400);
      return;
    }

    const newPackage = await db.createEventPackage({
      name,
      price_per_person: Number(price_per_person),
      description,
      items: items || [],
    });

    sendSuccess(res, newPackage, "Tạo gói set menu tiệc thành công!", 201);
  } catch (err) {
    console.error("Error in createPackageHandler:", err);
    sendError(res, `Lỗi tạo gói tiệc: ${(err as Error).message}`, 500);
  }
};

export const updatePackageHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, price_per_person, description, is_active, items } = req.body;

    if (!id) {
      sendError(res, "ID gói tiệc là bắt buộc", 400);
      return;
    }

    const payload: any = {
      name,
      price_per_person: price_per_person !== undefined ? Number(price_per_person) : undefined,
      description,
      is_active,
      items,
    };

    // Clean up undefined fields
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    const success = await db.updateEventPackage(id, payload);
    if (!success) {
      sendError(res, "Không tìm thấy gói tiệc hoặc không thể cập nhật", 404);
      return;
    }

    sendSuccess(res, { id, ...payload }, "Cập nhật gói set menu tiệc thành công!");
  } catch (err) {
    console.error("Error in updatePackageHandler:", err);
    sendError(res, `Lỗi cập nhật gói tiệc: ${(err as Error).message}`, 500);
  }
};

export const togglePackageHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (!id || is_active === undefined) {
      sendError(res, "ID và trạng thái hoạt động là bắt buộc", 400);
      return;
    }

    const success = await db.updateEventPackage(id, { is_active: Number(is_active) });
    if (!success) {
      sendError(res, "Không tìm thấy gói tiệc hoặc không thể chuyển đổi trạng thái", 404);
      return;
    }

    sendSuccess(res, null, "Thay đổi trạng thái gói tiệc thành công!");
  } catch (err) {
    console.error("Error in togglePackageHandler:", err);
    sendError(res, `Lỗi thay đổi trạng thái gói tiệc: ${(err as Error).message}`, 500);
  }
};
