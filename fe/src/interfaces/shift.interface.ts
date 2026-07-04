export interface Shift {
  id: number;
  employee_id: number;
  start_time: string;
  end_time: string | null;
  cash_open: number;
  cash_close: number | null;
  note: string | null;
  // Metadata join fields
  employee_name?: string;
  employee_role?: string;
}

export interface Attendance {
  id: number;
  employee_id: number;
  clock_in: string;
  clock_out: string | null;
  // Metadata join fields
  employee_name?: string;
  employee_role?: string;
}

export interface ShiftEmployee {
  id: number;
  full_name: string;
  role_name: string;
}
