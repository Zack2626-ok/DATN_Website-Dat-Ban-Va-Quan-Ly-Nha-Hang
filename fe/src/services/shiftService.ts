import type { Shift, Attendance, ShiftEmployee } from "../interfaces/shift.interface";
import api from "./axiosInstance";

// Danh sÃƒÂ¡ch nhÃƒÂ¢n viÃƒÂªn mock dÃ¡Â»Â±a trÃƒÂªn CSDL
const MOCK_EMPLOYEES: ShiftEmployee[] = [
  { id: 2, full_name: "Restaurant Manager", role_name: "QuÃ¡ÂºÂ£n lÃƒÂ½" },
  { id: 3, full_name: "Cashier 1", role_name: "Thu ngÃƒÂ¢n" },
  { id: 4, full_name: "Waiter 1", role_name: "PhÃ¡Â»Â¥c vÃ¡Â»Â¥" },
  { id: 5, full_name: "Waiter 2", role_name: "PhÃ¡Â»Â¥c vÃ¡Â»Â¥" },
  { id: 6, full_name: "Chef 1", role_name: "Ã„ÂÃ¡ÂºÂ§u bÃ¡ÂºÂ¿p" },
  { id: 7, full_name: "Sales Event 1", role_name: "TÃ¡Â»â€¢ chÃ¡Â»Â©c SÃ¡Â»Â± kiÃ¡Â»â€¡n" },
];

// KhÃ¡Â»Å¸i tÃ¡ÂºÂ¡o CSDL Mock trong LocalStorage nÃ¡ÂºÂ¿u chÃ†Â°a cÃƒÂ³
const initLocalStorage = () => {
  if (!localStorage.getItem("resmanager_shifts")) {
    const defaultShifts: Shift[] = [
      { id: 1, employee_id: 2, start_time: "2026-06-23T08:00", end_time: "2026-06-23T18:00", cash_open: 2000000, cash_close: 2500000, note: "Ca sÃƒÂ¡ng quÃ¡ÂºÂ£n lÃƒÂ½" },
      { id: 2, employee_id: 3, start_time: "2026-06-23T10:00", end_time: "2026-06-23T22:00", cash_open: 1000000, cash_close: 1200000, note: "Ca chiÃ¡Â»Âu thu ngÃƒÂ¢n" },
      { id: 3, employee_id: 4, start_time: "2026-06-23T07:00", end_time: "2026-06-23T15:00", cash_open: 500000, cash_close: 520000, note: "Ca sÃƒÂ¡ng phÃ¡Â»Â¥c vÃ¡Â»Â¥" },
      { id: 4, employee_id: 5, start_time: "2026-06-23T15:00", end_time: null, cash_open: 500000, cash_close: null, note: "Ca tÃ¡Â»â€˜i phÃ¡Â»Â¥c vÃ¡Â»Â¥ (chÃ†Â°a Ã„â€˜ÃƒÂ³ng)" },
    ];
    localStorage.setItem("resmanager_shifts", JSON.stringify(defaultShifts));
  }

  if (!localStorage.getItem("resmanager_attendance")) {
    const defaultAttendance: Attendance[] = [
      { id: 1, employee_id: 2, clock_in: "2026-06-23T07:55", clock_out: "2026-06-23T18:05" },
      { id: 2, employee_id: 3, clock_in: "2026-06-23T09:58", clock_out: "2026-06-23T22:02" },
      { id: 3, employee_id: 4, clock_in: "2026-06-23T06:58", clock_out: "2026-06-23T15:02" },
      { id: 4, employee_id: 5, clock_in: "2026-06-23T14:57", clock_out: null },
      { id: 5, employee_id: 6, clock_in: "2026-06-23T08:02", clock_out: "2026-06-23T20:00" },
      { id: 6, employee_id: 7, clock_in: "2026-06-23T08:00", clock_out: "2026-06-23T17:30" },
    ];
    localStorage.setItem("resmanager_attendance", JSON.stringify(defaultAttendance));
  }
};

initLocalStorage();

// Helper helpers to get lists with joined metadata
const getShiftsFromStorage = (): Shift[] => {
  const shifts: Shift[] = JSON.parse(localStorage.getItem("resmanager_shifts") || "[]");
  return shifts.map(s => {
    const emp = MOCK_EMPLOYEES.find(e => e.id === s.employee_id);
    return {
      ...s,
      employee_name: emp ? emp.full_name : "KhÃƒÂ´ng rÃƒÂµ",
      employee_role: emp ? emp.role_name : "N/A"
    };
  });
};

// APIs export
export const getEmployees = async (): Promise<ShiftEmployee[]> => {
  const response = await api.get("/attendance/employees");
  return response.data.data || [];
};

export const getShifts = async (): Promise<Shift[]> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(getShiftsFromStorage()), 300);
  });
};

export const openShift = async (data: {
  employee_id: number;
  start_time: string;
  cash_open: number;
  note?: string;
}): Promise<Shift> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const shifts = getShiftsFromStorage();
      const newId = shifts.length > 0 ? Math.max(...shifts.map(s => s.id)) + 1 : 1;
      const newShift: Shift = {
        id: newId,
        employee_id: data.employee_id,
        start_time: data.start_time,
        end_time: null,
        cash_open: Number(data.cash_open),
        cash_close: null,
        note: data.note || null,
      };
      shifts.push(newShift);
      localStorage.setItem("resmanager_shifts", JSON.stringify(shifts));
      resolve({
        ...newShift,
        employee_name: MOCK_EMPLOYEES.find(e => e.id === data.employee_id)?.full_name,
        employee_role: MOCK_EMPLOYEES.find(e => e.id === data.employee_id)?.role_name,
      });
    }, 400);
  });
};

export const closeShift = async (
  id: number,
  data: { end_time: string; cash_close: number; note?: string }
): Promise<Shift> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const shifts = getShiftsFromStorage();
      const idx = shifts.findIndex(s => s.id === id);
      if (idx === -1) {
        reject(new Error("KhÃƒÂ´ng tÃƒÂ¬m thÃ¡ÂºÂ¥y ca lÃƒÂ m viÃ¡Â»â€¡c cÃ¡ÂºÂ§n Ã„â€˜ÃƒÂ³ng"));
        return;
      }
      shifts[idx].end_time = data.end_time;
      shifts[idx].cash_close = Number(data.cash_close);
      if (data.note) {
        shifts[idx].note = shifts[idx].note ? `${shifts[idx].note} | ${data.note}` : data.note;
      }
      localStorage.setItem("resmanager_shifts", JSON.stringify(shifts));
      resolve(shifts[idx]);
    }, 400);
  });
};

export const getAttendance = async (): Promise<Attendance[]> => {
  const response = await api.get("/attendance");
  return response.data.data || [];
};

export const clockIn = async (employeeId: number): Promise<Attendance> => {
  const response = await api.post("/attendance/employee/clock-in", { employee_id: employeeId });
  return response.data.data;
};

export const clockOut = async (employeeId: number): Promise<Attendance> => {
  const response = await api.post("/attendance/employee/clock-out", { employee_id: employeeId });
  return response.data.data;
};