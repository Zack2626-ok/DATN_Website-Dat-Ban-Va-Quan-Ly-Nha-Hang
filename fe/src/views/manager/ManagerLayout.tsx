import React, { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Bell, LogOut, Search, Timer, User, Clock } from "lucide-react";
import { io } from "socket.io-client";
import { toast } from "react-hot-toast";
import { getBookingValidationStatus, updateBookingValidationStatus } from "../../services/systemService";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { ROLE_LABELS } from "../../constants/roles";
import { setSearchQuery, clearSearchQuery } from "../../store/uiSlice";
import { X } from "lucide-react";
import { logoutAction } from "../../store/authSlice";
import { ManagerSidebar } from "./components/ManagerSidebar";

/**
 * ManagerLayout - Layout riêng cho Manager với sidebar accordion
 */
export const ManagerLayout: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const searchQuery = useAppSelector((state) => state.ui.searchQuery);
  const displayRole = user?.role || "manager";
  const defaultName = displayRole === "manager" ? "Restaurant Manager" : "Demo User";

  const [bookingValidationEnabled, setBookingValidationEnabled] = useState<boolean>(true);
  const [togglingValidation, setTogglingValidation] = useState<boolean>(false);

  useEffect(() => {
    getBookingValidationStatus()
      .then(setBookingValidationEnabled)
      .catch(() => {});

    const socket = io(import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000");
    socket.on("system:booking_validation_changed", (data: { enabled: boolean }) => {
      setBookingValidationEnabled(data.enabled);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleToggleBookingValidation = async () => {
    try {
      setTogglingValidation(true);
      const nextState = !bookingValidationEnabled;
      const updated = await updateBookingValidationStatus(nextState);
      setBookingValidationEnabled(updated);
      toast.success(
        updated
          ? "🔔 ĐÃ BẬT giới hạn giờ 21:00 (Không nhận đặt bàn sau 21:00)"
          : "🔓 ĐÃ TẮT giới hạn giờ 21:00 (Tự do test đặt bàn bất kỳ lúc nào)"
      );
    } catch {
      toast.error("Không thể thay đổi trạng thái giới hạn giờ");
    } finally {
      setTogglingValidation(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#E4E4E4] text-[#1A1A1A] flex flex-col md:flex-row font-sans p-2 md:p-3.5 gap-2 md:gap-3.5">
      {/* Floating Sidebar */}
      <ManagerSidebar />

      {/* Main Content Workspace */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Floating Header */}
        <header className="flex items-center justify-between px-4 py-3 md:px-6">
          <div className="relative hidden max-w-sm flex-1 sm:block">
            <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md border border-white/80 rounded-full px-4 py-2 shadow-xs">
              <Search size={16} className="text-[#8B8B8B]" />
              <input
                type="text"
                placeholder="Tìm kiếm thông tin..."
                value={searchQuery}
                onChange={(e) => dispatch(setSearchQuery(e.target.value))}
                className="w-full bg-transparent text-sm text-[#1A1A1A] placeholder-[#8B8B8B] focus:outline-none font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => dispatch(clearSearchQuery())}
                  className="text-[#8B8B8B] hover:text-[#1A1A1A] cursor-pointer"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Search Circle Icon Button (Mobile/Tablet) */}
            <button
              type="button"
              className="sm:hidden flex h-10 w-10 items-center justify-center rounded-full bg-white/90 border border-white/80 text-[#1A1A1A] shadow-xs hover:bg-white cursor-pointer"
            >
              <Search size={18} />
            </button>

            {/* Notification Circle Icon Button */}
            <button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/90 border border-white/80 text-[#1A1A1A] shadow-xs hover:bg-white transition-colors cursor-pointer"
              title="Thông báo"
            >
              <Bell size={18} />
              <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#F5C344] text-[9px] font-black text-[#1A1A1A] shadow-xs">
                3
              </span>
            </button>

            {/* Nút Khóa / Nhận đặt bàn 21:00 */}
            <button
              type="button"
              onClick={handleToggleBookingValidation}
              disabled={togglingValidation}
              title={
                bookingValidationEnabled
                  ? "Đang BẬT giới hạn 21:00 (SÁNG) — Ngưng nhận đặt bàn sau 21:00. Click để TẮT để test tự do."
                  : "Đang TẮT giới hạn 21:00 (TỐI) — Cho phép test đặt bàn thoải mái bất kỳ lúc nào. Click để BẬT lại."
              }
              className={`hidden sm:flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-extrabold transition-all border cursor-pointer ${
                bookingValidationEnabled
                  ? "border-amber-300 bg-amber-100 text-amber-900 shadow-xs hover:bg-amber-200 ring-2 ring-amber-300/50"
                  : "border-slate-300 bg-slate-100 text-slate-400 hover:bg-slate-200 opacity-60"
              }`}
            >
              <Clock size={14} className={bookingValidationEnabled ? "text-amber-600 animate-pulse" : "text-slate-400"} />
              <span>{bookingValidationEnabled ? "Giới hạn giờ: BẬT" : "Giới hạn giờ: TẮT"}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/checkin")}
              title="Chấm công vào hoặc ra"
              className="hidden sm:flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-extrabold text-amber-700 transition-colors hover:bg-amber-100"
            >
              <Timer size={14} />
              Chấm công
            </button>

            {/* User Profile Card */}
            <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md border border-white/80 rounded-full pl-3 pr-1.5 py-1.5 shadow-xs">
              <div className="hidden text-right sm:block pl-1">
                <p className="text-xs font-extrabold text-[#1A1A1A] leading-tight">{user?.full_name || defaultName}</p>
                <p className="text-[10px] font-bold text-[#8B8B8B] leading-tight">
                  {ROLE_LABELS[displayRole]}
                </p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F5C344] text-[#1A1A1A] font-black text-xs shadow-xs">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <User size={15} />}
              </div>

              {/* Logout button */}
              <button
                type="button"
                onClick={() => dispatch(logoutAction())}
                title="Đăng xuất"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </header>

        {/* Main View Area */}
        <main className="flex-1 overflow-y-auto px-3 py-2 md:px-5 md:py-3 scrollbar-none">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
