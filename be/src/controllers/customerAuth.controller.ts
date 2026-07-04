import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as db from "../utils/db";
import { sendSuccess, sendError } from "../utils/response";

const getCustomerSecret = (): string => {
  return process.env.JWT_CUSTOMER_SECRET || (process.env.JWT_SECRET ? process.env.JWT_SECRET + "_customer" : "customer_default_secret_key");
};

const generateCustomerToken = (payload: { id: number; email: string; name: string }): string => {
  return jwt.sign(payload, getCustomerSecret(), { expiresIn: "7d" });
};

const sanitizeCustomer = (customer: any) => {
  const { password_hash, ...rest } = customer;
  return rest;
};

export const registerCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      sendError(res, "Họ tên, email và mật khẩu là bắt buộc.", 400);
      return;
    }

    const existing = await db.findCustomerByEmail(email);
    if (existing) {
      sendError(res, "Email đã được sử dụng bởi khách hàng khác.", 409);
      return;
    }

    const password_hash = await bcrypt.hash(password, 10);
    const newCustomer = await db.createCustomer({
      name,
      email,
      password_hash,
      phone,
    });

    const token = generateCustomerToken({
      id: newCustomer.id,
      email: newCustomer.email,
      name: newCustomer.name,
    });

    sendSuccess(res, { token, customer: sanitizeCustomer(newCustomer) }, "Đăng ký tài khoản thành công.", 201);
  } catch (error) {
    console.error("Error in registerCustomer:", error);
    sendError(res, `Lỗi đăng ký: ${(error as Error).message}`, 500);
  }
};

export const loginCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      sendError(res, "Email và mật khẩu là bắt buộc.", 400);
      return;
    }

    const customer = await db.findCustomerByEmail(email);
    if (!customer) {
      sendError(res, "Tài khoản email hoặc mật khẩu không chính xác.", 401);
      return;
    }

    const match = await bcrypt.compare(password, customer.password_hash);
    if (!match) {
      sendError(res, "Tài khoản email hoặc mật khẩu không chính xác.", 401);
      return;
    }

    const token = generateCustomerToken({
      id: customer.id,
      email: customer.email,
      name: customer.name,
    });

    sendSuccess(res, { token, customer: sanitizeCustomer(customer) }, "Đăng nhập thành công.");
  } catch (error) {
    console.error("Error in loginCustomer:", error);
    sendError(res, `Lỗi đăng nhập: ${(error as Error).message}`, 500);
  }
};

export const getCustomerMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.customer) {
      sendError(res, "Bạn cần đăng nhập để xem thông tin.", 401);
      return;
    }

    const customer = await db.findCustomerById(req.customer.id);
    if (!customer) {
      sendError(res, "Khách hàng không tồn tại.", 404);
      return;
    }

    sendSuccess(res, sanitizeCustomer(customer), "Lấy thông tin tài khoản thành công.");
  } catch (error) {
    console.error("Error in getCustomerMe:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const updateCustomerMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.customer) {
      sendError(res, "Bạn cần đăng nhập để cập nhật thông tin.", 401);
      return;
    }

    const { name, phone } = req.body;
    const payload: any = {};
    if (name !== undefined) payload.name = name;
    if (phone !== undefined) payload.phone = phone;

    if (Object.keys(payload).length === 0) {
      sendError(res, "Không có thông tin nào để cập nhật.", 400);
      return;
    }

    const success = await db.updateCustomerProfile(req.customer.id, payload);
    if (!success) {
      sendError(res, "Cập nhật không thành công hoặc không có thay đổi.", 404);
      return;
    }

    const updated = await db.findCustomerById(req.customer.id);
    sendSuccess(res, sanitizeCustomer(updated), "Cập nhật thông tin thành công.");
  } catch (error) {
    console.error("Error in updateCustomerMe:", error);
    sendError(res, `Lỗi cập nhật: ${(error as Error).message}`, 500);
  }
};

