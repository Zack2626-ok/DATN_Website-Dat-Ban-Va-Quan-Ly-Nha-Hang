import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Calendar, CalendarDays, UserCheck } from "lucide-react";
import type { Shift, Attendance, ShiftEmployee } from "../../../interfaces/shift.interface";
import * as shiftService from "../../../services/shiftService";
import { ShiftTab } from "./components/ShiftTab";
import { AttendanceTab } from "./components/AttendanceTab";
import { AttendanceHistoryTab } from "./components/AttendanceHistoryTab";
import { OpenShiftModal, CloseShiftModal } from "./components/ShiftModals";

export const ShiftManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"shifts" | "attendance" | "attendance-history">("shifts");

  // States dữ liệu
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<ShiftEmployee[]>([]);

  // States trạng thái tải
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // States đóng/mở hộp thoại
  const [isOpenShiftOpen, setIsOpenShiftOpen] = useState(false);
  const [isCloseShiftOpen, setIsCloseShiftOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  // Fetch dữ liệu từ API service
  const fetchData = async () => {
    try {
      setLoading(true);
      const [shiftsData, attendanceData, employeesData] = await Promise.all([
        shiftService.getShifts(),
        shiftService.getAttendance(),
        shiftService.getEmployees(),
      ]);
      setShifts(shiftsData);
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

  // Handler: Mở ca làm mới
  const handleOpenShift = async (data: { employee_id: number; start_time: string; cash_open: number; note: string }) => {
    try {
      setActionLoading(true);
      await shiftService.openShift(data);
      toast.success("Mở ca làm việc mới thành công!");
      setIsOpenShiftOpen(false);
      fetchData();
    } catch (error) {
      toast.error((error as Error).message || "Lỗi mở ca làm việc");
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Đóng ca làm việc
  const handleCloseShift = async (data: { end_time: string; cash_close: number; note: string }) => {
    if (!selectedShift) return;
    try {
      setActionLoading(true);
      await shiftService.closeShift(selectedShift.id, data);
      toast.success("Đóng ca làm việc và kết toán thành công!");
      setIsCloseShiftOpen(false);
      setSelectedShift(null);
      fetchData();
    } catch (error) {
      toast.error((error as Error).message || "Lỗi đóng ca làm việc");
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Check-in chấm công
  const handleClockIn = async (employeeId: number) => {
    try {
      setActionLoading(true);
      await shiftService.clockIn(employeeId);
      toast.success("Ghi nhận Clock In chấm công thành công!");
      fetchData();
    } catch (error) {
      toast.error((error as Error).message || "Lỗi ghi nhận giờ vào");
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Check-out chấm công
  const handleClockOut = async (employeeId: number) => {
    try {
      setActionLoading(true);
      await shiftService.clockOut(employeeId);
      toast.success("Ghi nhận Clock Out chấm công thành công!");
      fetchData();
    } catch (error) {
      toast.error((error as Error).message || "Lỗi ghi nhận giờ ra");
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

      {/* Nội dung Tab */}
      <div className="animate-fade-in">
        {activeTab === "shifts" ? (
          <ShiftTab
            shifts={shifts}
            loading={loading}
            onOpenShiftClick={() => setIsOpenShiftOpen(true)}
            onCloseShiftClick={(shift) => {
              setSelectedShift(shift);
              setIsCloseShiftOpen(true);
            }}
          />
        ) : activeTab === "attendance" ? (
          <AttendanceTab
            attendance={attendance}
            employees={employees}
            loading={loading}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            actionLoading={actionLoading}
          />
        ) : (
          <AttendanceHistoryTab attendance={attendance} loading={loading} />
        )}
      </div>

      {/* Modals nghiệp vụ ca làm */}
      <OpenShiftModal
        isOpen={isOpenShiftOpen}
        onClose={() => setIsOpenShiftOpen(false)}
        employees={employees}
        onConfirm={handleOpenShift}
        loading={actionLoading}
      />

      <CloseShiftModal
        isOpen={isCloseShiftOpen}
        onClose={() => {
          setIsCloseShiftOpen(false);
          setSelectedShift(null);
        }}
        shift={selectedShift}
        onConfirm={handleCloseShift}
        loading={actionLoading}
      />
    </div>
  );
};
