import { Table, TableArea } from "../interfaces/table.interface";

export const MOCK_AREAS: TableArea[] = [
  { id: 1, name: "Tầng 1", is_active: 1 },
  { id: 2, name: "Tầng 2", is_active: 1 },
  { id: 3, name: "Sân vườn", is_active: 1 },
];

export const MOCK_TABLES: Table[] = [
  // Tầng 1
  { id: 1, area_id: 1, name: "B01", capacity: 4, row_pos: "A", col_pos: 1, status: "empty" },
  { id: 2, area_id: 1, name: "B02", capacity: 4, row_pos: "A", col_pos: 2, status: "serving" },
  { id: 3, area_id: 1, name: "B03", capacity: 6, row_pos: "A", col_pos: 3, status: "reserved" },
  { id: 4, area_id: 1, name: "B04", capacity: 8, row_pos: "B", col_pos: 1, status: "pending_payment" },
  { id: 5, area_id: 1, name: "B05", capacity: 4, row_pos: "B", col_pos: 2, status: "empty" },
  // Tầng 2
  { id: 6, area_id: 2, name: "B06", capacity: 4, row_pos: "A", col_pos: 1, status: "empty" },
  { id: 7, area_id: 2, name: "B07", capacity: 6, row_pos: "A", col_pos: 2, status: "serving" },
  { id: 8, area_id: 2, name: "B08", capacity: 8, row_pos: "A", col_pos: 3, status: "empty" },
  // Sân vườn
  { id: 10, area_id: 3, name: "B10", capacity: 6, row_pos: "A", col_pos: 1, status: "empty" },
];
