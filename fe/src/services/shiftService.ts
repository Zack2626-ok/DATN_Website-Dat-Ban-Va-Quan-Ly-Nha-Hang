import type { Shift, Attendance, ShiftEmployee } from "../interfaces/shift.interface";

// Danh sách nhân viên mock dựa trên CSDL
const MOCK_EMPLOYEES: ShiftEmployee[] = [
  { id: 2, full_name: "Restaurant Manager", role_name: "Quản lý" },
  { id: 3, full_name: "Cashier 1", role_name: "Thu ngân" },
  { id: 4, full_name: "Waiter 1", role_name: "Phục vụ" },
  { id: 5, full_name: "Waiter 2", role_name: "Phục vụ" },
  { id: 6, full_name: "Chef 1", role_name: "Đầu bếp" },
  { id: 7, full_name: "Sales Event 1", role_name: "Tổ chức Sự kiện" },
];

// Khởi tạo CSDL Mock trong LocalStorage nếu chưa có
const initLocalStorage = () => {
  if (!localStorage.getItem("resmanager_shifts")) {
    const defaultShifts: Shift[] = [
      { id: 1, employee_id: 2, start_time: "2026-06-23T08:00", end_time: "2026-06-23T18:00", cash_open: 2000000, cash_close: 2500000, note: "Ca sáng quản lý" },
      { id: 2, employee_id: 3, start_time: "2026-06-23T10:00", end_time: "2026-06-23T22:00", cash_open: 1000000, cash_close: 1200000, note: "Ca chiều thu ngân" },
      { id: 3, employee_id: 4, start_time: "2026-06-23T07:00", end_time: "2026-06-23T15:00", cash_open: 500000, cash_close: 520000, note: "Ca sáng phục vụ" },
      { id: 4, employee_id: 5, start_time: "2026-06-23T15:00", end_time: null, cash_open: 500000, cash_close: null, note: "Ca tối phục vụ (chưa đóng)" },
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
      employee_name: emp ? emp.full_name : "Không rõ",
      employee_role: emp ? emp.role_name : "N/A"
    };
  });
};

const getAttendanceFromStorage = (): Attendance[] => {
  const attendances: Attendance[] = JSON.parse(localStorage.getItem("resmanager_attendance") || "[]");
  return attendances.map(a => {
    const emp = MOCK_EMPLOYEES.find(e => e.id === a.employee_id);
    return {
      ...a,
      employee_name: emp ? emp.full_name : "Không rõ",
      employee_role: emp ? emp.role_name : "N/A"
    };
  });
};

// APIs export
export const getEmployees = async (): Promise<ShiftEmployee[]> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve([...MOCK_EMPLOYEES]), 300);
  });
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
        reject(new Error("Không tìm thấy ca làm việc cần đóng"));
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
  return new Promise((resolve) => {
    setTimeout(() => resolve(getAttendanceFromStorage()), 300);
  });
};

export const clockIn = async (employeeId: number): Promise<Attendance> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const attendances = getAttendanceFromStorage();
      const newId = attendances.length > 0 ? Math.max(...attendances.map(a => a.id)) + 1 : 1;
      
      // Tạo múi giờ VN (UTC+7)
      const now = new Date();
      const tzOffset = 7 * 60 * 60 * 1000;
      const localTime = new Date(now.getTime() + tzOffset);
      const clockInTime = localTime.toISOString().slice(0, 16); // format: YYYY-MM-DDTHH:MM

      const newAttendance: Attendance = {
        id: newId,
        employee_id: employeeId,
        clock_in: clockInTime,
        clock_out: null,
      };
      attendances.push(newAttendance);
      localStorage.setItem("resmanager_attendance", JSON.stringify(attendances));
      resolve({
        ...newAttendance,
        employee_name: MOCK_EMPLOYEES.find(e => e.id === employeeId)?.full_name,
        employee_role: MOCK_EMPLOYEES.find(e => e.id === employeeId)?.role_name,
      });
    }, 400);
  });
};

export const clockOut = async (employeeId: number): Promise<Attendance> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const attendances = getAttendanceFromStorage();
      // Tìm bản ghi clock_in mới nhất chưa clock_out của nhân viên này
      const activeIdx = attendances.findIndex(a => a.employee_id === employeeId && a.clock_out === null);
      if (activeIdx === -1) {
        reject(new Error("Nhân viên này hiện không trong trạng thái Check-in."));
        return;
      }

      // Tạo múi giờ VN (UTC+7)
      const now = new Date();
      const tzOffset = 7 * 60 * 60 * 1000;
      const localTime = new Date(now.getTime() + tzOffset);
      const clockOutTime = localTime.toISOString().slice(0, 16);

      attendances[activeIdx].clock_out = clockOutTime;
      localStorage.setItem("resmanager_attendance", JSON.stringify(attendances));
      resolve(attendances[activeIdx]);
    }, 400);
  });
};
