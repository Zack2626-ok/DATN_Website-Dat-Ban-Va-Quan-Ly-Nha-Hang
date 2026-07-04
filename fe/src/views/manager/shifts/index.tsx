import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Calendar, UserCheck } from "lucide-react";
import type { Shift, Attendance, ShiftEmployee } from "../../../interfaces/shift.interface";
import * as shiftService from "../../../services/shiftService";
import { ShiftTab } from "./components/ShiftTab";
import { AttendanceTab } from "./components/AttendanceTab";
import { OpenShiftModal, CloseShiftModal } from "./components/ShiftModals";

export const ShiftManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"shifts" | "attendance">("shifts");

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

  useEffect(() => {
    fetchData();
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
    <div className="flex flex-col gap-6">
      {/* Header trang */}
      <div className="border-b border-gray-150 pb-4">
        <h1 className="text-xl font-bold text-gray-800">📊 Quản lý Ca & Chấm công</h1>
        <p className="mt-1 text-xs text-gray-500">
          Theo dõi, mở ca dự phòng tiền mặt, đóng ca kết toán sổ quỹ và quản lý chấm công thời gian thực của nhân sự.
        </p>
      </div>

      {/* Tabs chuyển đổi giữa Ca làm và Chấm công */}
      <div className="flex border-b border-gray-200 gap-6">
        <button
          onClick={() => setActiveTab("shifts")}
          className={`flex items-center gap-1.5 pb-3 text-xs font-bold transition-colors relative cursor-pointer ${
            activeTab === "shifts" ? "text-[#FF5A5F]" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Calendar size={14} />
          Quản lý Ca làm (Shifts)
          {activeTab === "shifts" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF5A5F] rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab("attendance")}
          className={`flex items-center gap-1.5 pb-3 text-xs font-bold transition-colors relative cursor-pointer ${
            activeTab === "attendance" ? "text-[#FF5A5F]" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <UserCheck size={14} />
          Chấm công (Attendance)
          {activeTab === "attendance" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF5A5F] rounded-full" />}
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
        ) : (
          <AttendanceTab
            attendance={attendance}
            employees={employees}
            loading={loading}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            actionLoading={actionLoading}
          />
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
