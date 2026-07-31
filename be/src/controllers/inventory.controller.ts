import { Request, Response } from "express";
import * as xlsx from "xlsx";
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
          si.unit_cost as unit_cost,
          si.note as note,
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

export const uploadExcel = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      sendError(res, "Không tìm thấy file tải lên", 400);
      return;
    }

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json<any>(sheet);

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
        "INSERT INTO stock_in (ingredient_id, quantity, unit_cost, supplier_id, note, created_by) VALUES (?, ?, ?, ?, ?, ?)",
        [ingredientId, quantity, unitCost, supplierId, note, createdBy]
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
    sendSuccess(res, suppliers, "L?y danh s�ch nh� cung c?p th�nh c�ng");
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    sendError(res, "L?i: " + (error as Error).message, 500);
  }
};

export const addSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, contact, phone, address, mainIngredients } = req.body;
    const result = await db.query(
      "INSERT INTO suppliers (name, contact, phone, address, main_ingredients) VALUES (?, ?, ?, ?, ?)",
      [name, contact, phone, address, mainIngredients]
    );
    sendSuccess(res, { id: result.insertId, ...req.body }, "Th�m nh� cung c?p th�nh c�ng", 201);
  } catch (error) {
    console.error("Error adding supplier:", error);
    sendError(res, "L?i: " + (error as Error).message, 500);
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
    sendSuccess(res, { id, ...req.body }, "C?p nh?t nh� cung c?p th�nh c�ng");
  } catch (error) {
    console.error("Error updating supplier:", error);
    sendError(res, "L?i: " + (error as Error).message, 500);
  }
};

export const deleteSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM suppliers WHERE id = ?", [id]);
    sendSuccess(res, { id }, "X�a nh� cung c?p th�nh c�ng");
  } catch (error) {
    console.error("Error deleting supplier:", error);
    sendError(res, "L?i: " + (error as Error).message, 500);
  }
};
