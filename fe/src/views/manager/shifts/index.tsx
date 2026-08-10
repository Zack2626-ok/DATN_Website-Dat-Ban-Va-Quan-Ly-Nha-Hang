import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Calendar, CalendarDays, UserCheck } from "lucide-react";
import type { Attendance, ShiftEmployee } from "../../../interfaces/shift.interface";
import * as shiftService from "../../../services/shiftService";
import { AttendanceTab } from "./components/AttendanceTab";
import { AttendanceHistoryTab } from "./components/AttendanceHistoryTab";
import { TimePolicyCard } from "./components/TimePolicyCard";
import { ScheduleAssignmentPanel } from "./components/ScheduleAssignmentPanel";
import { ShiftPolicySettings } from "./components/ShiftPolicySettings";
import { LeaveAndSwapReviewPanel } from "./components/LeaveAndSwapReviewPanel";

export const ShiftManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"shifts" | "attendance" | "attendance-history">("shifts");

  // States dữ liệu
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<ShiftEmployee[]>([]);

  // States trạng thái tải
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // States đóng/mở hộp thoại
  // Fetch dữ liệu từ API service
  const fetchData = async () => {
    try {
      setLoading(true);
      const [attendanceData, employeesData] = await Promise.all([
        shiftService.getAttendance(),
        shiftService.getEmployees(),
      ]);
      setAttendance(attendanceData);
      setEmployees(employeesData);
    } catch (error) {
      toast.error("Không thể tải thông tin ca làm việc và chấm công");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  /** Refreshes attendance data in the background while staff are clocked in or out. */
  const refreshAttendance = async () => {
    try {
      const [attendanceData, employeesData] = await Promise.all([
        shiftService.getAttendance(),
        shiftService.getEmployees(),
      ]);
      setAttendance(attendanceData);
      setEmployees(employeesData);
    } catch (error) {
      console.error("Unable to refresh attendance data:", error);
    }
  };

  useEffect(() => {
    void fetchData();
    const pollId = window.setInterval(() => {
      void refreshAttendance();
    }, 5000);
    return () => window.clearInterval(pollId);
  }, []);

  // Handler: Check-in chấm công
  /** Records a terminal clock-in, optionally with a late-arrival explanation. */
  const handleClockIn = async (employeeId: number, lateReason?: string): Promise<void> => {
    try {
      setActionLoading(true);
      await shiftService.clockIn(employeeId, { late_reason: lateReason });
      toast.success("Ghi nhận Clock In chấm công thành công!");
      fetchData();
      } catch (error) {
        toast.error((error as Error).message || "Lỗi ghi nhận giờ vào");
        throw error;
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Check-out chấm công
  /** Records a terminal clock-out, optionally with an early-departure explanation. */
  const handleClockOut = async (employeeId: number, earlyReason?: string): Promise<void> => {
    try {
      setActionLoading(true);
      await shiftService.clockOut(employeeId, { early_reason: earlyReason });
      toast.success("Ghi nhận Clock Out chấm công thành công!");
      fetchData();
      } catch (error) {
        toast.error((error as Error).message || "Lỗi ghi nhận giờ ra");
        throw error;
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4 font-sans text-[#1A1A1A]">
      {/* Header trang */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#FFFFFF] p-5 rounded-3xl border border-slate-200/70 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">
            Quản lý Ca & Chấm công
          </h1>
          <p className="text-xs font-semibold text-[#8A8A8A] mt-0.5">
            Theo dõi, mở ca dự phòng tiền mặt, đóng ca kết toán sổ quỹ và quản lý chấm công thời gian thực
          </p>
        </div>
      </div>

      {/* Tabs chuyển đổi giữa Ca làm và Chấm công */}
      <div className="bg-[#FFFFFF] p-3 rounded-3xl border border-slate-200/70 shadow-xs flex items-center gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("shifts")}
          className={`flex-1 sm:flex-initial px-5 py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "shifts"
              ? "bg-[#3E2016] text-[#FFFFFF] shadow-xs"
              : "bg-slate-100 text-[#8A8A8A] hover:text-[#1A1A1A]"
          }`}
        >
          <Calendar size={15} />
          Quản lý Ca làm (Shifts)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("attendance")}
          className={`flex-1 sm:flex-initial px-5 py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "attendance"
              ? "bg-[#3E2016] text-[#FFFFFF] shadow-xs"
              : "bg-slate-100 text-[#8A8A8A] hover:text-[#1A1A1A]"
          }`}
        >
          <UserCheck size={15} />
          Chấm công
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("attendance-history")}
          className={`flex-1 sm:flex-initial px-5 py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "attendance-history"
              ? "bg-[#3E2016] text-[#FFFFFF] shadow-xs"
              : "bg-slate-100 text-[#8A8A8A] hover:text-[#1A1A1A]"
          }`}
        >
          <CalendarDays size={15} />
          Lịch sử làm việc
        </button>
      </div>

      {activeTab === "shifts" && (
        <>
          <TimePolicyCard />
          <ShiftPolicySettings />
          <ScheduleAssignmentPanel employees={employees} />
          <LeaveAndSwapReviewPanel />
        </>
      )}

      {/* Nội dung Tab */}
      <div className="animate-fade-in">
        {activeTab === "attendance" ? (
          <AttendanceTab
            attendance={attendance}
            employees={employees}
            loading={loading}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            actionLoading={actionLoading}
          />
        ) : activeTab === "attendance-history" ? (
          <AttendanceHistoryTab attendance={attendance} loading={loading} />
        ) : null}
      </div>
    </div>
  );
};
