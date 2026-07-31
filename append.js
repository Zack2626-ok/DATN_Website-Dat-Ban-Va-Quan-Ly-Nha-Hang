
const fs = require("fs");
const code = `\n\nexport const getSuppliers = async (req: Request, res: Response): Promise<void> => {
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
`;
fs.appendFileSync("be/src/controllers/inventory.controller.ts", code, "utf8");

