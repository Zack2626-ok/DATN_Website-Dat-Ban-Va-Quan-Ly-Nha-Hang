import { Request, Response } from "express";
const xlsx = require("xlsx");
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
          0 as unit_cost,
          so.note as note,
          so.created_at as timestamp,
          si.batch_code as batchNo,
          si.expiry_date as expiryDate,
          so.reason as reasonType
        FROM stock_out so
        JOIN ingredients i ON so.ingredient_id = i.id
        LEFT JOIN stock_in si ON so.stock_in_id = si.id
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
          si.unit_cost as unit_cost,
          si.note as note,
          si.created_at as timestamp,
          si.batch_code as batchNo,
          si.expiry_date as expiryDate,
          'import' as reasonType
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

export const getIngredientBatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const batches = await db.query(
      `SELECT 
         si.id, 
         si.batch_code, 
         si.quantity, 
         si.remaining_quantity, 
         si.expiry_date, 
         si.unit_cost, 
         s.id as supplier_id,
         s.name as supplierName,
         si.note,
         si.created_at
       FROM stock_in si
       LEFT JOIN suppliers s ON si.supplier_id = s.id
       WHERE si.ingredient_id = ? AND si.remaining_quantity > 0
       ORDER BY si.expiry_date ASC, si.created_at ASC`,
      [id]
    );
    sendSuccess(res, batches, "Lấy danh sách lô thành công");
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
        `INSERT INTO stock_in (ingredient_id, batch_code, quantity, remaining_quantity, unit_cost, note, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [result.insertId, `LOT-INIT-${Date.now()}`, Number(stock), Number(stock), 0, 'Nhập kho ban đầu', 1]
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

export const wasteExpiredBatches = async (req: Request, res: Response): Promise<void> => {
  try {
    // Tìm các lô đã hết hạn và còn số lượng
    const expiredBatches = await db.query<any[]>(
      `SELECT id, ingredient_id, batch_code, remaining_quantity 
       FROM stock_in 
       WHERE expiry_date < CURDATE() AND remaining_quantity > 0`
    );

    if (expiredBatches.length === 0) {
      sendSuccess(res, null, "Không có hàng hóa nào hết hạn cần hủy.");
      return;
    }

    // Tiến hành hủy
    for (const batch of expiredBatches) {
      // 1. Ghi nhận vào stock_out
      await db.query(
        `INSERT INTO stock_out (ingredient_id, stock_in_id, quantity, reason, note, created_by) 
         VALUES (?, ?, ?, 'expired', ?, 1)`,
        [batch.ingredient_id, batch.id, batch.remaining_quantity, `Hủy tự động lô hết hạn: ${batch.batch_code}`]
      );
      // 2. Trừ remaining_quantity của lô về 0
      await db.query(`UPDATE stock_in SET remaining_quantity = 0 WHERE id = ?`, [batch.id]);
      // 3. Trừ tổng tồn của nguyên liệu
      await db.query(`UPDATE ingredients SET current_stock = current_stock - ? WHERE id = ?`, [batch.remaining_quantity, batch.ingredient_id]);
    }

    sendSuccess(res, { count: expiredBatches.length }, `Đã hủy thành công ${expiredBatches.length} lô hàng hết hạn.`);
  } catch (error) {
    console.error("Error wasting expired batches:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};
// ================================================================
// TASK 5 tích hợp ở đây: khi nhập hàng (type === "import") và
// req.body có isCredit=true + supplierId → tự cộng thẳng vào
// suppliers.total_debt. Cần FE gửi thêm 3 field này khi tick
// "Mua chịu" trong form nhập kho (isCredit, supplierId, unitCost).
// ================================================================
export const updateInventoryQuantity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { quantity, type, reasonOrSupplier, supplierId, isCredit, unitCost, expiryDate, batchNo } = req.body; // type: import | export | adjust

    const qty = Number(quantity);
    if (type === "import") {
      await db.query(`UPDATE ingredients SET current_stock = current_stock + ? WHERE id = ?`, [qty, id]);
      
      const parsedExpiryDate = expiryDate ? new Date(expiryDate).toISOString().split('T')[0] : null;
      const finalBatchCode = batchNo ? batchNo : `LOT-${id}-${Date.now()}`;

      await db.query(
        `INSERT INTO stock_in (ingredient_id, batch_code, quantity, remaining_quantity, unit_cost, supplier_id, expiry_date, note, created_by, is_credit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, finalBatchCode, qty, qty, Number(unitCost) || 0, supplierId || null, parsedExpiryDate, reasonOrSupplier || 'Nhập kho thủ công', 1, isCredit ? 1 : 0]
      );

      // TASK 5: Nhập hàng CHỊU (mua chịu) + có chọn NCC → cộng nợ cho NCC đó
      if (isCredit && supplierId) {
        const cost = qty * (Number(unitCost) || 0);
        if (cost > 0) {
          await db.query(
            `UPDATE suppliers SET total_debt = total_debt + ? WHERE id = ?`,
            [cost, supplierId]
          );
        }
      }
    } else if (type === "export" || type === "adjust") {
      await db.query(`UPDATE ingredients SET current_stock = current_stock - ? WHERE id = ?`, [qty, id]);

      let remainingToDeduct = qty;
      const batches = await db.query<any[]>(
        `SELECT id, remaining_quantity FROM stock_in 
         WHERE ingredient_id = ? AND remaining_quantity > 0 
           AND (expiry_date >= CURDATE() OR expiry_date IS NULL)
         ORDER BY expiry_date ASC, created_at ASC`,
        [id]
      );

      for (const batch of batches) {
        if (remainingToDeduct <= 0) break;
        const deductQty = Math.min(batch.remaining_quantity, remainingToDeduct);
        
        await db.query(
          `UPDATE stock_in SET remaining_quantity = remaining_quantity - ? WHERE id = ?`,
          [deductQty, batch.id]
        );

        await db.query(
          `INSERT INTO stock_out (ingredient_id, stock_in_id, quantity, reason, note, created_by) VALUES (?, ?, ?, ?, ?, ?)`,
          [id, batch.id, deductQty, 'other', reasonOrSupplier || 'Xuất/Điều chỉnh kho thủ công', 1]
        );

        remainingToDeduct -= deductQty;
      }

      if (remainingToDeduct > 0) {
        await db.query(
          `INSERT INTO stock_out (ingredient_id, quantity, reason, note, created_by) VALUES (?, ?, ?, ?, ?)`,
          [id, remainingToDeduct, 'other', reasonOrSupplier || 'Xuất/Điều chỉnh kho (âm/không rõ lô)', 1]
        );
      }
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

export const uploadExcel = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      sendError(res, "Không tìm thấy file tải lên", 400);
      return;
    }

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (!data || data.length === 0) {
      sendError(res, "File Excel trống hoặc sai định dạng", 400);
      return;
    }

    const createdBy = 1;

    for (const row of data) {
      const ingredientId = row["Mã nguyên liệu"] || row["Mã NL"] || row["ingredient_id"];
      const quantity = parseFloat(row["Số lượng nhập"] || row["quantity"] || 0);
      const unitCost = parseFloat(row["Đơn giá"] || row["unit_cost"] || 0);
      const supplierName = row["Nhà cung cấp"] || row["supplier"] || "";
      const note = row["Ghi chú"] || row["note"] || "Nhập từ file Excel";
      let expiryDate = row["Hạn sử dụng"] || row["expiry_date"] || null;
      if (expiryDate && typeof expiryDate === "number") {
          // Xử lý ngày từ excel (nếu là số)
          const date = new Date((expiryDate - (25567 + 2)) * 86400 * 1000);
          expiryDate = date.toISOString().split('T')[0];
      } else if (expiryDate && typeof expiryDate === "string") {
          // Nếu định dạng dd/mm/yyyy
          const parts = expiryDate.split("/");
          if (parts.length === 3) expiryDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }

      if (!ingredientId || isNaN(quantity) || quantity <= 0) {
        continue;
      }

      let supplierId = null;
      if (supplierName && typeof supplierName === 'string' && supplierName.trim() !== '') {
        const existingSupplier = await db.query(
          "SELECT id FROM suppliers WHERE name = ?",
          [supplierName.trim()]
        );

        if (existingSupplier && existingSupplier.length > 0) {
          supplierId = existingSupplier[0].id;
        } else {
          const newSupplier = await db.query(
            "INSERT INTO suppliers (name, total_debt) VALUES (?, 0)",
            [supplierName.trim()]
          );
          supplierId = newSupplier.insertId;
        }
      }

      await db.query(
        "INSERT INTO stock_in (ingredient_id, batch_code, quantity, remaining_quantity, unit_cost, supplier_id, expiry_date, note, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [ingredientId, `LOT-EXCEL-${Date.now()}-${Math.floor(Math.random()*1000)}`, quantity, quantity, unitCost, supplierId, expiryDate || null, note, createdBy]
      );

      await db.query(
        "UPDATE ingredients SET current_stock = current_stock + ? WHERE id = ?",
        [quantity, ingredientId]
      );
    }

    sendSuccess(res, null, "Tải file Excel và cập nhật kho thành công");
  } catch (error) {
    console.error("Error processing Excel file:", error);
    sendError(res, `Lỗi xử lý file Excel: ${(error as Error).message}`, 500);
  }
};

