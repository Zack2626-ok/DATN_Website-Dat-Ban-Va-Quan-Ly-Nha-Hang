import { Request, Response } from "express";
import { sendSuccess, sendError } from "../utils/response";

/**
 * Register a new user (staff account)
 */
export const registerHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { full_name, email, password, role_name, phone } = req.body;

    // Validation
    if (!full_name || !email || !password || !phone) {
      sendError(res, "Vui lòng điền đầy đủ thông tin bắt buộc!", 400);
      return;
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      sendError(res, "Email không hợp lệ!", 400);
      return;
    }

    // Phone validation
    if (!/^\d{10}$/.test(phone)) {
      sendError(res, "Số điện thoại phải có 10 chữ số!", 400);
      return;
    }

    // Password validation
    if (password.length < 6) {
      sendError(res, "Mật khẩu phải ít nhất 6 ký tự!", 400);
      return;
    }

    // TODO: Check if user already exists
    // TODO: Hash password
    // TODO: Save to database

    const newUser = {
      id: `user_${Math.random().toString(36).substr(2, 9)}`,
      full_name,
      email,
      role_name: role_name || "WAITER",
      phone,
      createdAt: new Date().toISOString(),
    };

    sendSuccess(res, newUser, "Tạo tài khoản thành công!", 201);
  } catch (err) {
    console.error("Error in registerHandler:", err);
    sendError(res, `Lỗi tạo tài khoản: ${(err as Error).message}`, 500);
  }
};

/**
 * Login user
 */
export const loginHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      sendError(res, "Email và mật khẩu là bắt buộc!", 400);
      return;
    }

    // TODO: Check user exists in database
    // TODO: Verify password

    // Mock response for now
    const loginResponse = {
      accessToken: "fake-token-" + Math.random().toString(36).slice(2),
      refreshToken: "fake-refresh-" + Math.random().toString(36).slice(2),
      user: { id: 1, email, role: "ADMIN" },
    };

    sendSuccess(res, loginResponse, "Đăng nhập thành công!");
  } catch (err) {
    console.error("Error in loginHandler:", err);
    sendError(res, `Lỗi đăng nhập: ${(err as Error).message}`, 500);
  }
};

/**
 * Get current user info
 */
export const getMeHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // TODO: Get user from token
    sendSuccess(res, { id: 1, email: "test@example.com", role: "ADMIN" });
  } catch (err) {
    sendError(res, `Lỗi lấy thông tin: ${(err as Error).message}`, 500);
  }
};
