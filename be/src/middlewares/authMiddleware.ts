import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { sendError } from "../utils/response";

/**
 * authStaff - Middleware to authenticate system staff using Bearer JWT token.
 * Extracts token from headers, verifies it, and attaches the payload to req.user.
 */
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
    if (!decoded) {
      sendError(res, "Mã token không hợp lệ hoặc đã hết hạn.", 401);
      return;
    }

    req.user = decoded;
    next();
  } catch (err: any) {
    console.error("Error in authStaff middleware:", err.message);
    sendError(res, "Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.", 401);
  }
};

/**
 * checkRole - Middleware to restrict route access based on allowed roles.
 * Compares the user's role (from decoded token) against allowed roles.
 */
export const checkRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      sendError(res, "Không tìm thấy thông tin đăng nhập.", 401);
      return;
    }

    const roleName = user.role || user.role_name;
    if (!roleName) {
      sendError(res, "Quyền người dùng không được xác định.", 403);
      return;
    }

    const hasRole = allowedRoles.some(
      (role) => role.trim().toLowerCase() === roleName.trim().toLowerCase()
    );

    if (!hasRole) {
      sendError(res, "Bạn không có quyền thực hiện chức năng này.", 403);
      return;
    }

    next();
  };
};