export const getSuppliers = async (req: Request, res: Response): Promise<void> => {
  try {
    const suppliers = await db.query(
      "SELECT id, name, contact, phone, address, main_ingredients as mainIngredients, total_debt FROM suppliers"
    );
    sendSuccess(res, suppliers, "Lấy danh sách nhà cung cấp thành công");
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    sendError(res, "Lỗi: " + (error as Error).message, 500);
  }
};

export const addSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, contact, phone, address, mainIngredients } = req.body;
    const result = await db.query(
      "INSERT INTO suppliers (name, contact, phone, address, main_ingredients) VALUES (?, ?, ?, ?, ?)",
      [name, contact, phone, address, mainIngredients]
    );
    sendSuccess(res, { id: result.insertId, ...req.body }, "Thêm nhà cung cấp thành công", 201);
  } catch (error) {
    console.error("Error adding supplier:", error);
    sendError(res, "Lỗi: " + (error as Error).message, 500);
  }
};

export const updateSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, contact, phone, address, mainIngredients } = req.body;
    await db.query(
      "UPDATE suppliers SET name = ?, contact = ?, phone = ?, address = ?, main_ingredients = ? WHERE id = ?",
      [name, contact, phone, address, mainIngredients, id]
    );
    sendSuccess(res, { id, ...req.body }, "Cập nhật nhà cung cấp thành công");
  } catch (error) {
    console.error("Error updating supplier:", error);
    sendError(res, "Lỗi: " + (error as Error).message, 500);
  }
};

export const deleteSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM suppliers WHERE id = ?", [id]);
    sendSuccess(res, { id }, "Xóa nhà cung cấp thành công");
  } catch (error) {
    console.error("Error deleting supplier:", error);
    sendError(res, "Lỗi: " + (error as Error).message, 500);
  }
};

export const getAllBatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const batches = await db.query(
      `SELECT 
         si.id, 
         si.batch_code as batchNo, 
         si.remaining_quantity as quantity, 
         si.expiry_date as expiryDate, 
         i.name as ingredientName,
         i.unit
       FROM stock_in si
       JOIN ingredients i ON si.ingredient_id = i.id
       WHERE si.remaining_quantity > 0
       ORDER BY si.expiry_date ASC`
    );
    sendSuccess(res, batches, "Lấy tất cả lô hàng thành công");
  } catch (error) {
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};