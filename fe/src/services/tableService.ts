import api from "./axiosInstance";
import type { TableArea } from "../interfaces/table.interface";

export interface ResmanagerTable {
  id: number;
  area_id: number;
  area_name: string;
  name: string;
  capacity: number;
  row_pos: string;
  col_pos: number;
  status: "empty" | "reserved" | "serving" | "pending_payment" | "maintenance" | "cleaning";
  is_deleted: number;
  // Enhanced fields
  guest_name?: string | null;
  guest_phone?: string | null;
  guest_count?: number | null;
  start_time?: string | null;
  maintenance_note?: string | null;
  is_merged_primary?: boolean;
  merged_tables?: { id: number; name: string }[];
  is_merged_child?: boolean;
  merged_into?: { id: number; name: string } | null;
  is_split?: boolean;
  split_labels?: string[];
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

/** Lấy bàn trống. Nếu có startTime, API sẽ loại trừ bàn bị booking vào khoảng thời gian đó */
export const getEmptyTables = async (startTime?: string): Promise<ResmanagerTable[]> => {
  const url = startTime ? `/v1/tables/empty?start_time=${encodeURIComponent(startTime)}` : "/v1/tables/empty";
  const response = await api.get(url);
  return response.data.data || [];
};

export const updateTableStatus = async (
  tableId: number,
  status: "empty" | "reserved" | "serving" | "pending_payment" | "maintenance",
  maintenanceNote?: string,
): Promise<void> => {
  const body: Record<string, any> = { status };
  if (status === "maintenance" && maintenanceNote) {
    body.maintenance_note = maintenanceNote;
  }
  await api.patch(`/v1/tables/${tableId}/status`, body);
};

/** Chuyển bàn: di chuyển order từ source sang target table */
export const transferTable = async (sourceTableId: number, targetTableId: number): Promise<void> => {
  await api.post(`/v1/tables/${sourceTableId}/transfer`, { target_table_id: targetTableId });
};

/** Gộp bàn: gộp nhiều bàn vào bàn chính */
export const mergeTables = async (primaryTableId: number, mergedTableIds: number[]): Promise<void> => {
  await api.post(`/v1/tables/${primaryTableId}/merge`, { merged_table_ids: mergedTableIds });
};

/** Bỏ gộp bàn */
export const unmergeTables = async (primaryTableId: number): Promise<void> => {
  await api.delete(`/v1/tables/${primaryTableId}/merge`);
};

/** Tách bàn: tách một phần order sang bàn mới */
export const splitTable = async (
  parentTableId: number,
  targetTableId: number,
  childLabel: string,
  itemIds: number[],
): Promise<{ newOrderId?: number }> => {
  const response = await api.post(`/v1/tables/${parentTableId}/split`, {
    target_table_id: targetTableId,
    child_label: childLabel,
    item_ids: itemIds,
  });
  return response.data.data || {};
};

export const createResmanagerTable = async (data: {
  area_id: number;
  name: string;
  capacity: number;
  row_pos: string;
  col_pos: number;
}): Promise<ResmanagerTable> => {
  const response = await api.post("/v1/tables", data);
  return response.data.data;
};

export const updateResmanagerTable = async (
  id: number,
  data: {
    area_id?: number;
    name?: string;
    capacity?: number;
    row_pos?: string;
    col_pos?: number;
  }
): Promise<ResmanagerTable> => {
  const response = await api.patch(`/v1/tables/${id}`, data);
  return response.data.data;
};

export const deleteResmanagerTable = async (id: number): Promise<void> => {
  await api.patch(`/v1/tables/${id}/delete`);
};

export const openResmanagerTab = async (data: {
  guest_name: string;
  guest_phone?: string;
  note?: string;
  created_by?: number;
}): Promise<any> => {
  const response = await api.post("/v1/tables/tab", data);
  return response.data.data;
};
