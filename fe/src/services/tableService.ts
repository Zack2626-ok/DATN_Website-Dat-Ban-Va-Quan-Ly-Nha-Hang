import api from "./axiosInstance";
import type { TableArea, Table, AreaResponse, TableResponse } from "../interfaces/table.interface";

export interface ResmanagerTable {
  id: number;
  area_id: number;
  area_name: string;
  name: string;
  capacity: number;
  row_pos: string;
  col_pos: number;
  status: "empty" | "reserved" | "serving" | "pending_payment";
  is_deleted: number;
}

export const getTableAreas = async (): Promise<TableArea[]> => {
  const response = await api.get("/v1/tables/areas");
  return response.data.data || [];
};

export const getTables = async (areaId?: number): Promise<ResmanagerTable[]> => {
  const url = areaId ? `/v1/tables?area_id=${areaId}` : "/v1/tables";
  const response = await api.get(url);
  return response.data.data || [];
};

export const getTablesV1 = getTables;                           

export const updateTableStatus = async (                                                                                    
  tableId: number,
  status: "empty" | "reserved" | "serving" | "pending_payment",
): Promise<void> => {
  await api.patch(`/v1/tables/${tableId}/status`, { status });
};
