const fs = require('fs');
let data = fs.readFileSync('../be/src/controllers/inventory.controller.ts', 'utf8');

const newFunc = \
export const getAllBatches = async (_req: Request, res: Response): Promise<void> => {
  try {
    const batches = await db.query(\\\
      SELECT 
        si.id, 
        si.ingredient_id,
        i.name as ingredientName,
        si.batch_code as batchNo, 
        si.remaining_quantity as quantity, 
        i.unit, 
        si.expiry_date as expiryDate
      FROM stock_in si
      JOIN ingredients i ON si.ingredient_id = i.id
      WHERE si.remaining_quantity > 0 AND si.expiry_date IS NOT NULL
      ORDER BY si.expiry_date ASC
    \\\);
    sendSuccess(res, batches, "L?y danh sách lô hàng thành công");
  } catch (error) {
    console.error("Error fetching all batches:", error);
    sendError(res, "L?i: " + (error as Error).message, 500);
  }
};
\;

data += newFunc;
fs.writeFileSync('../be/src/controllers/inventory.controller.ts', data, 'utf8');

let routeData = fs.readFileSync('../be/src/routes/inventory.routes.ts', 'utf8');
routeData = routeData.replace('getIngredientBatches,', 'getIngredientBatches, getAllBatches,');
routeData = routeData.replace('router.get("/:id/batches", getIngredientBatches);', 'router.get("/batches/all", getAllBatches);\\nrouter.get("/:id/batches", getIngredientBatches);');
fs.writeFileSync('../be/src/routes/inventory.routes.ts', routeData, 'utf8');
