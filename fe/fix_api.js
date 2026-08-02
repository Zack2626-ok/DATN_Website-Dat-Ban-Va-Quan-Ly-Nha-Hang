const fs = require('fs');
let content = fs.readFileSync('src/services/api.ts', 'utf8');

const oldStr = export const updateInventoryQuantityApi = async (id: string | number, quantity: number, type: "import" | "export" | "adjust", reasonOrSupplier?: string): Promise<any> => {
  const response = await api.patch(\/inventory/\ + id + \/quantity\, { quantity, type, reasonOrSupplier });
  return response.data.data;
};;

// Wait, the original code uses template literals
const oldStr2 = export const updateInventoryQuantityApi = async (id: string | number, quantity: number, type: "import" | "export" | "adjust", reasonOrSupplier?: string): Promise<any> => {
  const response = await api.patch(\/inventory/\/quantity\, { quantity, type, reasonOrSupplier });
  return response.data.data;
};;

const newStr = export const updateInventoryQuantityApi = async (id: string | number, payload: any): Promise<any> => {
  const response = await api.patch(\/inventory/\/quantity\, payload);
  return response.data.data;
};;

content = content.replace(oldStr2, newStr);

content += \nexport const wasteExpiredBatchesApi = async (): Promise<any> => {
  const response = await api.post(\/inventory/waste-expired\);
  return response.data.data;
};\n\nexport const getAllBatchesApi = async (): Promise<any> => {
  const response = await api.get(\/inventory/batches/all\);
  return response.data.data;
};\n;

fs.writeFileSync('src/services/api.ts', content);
