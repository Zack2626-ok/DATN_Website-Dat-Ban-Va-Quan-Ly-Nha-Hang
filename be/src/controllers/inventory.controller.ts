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
          so.ingredient_id as ingredientId,
          i.name as ingredientName,
          so.quantity as quantity,
          i.unit as unit,
          so.note as reasonOrSupplier,
          COALESCE(si.unit_cost, 0) as unit_cost,
          so.note as note,
          so.created_at as timestamp,
          si.batch_code as batchNo,
          si.expiry_date as expiryDate,
          COALESCE(si.is_credit, 0) as isCredit,
          COALESCE(si.supplier_id, 0) as supplierId,
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
          si.ingredient_id as ingredientId,
          i.name as ingredientName,
          si.quantity as quantity,
          i.unit as unit,
          COALESCE(si.note, s.name) as reasonOrSupplier,
          si.unit_cost as unit_cost,
          si.note as note,
          si.created_at as timestamp,
          si.batch_code as batchNo,
          si.expiry_date as expiryDate,
          si.is_credit as isCredit,
          si.supplier_id as supplierId,
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
    const { quantity, type, reasonOrSupplier, supplierId, isCredit, unitCost, expiryDate, batchNo, reasonType, status, draftTxId, ingredientName, unit } = req.body; // type: import | export | adjust

    // Resolve non-numeric/TEMP IDs safely
    let ingredientIdNum = Number(id);
    let resolvedIngName = (ingredientName && String(ingredientName).trim()) ? String(ingredientName).trim() : "Nguyên liệu mới";

    if (isNaN(ingredientIdNum) || ingredientIdNum <= 0) {
      const existing = await db.query<any[]>("SELECT id, name FROM ingredients WHERE LOWER(name) = LOWER(?)", [resolvedIngName]);
      if (existing.length > 0) {
        ingredientIdNum = existing[0].id;
        resolvedIngName = existing[0].name;
      } else {
        const newIng = await db.query<any>(
          "INSERT INTO ingredients (name, current_stock, unit, min_stock) VALUES (?, 0, ?, 5)",
          [resolvedIngName, unit || "kg"]
        );
        ingredientIdNum = newIng.insertId;
      }
    } else {
      const existing = await db.query<any[]>("SELECT name FROM ingredients WHERE id = ?", [ingredientIdNum]);
      if (existing.length > 0) {
        resolvedIngName = existing[0].name;
      }
    }

    // Auto-link ingredient to supplier's main_ingredients (ONLY when completing import into stock, not draft)
    if (type === "import" && supplierId && resolvedIngName && status !== "draft") {
      try {
        const supplierRows = await db.query<any[]>(
          "SELECT main_ingredients FROM suppliers WHERE id = ?",
          [supplierId]
        );
        if (supplierRows.length > 0) {
          const currentIngredients: string = supplierRows[0].main_ingredients || "";
          const existingList = currentIngredients
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean);
          const alreadyLinked = existingList.some(
            (s: string) => s.toLowerCase() === resolvedIngName.toLowerCase()
          );
          if (!alreadyLinked) {
            const updatedList = [...existingList, resolvedIngName].join(", ");
            await db.query(
              "UPDATE suppliers SET main_ingredients = ? WHERE id = ?",
              [updatedList, supplierId]
            );
          }
        }
      } catch (linkErr) {
        console.warn("Could not auto-link ingredient to supplier:", linkErr);
      }
    }

    const qty = Number(quantity);
    const isDraft = status === "draft";
    const isCompleted = status === "completed";
    const cleanReason = (reasonOrSupplier || "").replace(/^\[LƯU TẠM\]\s*/g, "").replace(/^\[HOÀN THÀNH\]\s*/g, "").trim();
    const noteWithPrefix = isDraft ? `[LƯU TẠM] ${cleanReason}` : isCompleted ? `[HOÀN THÀNH] ${cleanReason}` : cleanReason;

    // Cleanup previous draft transaction if editing an existing draft slip
    if (draftTxId) {
      const cleanDraftId = String(draftTxId).replace(/^(IN|OUT|in_|out_)-?/i, "");
      if (cleanDraftId) {
        const oldStockIn = await db.query<any[]>("SELECT id, ingredient_id, quantity, note FROM stock_in WHERE id = ?", [cleanDraftId]);
        if (oldStockIn.length > 0) {
          const wasOldDraftOrCompleted = (oldStockIn[0].note || "").includes("[LƯU TẠM]") || (oldStockIn[0].note || "").includes("[HOÀN THÀNH]");
          if (!wasOldDraftOrCompleted) {
            await db.query("UPDATE ingredients SET current_stock = GREATEST(0, current_stock - ?) WHERE id = ?", [oldStockIn[0].quantity, oldStockIn[0].ingredient_id]);
          }
          await db.query("DELETE FROM stock_in WHERE id = ?", [cleanDraftId]);
        }
        const oldStockOut = await db.query<any[]>("SELECT id, ingredient_id, quantity, note FROM stock_out WHERE id = ?", [cleanDraftId]);
        if (oldStockOut.length > 0) {
          const wasOldDraftOrCompleted = (oldStockOut[0].note || "").includes("[LƯU TẠM]") || (oldStockOut[0].note || "").includes("[HOÀN THÀNH]");
          if (!wasOldDraftOrCompleted) {
            await db.query("UPDATE ingredients SET current_stock = current_stock + ? WHERE id = ?", [oldStockOut[0].quantity, oldStockOut[0].ingredient_id]);
          }
          await db.query("DELETE FROM stock_out WHERE id = ?", [cleanDraftId]);
        }
      }
    }

    if (type === "import") {
      // Validate unit if provided
      const unitCheck = req.body.unit || req.body.displayUnit;
      if (unitCheck && typeof unitCheck === "string" && unitCheck.trim() !== "") {
        const cleanUnit = unitCheck.trim().toLowerCase();
        const ALLOWED_UNITS = [
          "kg", "g", "lít", "lit", "ml", "bao", "hộp", "hop", "chai", "lon",
          "gói", "goi", "túi", "tui", "bó", "bo", "quả", "qua", "trái", "trai",
          "củ", "cu", "con", "khay", "bình", "binh", "hũ", "hu", "vỉ", "vi",
          "bánh", "banh", "cuộn", "cuon"
        ];
        if (!ALLOWED_UNITS.includes(cleanUnit)) {
          sendError(res, `Đơn vị tính "${unitCheck}" không hợp lệ! Đơn vị phải là (kg, g, lít, ml, bao, hộp, chai...).`, 400);
          return;
        }
      }

      // Check duplicate batch code in recent stock_in entries (within 30 days)
      if (batchNo && !isDraft) {
        const existingBatch = await db.query<any[]>(
          `SELECT id, created_at FROM stock_in WHERE batch_code = ? AND ingredient_id = ? AND note NOT LIKE '%[LƯU TẠM]%' AND created_at >= NOW() - INTERVAL 30 DAY`,
          [batchNo, ingredientIdNum]
        );
        if (existingBatch && existingBatch.length > 0) {
          sendError(res, `Cảnh báo: Mã lô "${batchNo}" đã tồn tại trong kho (được nhập gần đây)! Vui lòng kiểm tra lại mã lô.`, 400);
          return;
        }
      }

      // Check duplicate import today (same ingredient & supplier within today)
      if (ingredientIdNum && supplierId && !isDraft) {
        const currentTicketCode = (reasonOrSupplier || "").match(/\[SLIP:([^\]]+)\]/)?.[1];
        const todayDup = await db.query<any[]>(
          `SELECT id, note, created_at FROM stock_in 
           WHERE ingredient_id = ? AND supplier_id = ? AND created_at >= CURDATE()`,
          [ingredientIdNum, supplierId]
        );

        if (todayDup && todayDup.length > 0) {
          for (const dup of todayDup) {
            const dupSlip = (dup.note || "").match(/\[SLIP:([^\]]+)\]/)?.[1];
            if (dupSlip && currentTicketCode && dupSlip === currentTicketCode) continue;
            
            const foundCode = dupSlip || `PN${new Date().getFullYear()}-${dup.id}`;
            sendError(res, `Phiếu nhập kho này bị trùng lặp dữ liệu với phiếu [${foundCode}] đã khởi tạo trong ngày hôm nay!`, 400);
            return;
          }
        }
      }

      // ONLY update current_stock in ingredients if it is NOT a draft and NOT completed
      if (!isDraft && !isCompleted) {
        await db.query(`UPDATE ingredients SET current_stock = current_stock + ? WHERE id = ?`, [qty, ingredientIdNum]);
      }
      
      let parsedExpiryDate: string | null = null;
      if (expiryDate && String(expiryDate).trim() !== "") {
        const expStr = String(expiryDate).trim();
        if (expStr.includes("/")) {
          const parts = expStr.split("/");
          if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            parsedExpiryDate = `${year}-${month}-${day}`;
          }
        } else {
          const d = new Date(expStr);
          if (!isNaN(d.getTime())) {
            parsedExpiryDate = d.toISOString().split('T')[0];
          }
        }
      }

      if (parsedExpiryDate) {
        const expDate = new Date(parsedExpiryDate);
        expDate.setHours(23, 59, 59);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expDate.getTime() < today.getTime()) {
          sendError(res, `Hạn sử dụng (${parsedExpiryDate}) không được ở trong quá khứ khi nhập kho!`, 400);
          return;
        }
      }
      const finalBatchCode = batchNo ? batchNo : `LOT-${ingredientIdNum}-${Date.now()}`;

      await db.query(
        `INSERT INTO stock_in (ingredient_id, batch_code, quantity, remaining_quantity, unit_cost, supplier_id, expiry_date, note, created_by, is_credit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [ingredientIdNum, finalBatchCode, qty, qty, Number(unitCost) || 0, supplierId || null, parsedExpiryDate, noteWithPrefix || 'Nhập kho thủ công', 1, isCredit ? 1 : 0]
      );

      // TASK 5: Nhập hàng CHỊU (mua chịu) + có chọn NCC → cộng nợ cho NCC đó (CHỈ KHI KÍCH HOẠT LƯU THẬT)
      if (isCredit && supplierId && (!isDraft && !isCompleted)) {
        const cost = qty * (Number(unitCost) || 0);
        if (cost > 0) {
          await db.query(
            `UPDATE suppliers SET total_debt = total_debt + ? WHERE id = ?`,
            [cost, supplierId]
          );
        }
      }
    } else if (type === "export" || type === "adjust" || type === "waste") {
      const isReturnToSupplier = reasonType === "return_to_supplier" || reasonType === "return_supplier" || (reasonOrSupplier || "").toLowerCase().includes("trả ncc");

      // ONLY update current_stock in ingredients if it is NOT a draft and NOT completed
      if (!isDraft && !isCompleted) {
        await db.query(`UPDATE ingredients SET current_stock = GREATEST(0, current_stock - ?) WHERE id = ?`, [qty, ingredientIdNum]);
      }

      let remainingToDeduct = qty;
      let batches: any[] = [];

      if (batchNo) {
        batches = await db.query<any[]>(
          `SELECT id, remaining_quantity FROM stock_in 
           WHERE ingredient_id = ? AND batch_code = ? AND remaining_quantity > 0`,
          [ingredientIdNum, batchNo]
        );
      }

      if (!batches || batches.length === 0) {
        batches = await db.query<any[]>(
          `SELECT id, remaining_quantity FROM stock_in 
           WHERE ingredient_id = ? AND remaining_quantity > 0 
           ORDER BY expiry_date ASC, created_at ASC`,
          [ingredientIdNum]
        );
      }

      const rawReason = reasonType || (type === "waste" ? "expired" : (reasonOrSupplier && (reasonOrSupplier.includes("Trả hàng") || reasonOrSupplier.includes("trả lại")) ? 'return_to_supplier' : 'other'));
      const exportReason = (rawReason === "return_supplier" || rawReason === "return_supplier_export") ? "return_to_supplier" : rawReason;

      for (const batch of batches) {
        if (remainingToDeduct <= 0) break;
        const deductQty = Math.min(batch.remaining_quantity, remainingToDeduct);
        
        if (!isDraft && !isCompleted) {
          await db.query(
            `UPDATE stock_in SET remaining_quantity = GREATEST(0, remaining_quantity - ?) WHERE id = ?`,
            [deductQty, batch.id]
          );
        }

        await db.query(
          `INSERT INTO stock_out (ingredient_id, stock_in_id, quantity, reason, note, created_by) VALUES (?, ?, ?, ?, ?, ?)`,
          [ingredientIdNum, batch.id, deductQty, exportReason, noteWithPrefix || 'Xuất/Điều chỉnh/Tiêu hủy kho thủ công', 1]
        );

        remainingToDeduct -= deductQty;
      }

      if (remainingToDeduct > 0) {
        await db.query(
          `INSERT INTO stock_out (ingredient_id, quantity, reason, note, created_by) VALUES (?, ?, ?, ?, ?)`,
          [ingredientIdNum, remainingToDeduct, exportReason, noteWithPrefix || 'Xuất/Điều chỉnh/Tiêu hủy kho (âm/không rõ lô)', 1]
        );
      }

      // TASK: Trả hàng NCC + Giảm trừ công nợ (deduct_credit)
      // Khi isCredit=true + reason=return_to_supplier + có supplierId → trừ nợ NCC
      if (
        exportReason === "return_to_supplier" &&
        isCredit &&
        supplierId &&
        !isDraft && !isCompleted
      ) {
        const returnAmount = qty * (Number(unitCost) || 0);
        if (returnAmount > 0) {
          await db.query(
            `UPDATE suppliers SET total_debt = GREATEST(0, total_debt - ?) WHERE id = ?`,
            [returnAmount, supplierId]
          );
        }
      }
    }

    const updated = await db.query(`SELECT current_stock as stock FROM ingredients WHERE id = ?`, [ingredientIdNum]);
    sendSuccess(res, updated[0] || { stock: 0 }, "Cập nhật số lượng thành công");
  } catch (error) {
    console.error("Error in updateInventoryQuantity:", error);
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
    const { amount, method, note, proofImage } = req.body;
    const userId = (req as any).user?.id || null;

    if (!amount || Number(amount) <= 0) {
      sendError(res, "Số tiền thanh toán phải lớn hơn 0", 400);
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
    const currentDebt = Number(supplier.total_debt || 0);

    if (Number(amount) > currentDebt) {
      sendError(res, `Số tiền thanh toán (${Number(amount).toLocaleString('vi-VN')} đ) không được lớn hơn tổng số nợ hiện tại (${currentDebt.toLocaleString('vi-VN')} đ)`, 400);
      return;
    }

    const payAmount = Number(amount);

    // Trừ nợ
    await db.query(
      `UPDATE suppliers SET total_debt = GREATEST(0, total_debt - ?) WHERE id = ?`,
      [payAmount, id]
    );

    // Ghi lịch sử thanh toán nợ
    const payRes = await db.query(
      `INSERT INTO debt_payments (supplier_id, amount, method, note, paid_by, proof_image)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, payAmount, method, note || null, userId, proofImage || null]
    );

    // Lấy nợ còn lại
    const updated = await db.query(`SELECT total_debt FROM suppliers WHERE id = ?`, [id]);

    sendSuccess(
      res,
      {
        paymentId: payRes.insertId,
        supplierId: Number(id),
        supplierName: supplier.name,
        paid: payAmount,
        remaining: Number(updated[0].total_debt),
        method,
        note: note || "",
        paidAt: new Date().toISOString(),
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
             COALESCE(u.full_name, 'Hệ thống') AS paid_by_name
      FROM debt_payments dp
      LEFT JOIN users u ON dp.paid_by = u.id
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

export const deleteInventoryTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const cleanId = String(id).replace(/^(IN|OUT|in_|out_)-?/i, "");
    if (!cleanId) {
      sendError(res, "Mã giao dịch không hợp lệ", 400);
      return;
    }

    const oldStockIn = await db.query<any[]>("SELECT id, ingredient_id, quantity, note FROM stock_in WHERE id = ?", [cleanId]);
    if (oldStockIn.length > 0) {
      const wasDraft = (oldStockIn[0].note || "").includes("[LƯU TẠM]");
      if (!wasDraft) {
        await db.query("UPDATE ingredients SET current_stock = GREATEST(0, current_stock - ?) WHERE id = ?", [oldStockIn[0].quantity, oldStockIn[0].ingredient_id]);
      }
      await db.query("DELETE FROM stock_in WHERE id = ?", [cleanId]);
    }

    const oldStockOut = await db.query<any[]>("SELECT id, ingredient_id, quantity, note FROM stock_out WHERE id = ?", [cleanId]);
    if (oldStockOut.length > 0) {
      const wasDraft = (oldStockOut[0].note || "").includes("[LƯU TẠM]");
      if (!wasDraft) {
        await db.query("UPDATE ingredients SET current_stock = current_stock + ? WHERE id = ?", [oldStockOut[0].quantity, oldStockOut[0].ingredient_id]);
      }
      await db.query("DELETE FROM stock_out WHERE id = ?", [cleanId]);
    }

    sendSuccess(res, { id }, "Xóa phiếu thành công");
  } catch (error) {
    console.error("Error deleting inventory transaction:", error);
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
         COALESCE(si.unit_cost, 0) as unitCost,
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