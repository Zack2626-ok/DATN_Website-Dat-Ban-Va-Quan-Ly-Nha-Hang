import bcrypt from "bcrypt";
import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendError, sendSuccess } from "../utils/response";

export const getRolesHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const roles = await db.getRoles();
    sendSuccess(res, roles, "Lấy danh sách vai trò thành công");
  } catch (err) {
    console.error("Error in getRolesHandler:", err);
    sendError(res, `Lỗi lấy danh sách vai trò: ${(err as Error).message}`, 500);
  }
};

export const getUsersHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await db.getUsers();
    sendSuccess(res, users, "Lấy danh sách nhân viên thành công");
  } catch (err) {
    console.error("Error in getUsersHandler:", err);
    sendError(res, `Lỗi lấy danh sách nhân viên: ${(err as Error).message}`, 500);
  }
};

export const createUserHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { full_name, email, password, role_id, phone, status } = req.body;

    if (!full_name || !email || !password || !role_id) {
      sendError(res, "Họ và tên, email, mật khẩu và vai trò là bắt buộc!", 400);
      return;
    }

    // Check email uniqueness
    const existing = await db.findUserByEmail(email);
    if (existing) {
      sendError(res, "Email đã được sử dụng. Vui lòng chọn email khác.", 409);
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await db.createResmanagerUser({
      full_name,
      email,
      password: hashedPassword,
      role_id,
      phone,
      status: status || "active",
    });

    sendSuccess(res, newUser, "Tạo tài khoản nhân viên thành công!", 201);
  } catch (err) {
    console.error("Error in createUserHandler:", err);
    sendError(res, `Lỗi tạo tài khoản: ${(err as Error).message}`, 500);
  }
};

export const updateUserHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { full_name, email, password, role_id, phone, status, is_deleted, deleted_at } = req.body;

    if (!id) {
      sendError(res, "ID nhân viên là bắt buộc", 400);
      return;
    }

    // Check email uniqueness if email is changed
    if (email) {
      const existing = await db.findUserByEmail(email);
      if (existing && String(existing.id) !== String(id)) {
        sendError(res, "Email đã được sử dụng bởi nhân viên khác.", 409);
        return;
      }
    }

    const payload: any = {
      full_name,
      email,
      role_id,
      phone,
      status,
      is_deleted,
      deleted_at,
    };

    if (password) {
      payload.password = await bcrypt.hash(password, 10);
    }

    // Clean up undefined properties to avoid overwriting database fields
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    const success = await db.updateResmanagerUser(id, payload);
    if (!success) {
      sendError(res, "Không tìm thấy nhân viên cần cập nhật", 404);
      return;
    }

    // Retrieve updated user to return
    const updatedUser = await db.findUserById(id);
    sendSuccess(res, updatedUser, "Cập nhật nhân viên thành công!");
  } catch (err) {
    console.error("Error in updateUserHandler:", err);
    sendError(res, `Lỗi cập nhật nhân viên: ${(err as Error).message}`, 500);
  }
};

export const deleteUserHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      sendError(res, "ID nhân viên là bắt buộc", 400);
      return;
    }

    const success = await db.updateResmanagerUser(id, {
      is_deleted: 1,
      deleted_at: new Date(),
    });

    if (!success) {
      sendError(res, "Không tìm thấy nhân viên hoặc không thể xóa", 404);
      return;
    }

    sendSuccess(res, null, "Xóa nhân viên thành công!");
  } catch (err) {
    console.error("Error in deleteUserHandler:", err);
    sendError(res, `Lỗi xóa nhân viên: ${(err as Error).message}`, 500);
  }
};
