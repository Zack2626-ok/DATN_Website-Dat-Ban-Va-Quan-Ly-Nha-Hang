import { Request, Response } from "express";
import * as db from "../utils/db";
import { sendError, sendSuccess } from "../utils/response";

export const getAllInventory = async (_req: Request, res: Response): Promise<void> => {
  try {
    const items = await db.query(`
      SELECT 
        id, 
        name,
        name as itemName,
        current_stock as stock, 
        unit, 
        min_stock as threshold 
      FROM ingredients 
      WHERE is_deleted = 0
    `);
    sendSuccess(res, items, "Lấy danh sách kho thành công");
  } catch (error) {
    console.error("Error fetching inventory:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getIngredientsList = getAllInventory;

export const getTransactionsList = async (_req: Request, res: Response): Promise<void> => {
  try {
    const items = await db.query(`
      (
        SELECT 
          CONCAT('OUT-', so.id) as id,
          'export' as type,
          i.name as ingredientName,
          so.quantity as quantity,
          i.unit as unit,
          so.reason as reasonOrSupplier,
          so.created_at as timestamp
        FROM stock_out so
        JOIN ingredients i ON so.ingredient_id = i.id
      )
      UNION ALL
      (
        SELECT 
          CONCAT('IN-', si.id) as id,
          'import' as type,
          i.name as ingredientName,
          si.quantity as quantity,
          i.unit as unit,
          COALESCE(s.name, si.note) as reasonOrSupplier,
          si.created_at as timestamp
        FROM stock_in si
        JOIN ingredients i ON si.ingredient_id = i.id
        LEFT JOIN suppliers s ON si.supplier_id = s.id
      )
      ORDER BY timestamp DESC
      LIMIT 100
    `);
    sendSuccess(res, items, "Lấy lịch sử nhập/xuất kho thành công");
  } catch (error) {
    console.error("Error fetching inventory transactions:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getInventoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const items = await db.query(
      `SELECT id, name as itemName, current_stock as stock, unit, min_stock as threshold FROM ingredients WHERE id = ? AND is_deleted = 0`,
      [id]
    );
    if (items.length === 0) return sendError(res, "Không tìm thấy mục kho", 404);
    sendSuccess(res, items[0], "Lấy thông tin kho thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const createInventoryItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, stock, unit, threshold } = req.body;
    if (!name || stock === undefined || !unit || threshold === undefined) {
      return sendError(res, "Tên, số lượng, đơn vị và mức tồn tối thiểu là bắt buộc", 400);
    }
    const result = await db.query(
      `INSERT INTO ingredients (name, unit, current_stock, min_stock) VALUES (?, ?, ?, ?)`,
      [name, unit, Number(stock), Number(threshold)]
    );
    
    // Log import if stock > 0
    if (Number(stock) > 0) {
      await db.query(
        `INSERT INTO stock_in (ingredient_id, quantity, unit_cost, note, created_by) VALUES (?, ?, ?, ?, ?)`,
        [result.insertId, Number(stock), 0, 'Nhập kho ban đầu', 1]
      );
    }
    
    sendSuccess(res, { id: result.insertId, name, stock, unit, threshold }, "Thêm nguyên liệu thành công", 201);
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const updateInventoryItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, unit, threshold } = req.body;
    await db.query(
      `UPDATE ingredients SET name = ?, unit = ?, min_stock = ? WHERE id = ?`,
      [name, unit, Number(threshold), id]
    );
    sendSuccess(res, { id }, "Cập nhật kho thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const deleteInventoryItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await db.query(`UPDATE ingredients SET is_deleted = 1, deleted_at = NOW() WHERE id = ?`, [id]);
    sendSuccess(res, { id }, "Xóa kho thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const updateInventoryQuantity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { quantity, type, reasonOrSupplier } = req.body; // type: import | export | adjust

    const qty = Number(quantity);
    if (type === "import") {
      await db.query(`UPDATE ingredients SET current_stock = current_stock + ? WHERE id = ?`, [qty, id]);
      await db.query(
        `INSERT INTO stock_in (ingredient_id, quantity, unit_cost, note, created_by) VALUES (?, ?, ?, ?, ?)`,
        [id, qty, 0, reasonOrSupplier || 'Nhập kho thủ công', 1]
      );
    } else if (type === "export" || type === "adjust") {
      await db.query(`UPDATE ingredients SET current_stock = current_stock - ? WHERE id = ?`, [qty, id]);
      await db.query(
        `INSERT INTO stock_out (ingredient_id, quantity, reason, note, created_by) VALUES (?, ?, ?, ?, ?)`,
        [id, qty, 'other', reasonOrSupplier || 'Xuất/Điều chỉnh kho thủ công', 1]
      );
    }
    
    const updated = await db.query(`SELECT current_stock as stock FROM ingredients WHERE id = ?`, [id]);
    sendSuccess(res, updated[0], "Cập nhật số lượng thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

export const getLowStockItems = async (_req: Request, res: Response): Promise<void> => {
  try {
    const items = await db.query(`
      SELECT id, name as itemName, current_stock as stock, unit, min_stock as threshold 
      FROM ingredients 
      WHERE current_stock <= min_stock AND is_deleted = 0
    `);
    sendSuccess(res, items, "Lấy danh sách hàng sắp hết thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};
export const submitStockCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    const { records } = req.body; // array
    const userId = (req as any).user?.id ?? 1;
 
    if (!Array.isArray(records) || records.length === 0) {
      sendError(res, "Dữ liệu kiểm kê không hợp lệ", 400);
      return;
    }
 
    for (const rec of records) {
      const { ingredient_id, actual_stock } = rec;
 
      // Lấy current_stock hiện tại làm system_stock
      const rows = await db.query(
        `SELECT current_stock FROM ingredients WHERE id = ?`,
        [ingredient_id]
      );
      if (rows.length === 0) continue;
 
      const system_stock = Number(rows[0].current_stock);
      const actual = Number(actual_stock);
 
      // Lưu bản ghi kiểm kê
      await db.query(
        `INSERT INTO stock_inventory (ingredient_id, actual_stock, system_stock, noted_at, created_by)
         VALUES (?, ?, ?, CURDATE(), ?)`,
        [ingredient_id, actual, system_stock, userId]
      );
 
      // Cân bằng sổ sách: cập nhật current_stock về actual
      await db.query(
        `UPDATE ingredients SET current_stock = ? WHERE id = ?`,
        [actual, ingredient_id]
      );
 
      // Nếu actual < system → ghi stock_out waste để cân bằng
      const diff = actual - system_stock;
      if (diff < 0) {
        await db.query(
          `INSERT INTO stock_out (ingredient_id, quantity, reason, note, created_by)
           VALUES (?, ?, 'waste', 'Chênh lệch kiểm kê kho', ?)`,
          [ingredient_id, Math.abs(diff), userId]
        );
      }
    }
 
    sendSuccess(res, { count: records.length }, "Lưu kiểm kê thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};
 
// GET /v1/inventory/stock-check/today
// Trả về danh sách nguyên liệu + current_stock để bếp trưởng điền actual
export const getTodayCheckList = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db.query(`
      SELECT 
        i.id,
        i.name,
        i.unit,
        i.current_stock AS system_stock,
        -- Lấy actual_stock lần kiểm kê gần nhất nếu hôm nay đã kiểm
        (SELECT si.actual_stock 
         FROM stock_inventory si 
         WHERE si.ingredient_id = i.id AND DATE(si.noted_at) = CURDATE()
         ORDER BY si.id DESC LIMIT 1) AS actual_today,
        (SELECT si.noted_at 
         FROM stock_inventory si 
         WHERE si.ingredient_id = i.id
         ORDER BY si.id DESC LIMIT 1) AS last_checked
      FROM ingredients i
      WHERE i.is_deleted = 0
      ORDER BY i.name
    `);
    sendSuccess(res, rows, "Lấy danh sách kiểm kê thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};
 
// ---------------- TASK 4: Trả nợ NCC ----------------
 
// PATCH /v1/inventory/suppliers/:id/pay
// Body: { amount, method, note }
export const paySupplierDebt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { amount, method = "cash", note } = req.body;
    const userId = (req as any).user?.id ?? 1;
 
    if (!amount || Number(amount) <= 0) {
      sendError(res, "Số tiền không hợp lệ", 400);
      return;
    }
 
    // Kiểm tra NCC tồn tại
    const suppliers = await db.query(
      `SELECT id, name, total_debt FROM suppliers WHERE id = ?`,
      [id]
    );
    if (suppliers.length === 0) {
      sendError(res, "Không tìm thấy nhà cung cấp", 404);
      return;
    }
 
    const supplier = suppliers[0];
    const payAmount = Math.min(Number(amount), Number(supplier.total_debt));
 
    // Trừ nợ
    await db.query(
      `UPDATE suppliers SET total_debt = GREATEST(0, total_debt - ?) WHERE id = ?`,
      [payAmount, id]
    );
 
    // Ghi lịch sử
    await db.query(
      `INSERT INTO debt_payments (supplier_id, amount, method, note, paid_by)
       VALUES (?, ?, ?, ?, ?)`,
      [id, payAmount, method, note || null, userId]
    );
 
    // Lấy nợ còn lại
    const updated = await db.query(`SELECT total_debt FROM suppliers WHERE id = ?`, [id]);
 
    sendSuccess(
      res,
      {
        supplierId: id,
        paid: payAmount,
        remaining: Number(updated[0].total_debt),
      },
      "Thanh toán công nợ thành công"
    );
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};
 
// GET /v1/inventory/suppliers/:id/debt-history
export const getDebtHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const rows = await db.query(
      `
      SELECT dp.id, dp.amount, dp.method, dp.note, dp.paid_at,
             u.full_name AS paid_by_name
      FROM debt_payments dp
      JOIN users u ON dp.paid_by = u.id
      WHERE dp.supplier_id = ?
      ORDER BY dp.paid_at DESC
      LIMIT 50
      `,
      [id]
    );
    sendSuccess(res, rows, "Lịch sử thanh toán nợ");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};
