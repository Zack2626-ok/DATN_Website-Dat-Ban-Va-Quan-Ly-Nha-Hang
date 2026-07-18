import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { sendError } from "../utils/response";
import { findCustomerById } from "../utils/db";
import { verifyToken } from "../utils/jwt";

const getCustomerSecret = (): string => {
  return process.env.JWT_CUSTOMER_SECRET || (process.env.JWT_SECRET ? process.env.JWT_SECRET + "_customer" : "customer_default_secret_key");
};

export const authStaff = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      sendError(res, "Bạn cần đăng nhập để thực hiện chức năng này.", 401);
      return;
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      sendError(res, "Token không tìm thấy.", 401);
      return;
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err: any) {
    console.error("Error in authStaff middleware:", err.message);
    sendError(res, "Phiên đăng nhập nhân viên đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.", 401);
  }
};

export const authorizeRoles = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = (req.user?.role_name || req.user?.role || "").toString().toLowerCase();
    if (!role || !allowedRoles.map((r) => r.toLowerCase()).includes(role)) {
      sendError(res, "Bạn không có quyền truy cập chức năng này.", 403);
      return;
    }
    next();
  };
};

export const authCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      sendError(res, "Bạn cần đăng nhập để thực hiện chức năng này.", 401);
      return;
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      sendError(res, "Token không tìm thấy.", 401);
      return;
    }

    const decoded = jwt.verify(token, getCustomerSecret()) as { id: number; email: string; name: string };
    const customer = await findCustomerById(decoded.id);

    if (!customer) {
      sendError(res, "Tài khoản khách hàng không tồn tại hoặc đã bị xóa.", 404);
      return;
    }

    req.customer = {
      id: customer.id,
      email: customer.email,
      name: customer.name,
    };

    next();
  } catch (err: any) {
    console.error("Error in authCustomer middleware:", err.message);
    sendError(res, "Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.", 401);
  }
};
