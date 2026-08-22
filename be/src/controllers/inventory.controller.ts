import { Request, Response } from "express";
const xlsx = require("xlsx");
import * as db from "../utils/db";
import { sendError, sendSuccess } from "../utils/response";

export const getAllInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const pageStr = req.query.page as string;
    const limitStr = req.query.limit as string;

    if (pageStr && limitStr) {
      const page = parseInt(pageStr) || 1;
      const limit = parseInt(limitStr) || 10;
      const offset = (page - 1) * limit;

      const countResult = await db.query(`SELECT COUNT(*) as total FROM ingredients WHERE is_deleted = 0`);
      const totalItems = countResult[0].total || 0;
      const totalPages = Math.ceil(totalItems / limit);

      const items = await db.query(`
        SELECT 
          id, 
          name,
          name as itemName,
          current_stock as stock, 
          unit, 
          min_stock as threshold,
          COALESCE(
            (SELECT SUM(unit_cost * remaining_quantity) / NULLIF(SUM(remaining_quantity), 0)
             FROM stock_in WHERE ingredient_id = ingredients.id AND remaining_quantity > 0 AND unit_cost > 0),
            (SELECT unit_cost FROM stock_in WHERE ingredient_id = ingredients.id AND unit_cost > 0 ORDER BY created_at DESC LIMIT 1),
            0
          ) AS avgCost
        FROM ingredients 
        WHERE is_deleted = 0
        LIMIT ? OFFSET ?
      `, [limit, offset]);
      sendSuccess(res, { currentPage: page, totalPages, totalItems, data: items }, "Lấy danh sách kho thành công");
    } else {
      const items = await db.query(`
        SELECT 
          id, 
          name,
          name as itemName,
          current_stock as stock, 
          unit, 
          min_stock as threshold,
          COALESCE(
            (SELECT SUM(unit_cost * remaining_quantity) / NULLIF(SUM(remaining_quantity), 0)
             FROM stock_in WHERE ingredient_id = ingredients.id AND remaining_quantity > 0 AND unit_cost > 0),
            (SELECT unit_cost FROM stock_in WHERE ingredient_id = ingredients.id AND unit_cost > 0 ORDER BY created_at DESC LIMIT 1),
            0
          ) AS avgCost
        FROM ingredients 
        WHERE is_deleted = 0
      `);
      sendSuccess(res, items, "Lấy danh sách kho thành công");
    }
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
          0 as paidAmount,
          0 as paid_amount,
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
          si.paid_amount as paidAmount,
          si.paid_amount as paid_amount,
          si.supplier_id as supplierId,
          'import' as reasonType
        FROM stock_in si
        JOIN ingredients i ON si.ingredient_id = i.id
        LEFT JOIN suppliers s ON si.supplier_id = s.id
        WHERE si.batch_code NOT LIKE 'LOT-ADJ-%'
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
    const { quantity, type, reasonOrSupplier, supplierId, isCredit, unitCost, expiryDate, batchNo, reasonType, status, draftTxId, ingredientName, unit, paidAmount, dueDate, paymentProofImage, proofImage } = req.body; // type: import | export | adjust
    const finalProofImage = proofImage || paymentProofImage || req.body.paymentProofImage || null;

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
      // Bỏ qua các record [LƯU TẠM] và [HOÀN THÀNH] vì chúng sẽ bị xóa/thay thế khi nhập kho chính thức
      if (batchNo && !isDraft) {
        const existingBatch = await db.query<any[]>(
          `SELECT id, created_at FROM stock_in WHERE batch_code = ? AND ingredient_id = ? AND note NOT LIKE '%[LƯU TẠM]%' AND note NOT LIKE '%[HOÀN THÀNH]%' AND created_at >= NOW() - INTERVAL 30 DAY`,
          [batchNo, ingredientIdNum]
        );
        if (existingBatch && existingBatch.length > 0) {
          sendError(res, `Cảnh báo: Mã lô "${batchNo}" đã tồn tại trong kho (được nhập gần đây)! Vui lòng kiểm tra lại mã lô.`, 400);
          return;
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

      const itemCost = qty * (Number(unitCost) || 0);
      const itemPaid = paidAmount !== undefined && paidAmount !== null && Number(paidAmount) >= 0 ? Number(paidAmount) : (isCredit ? 0 : itemCost);
      const remainingDebt = isCredit ? Math.max(0, itemCost - itemPaid) : 0;

      await db.query(
        `INSERT INTO stock_in (ingredient_id, batch_code, quantity, remaining_quantity, unit_cost, supplier_id, expiry_date, note, created_by, is_credit, paid_amount, due_date, proof_image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [ingredientIdNum, finalBatchCode, qty, qty, Number(unitCost) || 0, supplierId || null, parsedExpiryDate, noteWithPrefix || 'Nhập kho thủ công', 1, isCredit ? 1 : 0, itemPaid, req.body.dueDate || null, finalProofImage]
      );

      // TASK 5: Nhập hàng CHỊU + có chọn NCC → cộng số nợ THỰC TẾ CÒN LẠI cho NCC đó (CHỈ KHI KÍCH HOẠT LƯU THẬT)
      if (isCredit && supplierId && (!isDraft && !isCompleted) && remainingDebt > 0) {
        await db.query(
          `UPDATE suppliers SET total_debt = total_debt + ? WHERE id = ?`,
          [remainingDebt, supplierId]
        );
      }

      // Auto-update supplier's main_ingredients with newly imported ingredient name
      if (supplierId && (!isDraft && !isCompleted)) {
        try {
          const ingRows = await db.query<any[]>(`SELECT name FROM ingredients WHERE id = ?`, [ingredientIdNum]);
          if (ingRows.length > 0) {
            const ingName = ingRows[0].name;
            const supRows = await db.query<any[]>(`SELECT main_ingredients FROM suppliers WHERE id = ?`, [supplierId]);
            if (supRows.length > 0) {
              const existing = (supRows[0].main_ingredients || "").split(",").map((s: string) => s.trim()).filter(Boolean);
              if (!existing.some((e: string) => e.toLowerCase() === ingName.toLowerCase())) {
                const updated = [...existing, ingName].join(", ");
                await db.query(`UPDATE suppliers SET main_ingredients = ? WHERE id = ?`, [updated, supplierId]);
              }
            }
          }
        } catch (e) { /* non-critical */ }
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

      // Nếu actual < system → ghi stock_out waste để cân bằng hụt
      // Nếu actual > system → ghi stock_in để cân bằng thừa
      // Giá trị tính theo giá bình quân gia quyền (Weighted Average Cost) của các lô còn hàng
      const diff = actual - system_stock;

      // Tính giá bình quân gia quyền: Tổng giá trị các lô còn lại / Tổng số lượng còn lại
      const avgCostRow = await db.query(
        `SELECT 
           COALESCE(
             SUM(unit_cost * remaining_quantity) / NULLIF(SUM(remaining_quantity), 0),
             (SELECT unit_cost FROM stock_in WHERE ingredient_id = ? AND unit_cost > 0 ORDER BY created_at DESC LIMIT 1)
           ) AS avgCost
         FROM stock_in 
         WHERE ingredient_id = ? AND remaining_quantity > 0 AND unit_cost > 0`,
        [ingredient_id, ingredient_id]
      );
      const weightedAvgCost = avgCostRow.length > 0 && avgCostRow[0].avgCost ? Number(avgCostRow[0].avgCost) : 0;

      if (diff < 0) {
        await db.query(
          `INSERT INTO stock_out (ingredient_id, quantity, reason, note, created_by)
           VALUES (?, ?, 'waste', ?, ?)`,
          [ingredient_id, Math.abs(diff), `Chênh lệch kiểm kê kho (Hụt) - Đơn giá BQ: ${Math.round(weightedAvgCost).toLocaleString()}đ`, userId]
        );
      } else if (diff > 0) {
        await db.query(
          `INSERT INTO stock_in (ingredient_id, batch_code, quantity, remaining_quantity, unit_cost, supplier_id, expiry_date, note, created_by)
           VALUES (?, ?, ?, ?, ?, NULL, NULL, 'Cân bằng kho: Nhập điều chỉnh hàng thừa (Giá BQ gia quyền)', ?)`,
          [ingredient_id, `LOT-ADJ-${Date.now()}`, diff, diff, weightedAvgCost, userId]
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
    const { amount, method, note, proofImage, ticketCode } = req.body;
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
    const payAmount = Number(amount);

    // 1. Nếu có ticketCode, cập nhật paid_amount cho các bản ghi stock_in của phiếu đó
    if (ticketCode) {
      const slipStockInRows = await db.query<any[]>(
        `SELECT id, quantity, unit_cost, COALESCE(paid_amount, 0) as paid_amount 
         FROM stock_in 
         WHERE note LIKE ? OR batch_code = ?`,
        [`%[SLIP:${ticketCode}]%`, ticketCode]
      );

      let remainingPay = payAmount;
      for (const si of slipStockInRows) {
        if (remainingPay <= 0) break;
        const itemTotal = Number(si.quantity) * Number(si.unit_cost);
        const itemPaid = Number(si.paid_amount);
        const itemDebt = Math.max(0, itemTotal - itemPaid);
        const payForItem = Math.min(itemDebt, remainingPay);
        if (payForItem > 0) {
          await db.query(`UPDATE stock_in SET paid_amount = COALESCE(paid_amount, 0) + ? WHERE id = ?`, [payForItem, si.id]);
          remainingPay -= payForItem;
        }
      }

      if (proofImage) {
        await db.query(
          `UPDATE stock_in SET proof_image = ? 
           WHERE (note LIKE ? OR batch_code = ?) AND (proof_image IS NULL OR proof_image = '')`,
          [proofImage, `%[SLIP:${ticketCode}]%`, ticketCode]
        );
      }
    } else {
      // Nếu không truyền ticketCode, phân bổ thanh toán cho các phiếu nợ cũ nhất của NCC này
      const openSlips = await db.query<any[]>(
        `SELECT id, quantity, unit_cost, COALESCE(paid_amount, 0) as paid_amount
         FROM stock_in
         WHERE supplier_id = ? AND is_credit = 1 AND (quantity * unit_cost) > COALESCE(paid_amount, 0)
         ORDER BY created_at ASC`,
        [id]
      );

      let remainingPay = payAmount;
      for (const si of openSlips) {
        if (remainingPay <= 0) break;
        const itemTotal = Number(si.quantity) * Number(si.unit_cost);
        const itemPaid = Number(si.paid_amount);
        const itemDebt = Math.max(0, itemTotal - itemPaid);
        const payForItem = Math.min(itemDebt, remainingPay);
        if (payForItem > 0) {
          await db.query(`UPDATE stock_in SET paid_amount = COALESCE(paid_amount, 0) + ? WHERE id = ?`, [payForItem, si.id]);
          remainingPay -= payForItem;
        }
      }
    }

    // 2. Đồng bộ lại total_debt thực tế của NCC từ stock_in
    const realDebtRows = await db.query<any[]>(
      `SELECT SUM(GREATEST(0, (si.quantity * si.unit_cost) - COALESCE(si.paid_amount, 0))) as totalRealDebt
       FROM stock_in si
       WHERE si.supplier_id = ? AND si.is_credit = 1
         AND (si.note IS NULL OR (si.note NOT LIKE '%[LƯU TẠM]%' AND si.note NOT LIKE '%[HOÀN THÀNH]%'))`,
      [id]
    );
    const newSupplierDebt = Math.max(0, Number(realDebtRows[0]?.totalRealDebt || 0));
    await db.query(`UPDATE suppliers SET total_debt = ? WHERE id = ?`, [newSupplierDebt, id]);

    const finalNote = note ? note : (ticketCode ? `Thanh toán công nợ phiếu [${ticketCode}]` : `Thanh toán công nợ NCC ${supplier.name}`);

    // 3. Ghi lịch sử thanh toán nợ
    const payRes = await db.query(
      `INSERT INTO debt_payments (supplier_id, amount, remaining_debt, method, note, paid_by, proof_image)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, payAmount, newSupplierDebt, method, finalNote, userId, proofImage || null]
    );

    sendSuccess(
      res,
      {
        paymentId: payRes.insertId,
        supplierId: Number(id),
        supplierName: supplier.name,
        ticketCode: ticketCode || null,
        paid: payAmount,
        remaining: newSupplierDebt,
        method,
        note: finalNote,
        paidAt: new Date().toISOString(),
        proofImage: proofImage || null,
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
      SELECT dp.id, dp.amount, dp.remaining_debt, dp.method, dp.note, dp.paid_at,
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
    const suppliers = await db.query(`
      SELECT 
        s.id, 
        s.name, 
        s.contact, 
        s.phone, 
        s.address, 
        s.main_ingredients as mainIngredients, 
        COALESCE(
          (
            SELECT SUM(GREATEST(0, (si.quantity * si.unit_cost) - COALESCE(si.paid_amount, 0)))
            FROM stock_in si
            WHERE si.supplier_id = s.id 
              AND si.is_credit = 1
              AND (si.note IS NULL OR (si.note NOT LIKE '%[LƯU TẠM]%' AND si.note NOT LIKE '%[HOÀN THÀNH]%'))
          ),
          s.total_debt, 
          0
        ) as total_debt
      FROM suppliers s
      ORDER BY s.id ASC
    `);
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

// PATCH /v1/inventory/debts/:ticketCode/due-date
export const updateDebtDueDate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ticketCode } = req.params;
    const { newDueDate, reason, supplierId } = req.body;
    const userId = (req as any).user?.id || 1;

    if (!newDueDate) {
      sendError(res, "Vui lòng chọn hạn thanh toán mới", 400);
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    if (newDueDate < todayStr) {
      sendError(res, "Hạn thanh toán mới không được ở trong quá khứ (phải từ hôm nay trở đi)!", 400);
      return;
    }

    // 1. Find existing stock_in records for this ticketCode
    const existing = await db.query<any[]>(
      `SELECT id, supplier_id, due_date FROM stock_in 
       WHERE note LIKE ? OR batch_code = ?`,
      [`%[SLIP:${ticketCode}]%`, ticketCode]
    );

    if (existing.length === 0) {
      sendError(res, "Không tìm thấy phiếu nhập có mã này", 404);
      return;
    }

    const oldDueDate = existing[0].due_date ? new Date(existing[0].due_date).toISOString().split("T")[0] : null;
    const resolvedSupplierId = supplierId || existing[0].supplier_id;

    // 2. Update stock_in due_date
    await db.query(
      `UPDATE stock_in SET due_date = ? 
       WHERE note LIKE ? OR batch_code = ?`,
      [newDueDate, `%[SLIP:${ticketCode}]%`, ticketCode]
    );

    // 3. Insert history record
    await db.query(
      `INSERT INTO supplier_debt_due_history (ticket_code, supplier_id, old_due_date, new_due_date, reason, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ticketCode, resolvedSupplierId, oldDueDate, newDueDate, reason || "Cập nhật / chốt hạn thanh toán", userId]
    );

    sendSuccess(res, { ticketCode, oldDueDate, newDueDate }, "Cập nhật hạn thanh toán thành công");
  } catch (error) {
    console.error("Error updating debt due date:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

// GET /v1/inventory/debts/:ticketCode/history
export const getDebtDueHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ticketCode } = req.params;
    const history = await db.query<any[]>(
      `SELECT h.id, h.ticket_code, h.supplier_id, h.old_due_date, h.new_due_date, h.reason, h.updated_at,
              COALESCE(u.full_name, 'Quản lý') as updated_by_name
       FROM supplier_debt_due_history h
       LEFT JOIN users u ON h.updated_by = u.id
       WHERE h.ticket_code = ?
       ORDER BY h.updated_at DESC`,
      [ticketCode]
    );
    sendSuccess(res, history, "Lấy lịch sử đổi hạn thành công");
  } catch (error) {
    console.error("Error fetching debt due history:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};

// DELETE /v1/inventory/debt-payments/:id — Xóa mềm lịch sử giao dịch thanh toán / trả nợ
export const deleteDebtPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      sendError(res, "ID giao dịch không hợp lệ", 400);
      return;
    }

    const numericId = parseInt(id.replace(/\D/g, ""), 10);

    if (id.startsWith("TH-NCC-") || id.startsWith("RET-")) {
      // Soft delete return record
      await db.query(`UPDATE stock_out SET note = CONCAT('[DELETED] ', COALESCE(note, '')) WHERE id = ?`, [numericId]);
    } else if (id.startsWith("PN-TT-")) {
      // Hide upfront payment row
      const ticketCode = id.replace("PN-TT-", "");
      await db.query(
        `UPDATE stock_in SET note = CONCAT(COALESCE(note, ''), ' [HIDE_PAYMENT]') 
         WHERE note LIKE ? OR batch_code = ?`,
        [`%[SLIP:${ticketCode}]%`, ticketCode]
      );
    } else {
      // Regular debt_payments
      await db.query(`UPDATE debt_payments SET is_deleted = 1 WHERE id = ?`, [numericId]);
    }

    sendSuccess(res, { id }, "Đã xóa bản ghi lịch sử giao dịch");
  } catch (error) {
    console.error("Error deleting debt payment:", error);
    sendError(res, `Lỗi: ${(error as Error).message}`, 500);
  }
};