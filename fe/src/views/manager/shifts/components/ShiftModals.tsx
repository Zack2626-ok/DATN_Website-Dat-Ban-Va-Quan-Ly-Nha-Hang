import React, { useState, useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";
import type { Shift, ShiftEmployee } from "../../../../interfaces/shift.interface";

// Format date to local datetime-local string (YYYY-MM-DDTHH:MM)
const getLocalDatetimeString = () => {
  const now = new Date();
  const tzOffset = 7 * 60 * 60 * 1000; // VN timezone UTC+7
  const localTime = new Date(now.getTime() + tzOffset);
  return localTime.toISOString().slice(0, 16);
};

// ============================================================================
// 1. OPEN SHIFT MODAL
// ============================================================================
interface OpenShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: ShiftEmployee[];
  onConfirm: (data: { employee_id: number; start_time: string; cash_open: number; note: string }) => void;
  loading?: boolean;
}

export const OpenShiftModal: React.FC<OpenShiftModalProps> = ({
  isOpen,
  onClose,
  employees,
  onConfirm,
  loading = false,
}) => {
  const [employeeId, setEmployeeId] = useState<number | "">("");
  const [startTime, setStartTime] = useState("");
  const [cashOpen, setCashOpen] = useState<number | "">("");
  const [note, setNote] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      setEmployeeId(employees.length > 0 ? employees[0].id : "");
      setStartTime(getLocalDatetimeString());
      setCashOpen("");
      setNote("");
      setErrorMsg("");
    }
  }, [isOpen, employees]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!employeeId) {
      setErrorMsg("Vui lòng chọn nhân viên nhận ca.");
      return;
    }
    if (!startTime) {
      setErrorMsg("Vui lòng chọn thời gian bắt đầu ca.");
      return;
    }
    if (cashOpen === "" || Number(cashOpen) <= 0) {
      setErrorMsg("Số tiền bàn giao đầu ca (Cash Open) phải là số dương lớn hơn 0đ!");
      return;
    }

    onConfirm({
      employee_id: Number(employeeId),
      start_time: startTime,
      cash_open: Number(cashOpen),
      note: note.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in z-10">
        <div className="flex justify-between items-center px-6 py-4 border-b border-sky-50">
          <h3 className="text-base font-bold text-slate-700">🚀 Mở ca làm việc mới</h3>
          <button onClick={onClose} className="p-1 hover:bg-sky-100 rounded-full text-gray-400 hover:text-slate-500">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-xs text-red-600 font-medium flex items-start gap-2 animate-shake">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Nhân viên nhận ca *</label>
            <select
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(Number(e.target.value))}
              className="w-full rounded-lg border border-sky-100 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none bg-white"
            >
              <option value="">-- Chọn nhân viên --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.role_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Giờ bắt đầu ca *</label>
            <input
              type="datetime-local"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-lg border border-sky-100 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Số tiền mặt bàn giao đầu ca (VNĐ) *</label>
            <input
              type="number"
              min={1}
              required
              placeholder="Nhập số tiền mặt đầu ca, ví dụ: 2000000"
              value={cashOpen}
              onChange={(e) => {
                const val = e.target.value === "" ? "" : Number(e.target.value);
                setCashOpen(val);
                if (val !== "" && val <= 0) {
                  setErrorMsg("Số tiền bàn giao đầu ca phải lớn hơn 0đ!");
                } else {
                  setErrorMsg("");
                }
              }}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
                cashOpen !== "" && cashOpen <= 0
                  ? "border-red-300 focus:border-red-500 bg-red-50/25"
                  : "border-sky-100 focus:border-sky-500"
              }`}
            />
            <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
              * Bắt buộc nhập. Đây là lượng tiền lẻ dự phòng dùng để trả lại cho khách hàng ở quầy thu ngân khi bắt đầu ca.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Ghi chú mở ca</label>
            <textarea
              placeholder="Ghi chú thêm thông tin bàn giao ca..."
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border border-sky-100 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:bg-sky-50/50 rounded-lg border border-sky-100 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || (cashOpen !== "" && cashOpen <= 0)}
              className="px-4 py-2 text-xs font-bold text-white bg-sky-500 hover:bg-[#e04f53] rounded-lg shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Đang mở..." : "Mở ca làm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 2. CLOSE SHIFT MODAL
// ============================================================================
interface CloseShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: Shift | null;
  onConfirm: (data: { end_time: string; cash_close: number; note: string }) => void;
  loading?: boolean;
}

export const CloseShiftModal: React.FC<CloseShiftModalProps> = ({
  isOpen,
  onClose,
  shift,
  onConfirm,
  loading = false,
}) => {
  const [endTime, setEndTime] = useState("");
  const [cashClose, setCashClose] = useState<number | "">("");
  const [note, setNote] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      setEndTime(getLocalDatetimeString());
      setCashClose("");
      setNote("");
      setErrorMsg("");
    }
  }, [isOpen]);

  if (!isOpen || !shift) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!endTime) {
      setErrorMsg("Vui lòng chọn thời gian đóng ca.");
      return;
    }
    if (cashClose === "" || Number(cashClose) < 0) {
      setErrorMsg("Số tiền mặt kết toán cuối ca (Cash Close) không được âm!");
      return;
    }

    onConfirm({
      end_time: endTime,
      cash_close: Number(cashClose),
      note: note.trim(),
    });
  };

  const formatVnd = (num: number) => {
    return num.toLocaleString("vi-VN") + " đ";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in z-10">
        <div className="flex justify-between items-center px-6 py-4 border-b border-sky-50">
          <h3 className="text-base font-bold text-slate-700">🏁 Đóng ca làm việc & Kết toán</h3>
          <button onClick={onClose} className="p-1 hover:bg-sky-100 rounded-full text-gray-400 hover:text-slate-500">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-xs text-red-600 font-medium flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Chi tiết ca hiện tại */}
          <div className="p-3 rounded-xl bg-gray-55/75 border border-sky-50 text-xs space-y-1.5 text-slate-500">
            <div>
              Nhân viên phụ trách: <strong className="text-slate-700">{shift.employee_name}</strong>
            </div>
            <div>
              Vai trò trong ca: <strong className="text-slate-700">{shift.employee_role}</strong>
            </div>
            <div>
              Giờ bắt đầu: <strong className="text-slate-700">{shift.start_time.replace("T", " ")}</strong>
            </div>
            <div>
              Tiền mặt dự phòng đầu ca: <strong className="text-slate-700">{formatVnd(shift.cash_open)}</strong>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Giờ kết thúc ca *</label>
            <input
              type="datetime-local"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-lg border border-sky-100 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Số tiền mặt thực tế kiểm đếm cuối ca (VNĐ) *</label>
            <input
              type="number"
              min={0}
              required
              placeholder="Nhập tổng số tiền mặt kiểm đếm trong ngăn kéo"
              value={cashClose}
              onChange={(e) => {
                const val = e.target.value === "" ? "" : Number(e.target.value);
                setCashClose(val);
                if (val !== "" && val < 0) {
                  setErrorMsg("Số tiền kiểm đếm không được là số âm!");
                } else {
                  setErrorMsg("");
                }
              }}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
                cashClose !== "" && cashClose < 0
                  ? "border-red-300 focus:border-red-500 bg-red-50/25"
                  : "border-sky-100 focus:border-sky-500"
              }`}
            />
            {cashClose !== "" && Number(cashClose) !== shift.cash_open && (
              <div className="text-[10px] mt-1 text-amber-600 font-medium">
                * Có sự chênh lệch {formatVnd(Number(cashClose) - shift.cash_open)} so với lúc mở ca. Vui lòng ghi chú lý do chênh lệch doanh thu bên dưới.
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Ghi chú kết toán & chênh lệch</label>
            <textarea
              placeholder="Nhập ghi chú chênh lệch doanh thu hoặc bàn giao chìa khóa/thiết bị..."
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border border-sky-100 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:bg-sky-50/50 rounded-lg border border-sky-100 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || (cashClose !== "" && cashClose < 0)}
              className="px-4 py-2 text-xs font-bold text-white bg-slate-700 hover:bg-slate-800 rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
            >
              {loading ? "Đang đóng..." : "Đóng ca & Kết toán"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
