export interface TableArea {
  id: number;
  name: string;
  is_active: number;
}

export interface Table {
  id: number | string;
  area_id: number;
  area_name?: string;
  name: string;
  capacity: number;
  row_pos: string;
  col_pos: number;
  status: 'empty' | 'reserved' | 'serving' | 'pending_payment' | 'maintenance' | 'cleaning';
  currentOrder?: any;
}

export interface TableResponse {
  success: boolean;
  message: string;
  data: Table[];
}

export interface AreaResponse {
  success: boolean;
  message: string;
  data: TableArea[];
}