export const changeCustomerPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.customer) {
      sendError(res, "Bạn cần đăng nhập để đổi mật khẩu.", 401);
      return;
    }

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      sendError(res, "Mật khẩu cũ và mật khẩu mới là bắt buộc.", 400);
      return;
    }

    const customer = await db.findCustomerById(req.customer.id);
    if (!customer) {
      sendError(res, "Khách hàng không tồn tại.", 404);
      return;
    }

    const match = await bcrypt.compare(oldPassword, customer.password_hash);
    if (!match) {
      sendError(res, "Mật khẩu cũ không chính xác.", 400);
      return;
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    await db.updateCustomerProfile(req.customer.id, { password_hash });

    sendSuccess(res, null, "Đổi mật khẩu thành công.");
  } catch (error) {
    console.error("Error in changeCustomerPassword:", error);
    sendError(res, `Lỗi đổi mật khẩu: ${(error as Error).message}`, 500);
  }
};

export const getCustomerLoyalty = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.customer) {
      sendError(res, "Bạn cần đăng nhập.", 401);
      return;
    }
    const customer = await db.findCustomerById(req.customer.id);
    if (!customer) {
      sendError(res, "Khách hàng không tồn tại.", 404);
      return;
    }
    const transactions = await db.getCustomerLoyaltyTransactions(req.customer.id);
    sendSuccess(res, {
      loyalty_points: customer.loyalty_points,
      member_level: customer.member_level,
      transactions,
    }, "Lấy lịch sử tích điểm loyalty thành công.");
  } catch (error) {
    console.error("Error in getCustomerLoyalty:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getVouchers = async (req: Request, res: Response): Promise<void> => {
  try {
    const vouchers = await db.getCustomerVouchers();
    sendSuccess(res, vouchers, "Lấy danh sách vouchers thành công.");
  } catch (error) {
    console.error("Error in getVouchers:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getMyBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.customer) {
      sendError(res, "Bạn cần đăng nhập.", 401);
      return;
    }
    const bookings = await db.getCustomerBookings(req.customer.id);
    sendSuccess(res, bookings, "Lấy lịch sử đặt bàn thành công.");
  } catch (error) {
    console.error("Error in getMyBookings:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const createEventContract = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.customer) {
      sendError(res, "Bạn cần đăng nhập để đặt tiệc.", 401);
      return;
    }
    const { hall_id, package_id, contact_name, contact_phone, event_date, guest_count, table_count, total_amount, note } = req.body;

    if (!hall_id || !contact_name || !contact_phone || !event_date || !guest_count || !table_count || !total_amount) {
      sendError(res, "Thiếu thông tin đặt tiệc bắt buộc.", 400);
      return;
    }

    const newContract = await db.createCustomerEventContract({
      hall_id: Number(hall_id),
      customer_id: req.customer.id,
      package_id: package_id ? Number(package_id) : null,
      contact_name,
      contact_phone,
      event_date,
      guest_count: Number(guest_count),
      table_count: Number(table_count),
      total_amount: Number(total_amount),
      note,
    });

    sendSuccess(res, newContract, "Gửi yêu cầu đặt tiệc sự kiện thành công.", 201);
  } catch (error) {
    console.error("Error in createEventContract:", error);
    sendError(res, `Lỗi đặt tiệc: ${(error as Error).message}`, 500);
  }
};

export const getMyEventContracts = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.customer) {
      sendError(res, "Bạn cần đăng nhập.", 401);
      return;
    }
    const contracts = await db.getCustomerEventContracts(req.customer.id);
    sendSuccess(res, contracts, "Lấy danh sách hợp đồng sự kiện thành công.");
  } catch (error) {
    console.error("Error in getMyEventContracts:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const cancelMyBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.customer) {
      sendError(res, "Bạn cần đăng nhập.", 401);
      return;
    }
    const { id } = req.params;
    const booking = await db.query("SELECT * FROM bookings WHERE id = ?", [id]);
    if (!booking[0]) {
      sendError(res, "Không tìm thấy đặt bàn.", 404);
      return;
    }

    if (booking[0].customer_id !== req.customer.id) {
      sendError(res, "Bạn không có quyền hủy đặt bàn này.", 403);
      return;
    }

    if (booking[0].status === "cancelled" || booking[0].status === "completed") {
      sendError(res, "Không thể hủy đặt bàn ở trạng thái hiện tại.", 400);
      return;
    }

    const success = await db.updateBookingStatus(Number(id), "cancelled");
    if (!success) {
      sendError(res, "Hủy đặt bàn thất bại.", 500);
      return;
    }

    sendSuccess(res, null, "Hủy đặt bàn thành công.");
  } catch (error) {
    console.error("Error in cancelMyBooking:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};



