import api from "./axiosInstance";
import { AreaResponse, TableResponse } from "../interfaces/table.interface";

export const getTableAreas = async (): Promise<AreaResponse> => {
  const response = await api.get("/v1/table-areas");
  return response.data;
};

export const getTables = async (areaId?: number): Promise<TableResponse> => {
  const url = areaId ? `/v1/tables?area_id=${areaId}` : "/v1/tables";
  const response = await api.get(url);
  return response.data;
};
