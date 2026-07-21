import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendSuccess, sendError } from "../utils/response";

// Helper to calculate tier level based on accumulated points
const getTierLevel = (points: number): "bronze" | "silver" | "gold" | "vip" => {
  if (points >= 500) return "vip";
  if (points >= 300) return "gold";
  if (points >= 100) return "silver";
  return "bronze";
};

// ============================================================================
// 1. CUSTOMERS CRUD & LOYALTY OPERATIONS
// ============================================================================

export const getAllCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const customers = await db.query(
      `SELECT * FROM customers WHERE is_deleted = 0 ORDER BY id DESC`
    );
    sendSuccess(res, customers, "Lấy danh sách khách hàng thành công");
  } catch (error) {
    console.error("Error in getAllCustomers:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getCustomerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const rows = await db.query(
      `SELECT * FROM customers WHERE id = ? AND is_deleted = 0`,
      [Number(id)]
    );
    if (!rows || rows.length === 0) {
      sendError(res, "Không tìm thấy khách hàng", 404);
      return;
    }
    sendSuccess(res, rows[0], "Lấy thông tin khách hàng thành công");
  } catch (error) {
    console.error("Error in getCustomerById:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, member_level = "bronze", loyalty_points = 0 } = req.body;
    if (!name) {
      sendError(res, "Tên khách hàng là bắt buộc", 400);
      return;
    }

    // Check unique email if provided
    if (email) {
      const existing = await db.query(
        "SELECT id FROM customers WHERE email = ? AND is_deleted = 0",
        [email]
      );
      if (existing && existing.length > 0) {
        sendError(res, "Email này đã được sử dụng bởi khách hàng khác", 400);
        return;
      }
    }

    const calculatedLevel = getTierLevel(Number(loyalty_points));

    const result = await db.query(
      `INSERT INTO customers (name, email, phone, member_level, loyalty_points, is_deleted, created_at)
       VALUES (?, ?, ?, ?, ?, 0, NOW())`,
      [name, email || null, phone || null, calculatedLevel, Number(loyalty_points)]
    );

    const newCustomer = {
      id: result.insertId,
      name,
      email,
      phone,
      member_level: calculatedLevel,
      loyalty_points,
    };

    sendSuccess(res, newCustomer, "Tạo tài khoản khách hàng thành công", 201);
  } catch (error) {
    console.error("Error in createCustomer:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, phone, loyalty_points } = req.body;
    if (!name) {
      sendError(res, "Tên khách hàng là bắt buộc", 400);
      return;
    }

    // Check unique email
    if (email) {
      const existing = await db.query(
        "SELECT id FROM customers WHERE email = ? AND id != ? AND is_deleted = 0",
        [email, Number(id)]
      );
      if (existing && existing.length > 0) {
        sendError(res, "Email này đã được sử dụng bởi khách hàng khác", 400);
        return;
      }
    }

    let queryStr = "UPDATE customers SET name = ?, email = ?, phone = ?";
    const params = [name, email || null, phone || null];

    if (loyalty_points !== undefined) {
      const calculatedLevel = getTierLevel(Number(loyalty_points));
      queryStr += ", loyalty_points = ?, member_level = ?";
      params.push(Number(loyalty_points), calculatedLevel);
    }

    queryStr += " WHERE id = ? AND is_deleted = 0";
    params.push(Number(id));

    await db.query(queryStr, params);

    const updated = await db.query("SELECT * FROM customers WHERE id = ?", [Number(id)]);
    sendSuccess(res, updated[0], "Cập nhật khách hàng thành công");
  } catch (error) {
    console.error("Error in updateCustomer:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const deleteCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await db.query(
      `UPDATE customers SET is_deleted = 1, deleted_at = NOW() WHERE id = ?`,
      [Number(id)]
    );
    sendSuccess(res, null, "Xóa khách hàng thành công (Soft Delete)");
  } catch (error) {
    console.error("Error in deleteCustomer:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getCustomerLoyaltyHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const history = await db.query(
      `SELECT lt.*, i.total AS invoice_total
       FROM loyalty_transactions lt
       LEFT JOIN invoices i ON lt.ref_invoice_id = i.id
       WHERE lt.customer_id = ?
       ORDER BY lt.created_at DESC`,
      [Number(id)]
    );
    sendSuccess(res, history, "Lấy lịch sử giao dịch điểm thành công");
  } catch (error) {
    console.error("Error in getCustomerLoyaltyHistory:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

// Service function to earn loyalty points after payment
// Rule: 1 point = 1,000 VND spent
export const addLoyaltyPoints = async (
  customerId: number,
  invoiceAmount: number,
  invoiceId: number
): Promise<void> => {
  try {
    const pointsToEarn = Math.floor(invoiceAmount / 1000);
    if (pointsToEarn <= 0) return;

    // 1. Record earning transaction
    await db.query(
      `INSERT INTO loyalty_transactions (customer_id, points, type, ref_invoice_id, note, created_at)
       VALUES (?, ?, 'earn', ?, ?, NOW())`,
      [
        customerId,
        pointsToEarn,
        invoiceId,
        `Tích điểm từ hóa đơn thanh toán #${invoiceId} số tiền ${invoiceAmount.toLocaleString("vi-VN")} đ`
      ]
    );

    // 2. Fetch current points and update level
    const customer = await db.query(
      "SELECT loyalty_points FROM customers WHERE id = ? AND is_deleted = 0",
      [customerId]
    );
    if (customer && customer.length > 0) {
      const currentPoints = Number(customer[0].loyalty_points || 0);
      const newPoints = currentPoints + pointsToEarn;
      const newLevel = getTierLevel(newPoints);

      await db.query(
        "UPDATE customers SET loyalty_points = ?, member_level = ? WHERE id = ?",
        [newPoints, newLevel, customerId]
      );
      console.log(`✅ Customer #${customerId} earned ${pointsToEarn} points. New total: ${newPoints} pts (${newLevel}).`);
    }
  } catch (err: any) {
    console.error("Failed to add loyalty points for customer:", err.message);
  }
};

// ============================================================================
// 2. VOUCHERS CRUD
// ============================================================================

export const getAllVouchers = async (req: Request, res: Response): Promise<void> => {
  try {
    const vouchers = await db.query("SELECT * FROM vouchers ORDER BY id DESC");
    sendSuccess(res, vouchers, "Lấy danh sách vouchers thành công");
  } catch (error) {
    console.error("Error in getAllVouchers:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const createVoucher = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, type, value, min_order, max_uses, expired_at, is_active = 1 } = req.body;
    if (!code || !type || value === undefined) {
      sendError(res, "Thiếu thông tin voucher bắt buộc", 400);
      return;
    }

    const uppercaseCode = code.trim().toUpperCase();

    // Check unique code
    const existing = await db.query("SELECT id FROM vouchers WHERE code = ?", [uppercaseCode]);
    if (existing && existing.length > 0) {
      sendError(res, "Mã voucher này đã tồn tại", 400);
      return;
    }

    const result = await db.query(
      `INSERT INTO vouchers (code, type, value, min_order, max_uses, used_count, expired_at, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, NOW())`,
      [
        uppercaseCode,
        type,
        Number(value),
        Number(min_order || 0),
        max_uses !== undefined && max_uses !== null ? Number(max_uses) : null,
        expired_at || null,
        Number(is_active)
      ]
    );

    const newVoucher = {
      id: result.insertId,
      code: uppercaseCode,
      type,
      value,
      min_order,
      max_uses,
      used_count: 0,
      expired_at,
      is_active,
    };

    sendSuccess(res, newVoucher, "Tạo voucher mới thành công", 201);
  } catch (error) {
    console.error("Error in createVoucher:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const updateVoucher = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { code, type, value, min_order, max_uses, expired_at, is_active } = req.body;

    if (!code || !type || value === undefined) {
      sendError(res, "Thiếu thông tin voucher bắt buộc", 400);
      return;
    }

    const uppercaseCode = code.trim().toUpperCase();

    // Check unique code
    const existing = await db.query("SELECT id FROM vouchers WHERE code = ? AND id != ?", [
      uppercaseCode,
      Number(id)
    ]);
    if (existing && existing.length > 0) {
      sendError(res, "Mã voucher này đã được sử dụng cho voucher khác", 400);
      return;
    }

    await db.query(
      `UPDATE vouchers 
       SET code = ?, type = ?, value = ?, min_order = ?, max_uses = ?, expired_at = ?, is_active = ?
       WHERE id = ?`,
      [
        uppercaseCode,
        type,
        Number(value),
        Number(min_order || 0),
        max_uses !== undefined && max_uses !== null ? Number(max_uses) : null,
        expired_at || null,
        Number(is_active),
        Number(id)
      ]
    );

    const updated = await db.query("SELECT * FROM vouchers WHERE id = ?", [Number(id)]);
    sendSuccess(res, updated[0], "Cập nhật voucher thành công");
  } catch (error) {
    console.error("Error in updateVoucher:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const toggleVoucherActive = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    await db.query("UPDATE vouchers SET is_active = ? WHERE id = ?", [
      Number(is_active),
      Number(id)
    ]);
    sendSuccess(res, null, "Cập nhật trạng thái voucher thành công");
  } catch (error) {
    console.error("Error in toggleVoucherActive:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const deleteVoucher = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    // Set is_active to 0 as soft delete, or hard delete if requested.
    // For safety with records, we toggle is_active = 0.
    await db.query("UPDATE vouchers SET is_active = 0 WHERE id = ?", [Number(id)]);
    sendSuccess(res, null, "Đã hủy kích hoạt voucher (Soft Delete)");
  } catch (error) {
    console.error("Error in deleteVoucher:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

// ============================================================================
// 3. PROMOTIONS CRUD
// ============================================================================

export const getAllPromotions = async (req: Request, res: Response): Promise<void> => {
  try {
    const promotions = await db.query("SELECT * FROM promotions ORDER BY id DESC");
    sendSuccess(res, promotions, "Lấy danh sách chương trình khuyến mãi thành công");
  } catch (error) {
    console.error("Error in getAllPromotions:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const createPromotion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, discount_type, discount_value, image_url, start_date, end_date, is_active = 1 } = req.body;
    if (!title || !discount_type || discount_value === undefined || !start_date || !end_date) {
      sendError(res, "Thiếu thông tin chương trình khuyến mãi", 400);
      return;
    }

    const result = await db.query(
      `INSERT INTO promotions (title, description, discount_type, discount_value, image_url, start_date, end_date, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        title,
        description || null,
        discount_type,
        Number(discount_value),
        image_url || null,
        start_date,
        end_date,
        Number(is_active)
      ]
    );

    const newPromo = {
      id: result.insertId,
      title,
      description,
      discount_type,
      discount_value,
      image_url,
      start_date,
      end_date,
      is_active,
    };

    sendSuccess(res, newPromo, "Tạo chương trình khuyến mãi mới thành công", 201);
  } catch (error) {
    console.error("Error in createPromotion:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const updatePromotion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, discount_type, discount_value, image_url, start_date, end_date, is_active } = req.body;

    if (!title || !discount_type || discount_value === undefined || !start_date || !end_date) {
      sendError(res, "Thiếu thông tin chương trình khuyến mãi", 400);
      return;
    }

    await db.query(
      `UPDATE promotions 
       SET title = ?, description = ?, discount_type = ?, discount_value = ?, image_url = ?, start_date = ?, end_date = ?, is_active = ?
       WHERE id = ?`,
      [
        title,
        description || null,
        discount_type,
        Number(discount_value),
        image_url || null,
        start_date,
        end_date,
        Number(is_active),
        Number(id)
      ]
    );

    const updated = await db.query("SELECT * FROM promotions WHERE id = ?", [Number(id)]);
    sendSuccess(res, updated[0], "Cập nhật chương trình khuyến mãi thành công");
  } catch (error) {
    console.error("Error in updatePromotion:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const deletePromotion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await db.query("UPDATE promotions SET is_active = 0 WHERE id = ?", [Number(id)]);
    sendSuccess(res, null, "Đã hủy kích hoạt chương trình khuyến mãi (Soft Delete)");
  } catch (error) {
    console.error("Error in deletePromotion:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};
