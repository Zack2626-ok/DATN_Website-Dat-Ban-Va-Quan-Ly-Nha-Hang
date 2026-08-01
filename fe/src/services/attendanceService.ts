import api from "./axiosInstance";

export interface AttendanceRecord {
  id: number;
  employee_id: number;
  clock_in: string;
  clock_out: string | null;
}

export const getMyAttendanceToday = async (): Promise<AttendanceRecord | null> => {
  try {
    const response = await api.get("/attendance/me");
    return response.data.data;
  } catch {
    return null;
  }
};

export const getAttendanceStatus = async (): Promise<{ checkedIn: boolean; attendance: AttendanceRecord | null }> => {
  const response = await api.get("/attendance/status");
  return response.data.data;
};

export const clockInApi = async (): Promise<AttendanceRecord> => {
  const response = await api.post("/attendance/clock-in");
  return response.data.data;
};

export const clockOutApi = async (): Promise<AttendanceRecord> => {
  const response = await api.post("/attendance/clock-out");
  return response.data.data;
};
