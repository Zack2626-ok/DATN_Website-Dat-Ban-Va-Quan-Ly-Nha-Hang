import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { createUser, findUserByEmail, findUserById } from "../utils/db";
import { generateToken, verifyToken } from "../utils/jwt";
import { sendError, sendSuccess } from "../utils/response";

const sanitizeUser = (user: any) => {
  const { password, ...rest } = user;
  return rest;
};

export const registerHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { full_name, email, password, role_name, phone } = req.body;
    const creatorRole = (req.user?.role_name || req.user?.role || "").toString().toLowerCase();

    if (!creatorRole) {
      sendError(res, "Bạn cần đăng nhập để thực hiện chức năng này.", 401);
      return;
    }

    if (!full_name || !email || !password || !phone) {
      sendError(res, "Vui lòng điền đầy đủ thông tin bắt buộc!", 400);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      sendError(res, "Email không hợp lệ!", 400);
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      sendError(res, "Số điện thoại phải có 10 chữ số!", 400);
      return;
    }

    if (password.length < 6) {
      sendError(res, "Mật khẩu phải ít nhất 6 ký tự!", 400);
      return;
    }

    const roleNameNormalized = (role_name || "WAITER").toString().toLowerCase();
    if (creatorRole === "manager" && roleNameNormalized === "admin") {
      sendError(res, "Quản lý không thể tạo tài khoản admin.", 403);
      return;
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      sendError(res, "Email đã được sử dụng. Vui lòng dùng email khác.", 409);
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await createUser({
      full_name,
      email,
      password: hashedPassword,
      role_name: roleNameNormalized,
      phone,
    });

    sendSuccess(res, sanitizeUser(newUser), "Tạo tài khoản thành công!", 201);
  } catch (err) {
    console.error("Error in registerHandler:", err);
    sendError(res, `Lỗi tạo tài khoản: ${(err as Error).message}`, 500);
  }
};

export const loginHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      sendError(res, "Email và mật khẩu là bắt buộc!", 400);
      return;
    }

    const user = await findUserByEmail(email);
    if (!user) {
      sendError(res, "Email hoặc mật khẩu không đúng.", 401);
      return;
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      sendError(res, "Email hoặc mật khẩu không đúng.", 401);
      return;
    }

    const accessToken = generateToken({
      userId: user.id,
      email: user.email,
      role_name: user.role_name,
    });

    const refreshToken = generateToken({
      userId: user.id,
      email: user.email,
      role_name: user.role_name,
    });

    sendSuccess(res, {
      accessToken,
      refreshToken,
      user: { ...sanitizeUser(user), role: user.role_name },
    }, "Đăng nhập thành công!");
  } catch (err) {
    console.error("Error in loginHandler:", err);
    sendError(res, `Lỗi đăng nhập: ${(err as Error).message}`, 500);
  }
};

export const getMeHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.user || (() => {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        throw new Error("Token không hợp lệ hoặc không tồn tại.");
      }
      const token = authHeader.split(" ")[1];
      return verifyToken(token);
    })();

    const user = await findUserById(payload.userId);

    if (!user) {
      sendError(res, "Người dùng không tồn tại.", 404);
      return;
    }

    sendSuccess(res, { ...sanitizeUser(user), role: user.role_name }, "Lấy thông tin người dùng thành công.");
  } catch (err) {
    console.error("Error in getMeHandler:", err);
    sendError(res, `Lỗi lấy thông tin: ${(err as Error).message}`, 401);
  }
};
