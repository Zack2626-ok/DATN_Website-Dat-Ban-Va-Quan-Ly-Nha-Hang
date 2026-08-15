import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Grid,
  CalendarDays,
  Clock,
  Users,
  Utensils,
  UtensilsCrossed,
  BadgeCheck,
  LineChart,
  CircleDollarSign,
  TrendingDown,
  Building2,
  Database,
  ChevronDown,
  Minus,
  QrCode,
} from "lucide-react";
import { useAppSelector } from "../../../store/hooks";

/**
 * ManagerSidebar - Recreated Two-Column Neumorphic Soft-UI Sidebar
 * Adheres strictly to the monochrome grayscale specification & hex color palette.
 */
export const ManagerSidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAppSelector((state) => state.auth);
  const normalizedRole = (user?.role || "manager").toLowerCase();
  const isAdmin = normalizedRole === "admin";
  const isManager = normalizedRole === "manager";
  const canAccessOperations = isAdmin || isManager;
  const canViewReports = isAdmin || isManager;
  const canManageSystem = isAdmin;

  // Accordion section states
  const [openOps, setOpenOps] = useState(true);
  const [openManagement, setOpenManagement] = useState(true);
  const [openReports, setOpenReports] = useState(true);
  const [openFinance, setOpenFinance] = useState(true);

  // Active status helpers
  const isRouteActive = (to: string) => {
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  const isOpsActive =
    location.pathname.startsWith("/manager/tables") ||
    location.pathname.startsWith("/manager/bookings") ||
    location.pathname.startsWith("/manager/qrcodes") ||
    location.pathname.startsWith("/manager/shifts");

  const isManagementActive =
    location.pathname.startsWith("/manager/staff") ||
    location.pathname.startsWith("/manager/menu") ||
    location.pathname.startsWith("/manager/crm");

  const isReportsActive =
    location.pathname.startsWith("/manager/analytics") ||
    location.pathname.startsWith("/manager/finance-report") ||
    location.pathname.startsWith("/manager/loss-debt-report");

  const isFinanceActive =
    location.pathname.startsWith("/manager/payrolls") ||
    location.pathname.startsWith("/manager/expenses");

  return (
    <aside className="flex w-full shrink-0 flex-col md:w-72 p-2 font-sans select-none">
      {/* Expanded Menu Panel */}
      <div className="flex flex-1 flex-col rounded-[24px] bg-gradient-to-b from-[#F0F0F0] to-[#EAEAEA] border border-white/80 shadow-xs p-4 w-full">
        {/* Header - ResManager + UtensilsCrossed */}
        <div className="flex items-center gap-2.5 pb-3.5 border-b border-[#8A8A8A]/20">
          <UtensilsCrossed size={20} strokeWidth={1.8} className="text-[#1A1A1A]" />
          <span className="text-lg font-black text-[#1A1A1A] tracking-tight font-sans">
            ResManager
          </span>
          <span className="ml-auto text-[10px] font-bold text-[#8A8A8A] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FFFFFF] border border-[#8A8A8A]/20">
            {isAdmin ? "Admin" : "Manager"}
          </span>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 space-y-3 overflow-y-auto py-3.5 scrollbar-none">
          {!canAccessOperations ? null : (
            <>
              {/* Dashboard Item */}
              <Link
                to="/manager/dashboard"
                className={`group flex items-center justify-between rounded-full px-4 py-2.5 text-[15px] font-medium transition-all duration-200 ${
                  isRouteActive("/manager/dashboard")
                    ? "bg-[#1A1A1A] text-[#FFFFFF] shadow-md"
                    : "text-[#1A1A1A] hover:bg-[#FFFFFF]/60"
                }`}
              >
                <span className="flex items-center gap-3">
                  <LayoutDashboard
                    size={18}
                    strokeWidth={1.5}
                    className={
                      isRouteActive("/manager/dashboard")
                        ? "text-[#FFFFFF]"
                        : "text-[#1A1A1A]"
                    }
                  />
                  Dashboard
                </span>
              </Link>

              {/* Vận Hành Section (Parent item + Tree sub-items) */}
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setOpenOps(!openOps)}
                  className={`w-full group flex items-center justify-between rounded-full px-4 py-2.5 text-[15px] font-medium transition-all duration-200 cursor-pointer ${
                    isOpsActive
                      ? "bg-[#1A1A1A] text-[#FFFFFF] shadow-md"
                      : "text-[#1A1A1A] hover:bg-[#FFFFFF]/60"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Grid
                      size={18}
                      strokeWidth={1.5}
                      className={isOpsActive ? "text-[#FFFFFF]" : "text-[#1A1A1A]"}
                    />
                    Vận Hành
                  </span>
                  {openOps ? (
                    <Minus size={16} strokeWidth={1.5} />
                  ) : (
                    <ChevronDown size={16} strokeWidth={1.5} />
                  )}
                </button>

                {/* Sub-items tree with vertical guide line */}
                {openOps && (
                  <div className="ml-5 border-l border-[#8A8A8A]/30 pl-4 space-y-1.5 py-1">
                    <Link
                      to="/manager/tables"
                      className={`flex items-center gap-3 px-3.5 py-2 rounded-full text-[14px] font-medium transition-all duration-150 ${
                        isRouteActive("/manager/tables")
                          ? "bg-[#FFFFFF] text-[#1A1A1A] shadow-xs border border-slate-200/50"
                          : "text-[#8A8A8A] hover:text-[#1A1A1A]"
                      }`}
                    >
                      <Grid size={16} strokeWidth={1.5} />
                      Quản lý bàn
                    </Link>

                    <Link
                      to="/manager/bookings"
                      className={`flex items-center justify-between gap-3 px-3.5 py-2 rounded-full text-[14px] font-medium transition-all duration-150 ${
                        isRouteActive("/manager/bookings")
                          ? "bg-[#FFFFFF] text-[#1A1A1A] shadow-xs border border-slate-200/50"
                          : "text-[#8A8A8A] hover:text-[#1A1A1A]"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <CalendarDays size={16} strokeWidth={1.5} />
                        Quản lý đặt bàn
                      </span>
                      <span className="h-2 w-2 rounded-full bg-[#EC4899]" />
                    </Link>

                    <Link
                      to="/manager/qrcodes"
                      className={`flex items-center gap-3 px-3.5 py-2 rounded-full text-[14px] font-medium transition-all duration-150 ${
                        isRouteActive("/manager/qrcodes")
                          ? "bg-[#FFFFFF] text-[#1A1A1A] shadow-xs border border-slate-200/50"
                          : "text-[#8A8A8A] hover:text-[#1A1A1A]"
                      }`}
                    >
                      <QrCode size={16} strokeWidth={1.5} />
                      Thiết lập QR Code
                    </Link>

                    <Link
                      to="/manager/shifts"
                      className={`flex items-center gap-3 px-3.5 py-2 rounded-full text-[14px] font-medium transition-all duration-150 ${
                        isRouteActive("/manager/shifts")
                          ? "bg-[#FFFFFF] text-[#1A1A1A] shadow-xs border border-slate-200/50"
                          : "text-[#8A8A8A] hover:text-[#1A1A1A]"
                      }`}
                    >
                      <Clock size={16} strokeWidth={1.5} />
                      Ca làm việc
                    </Link>
                  </div>
                )}
              </div>

              {/* Quản Lý Section (Parent item + Tree sub-items) */}
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setOpenManagement(!openManagement)}
                  className={`w-full group flex items-center justify-between rounded-full px-4 py-2.5 text-[15px] font-medium transition-all duration-200 cursor-pointer ${
                    isManagementActive
                      ? "bg-[#1A1A1A] text-[#FFFFFF] shadow-md"
                      : "text-[#1A1A1A] hover:bg-[#FFFFFF]/60"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Utensils
                      size={18}
                      strokeWidth={1.5}
                      className={
                        isManagementActive ? "text-[#FFFFFF]" : "text-[#1A1A1A]"
                      }
                    />
                    Quản Lý
                  </span>
                  {openManagement ? (
                    <Minus size={16} strokeWidth={1.5} />
                  ) : (
                    <ChevronDown size={16} strokeWidth={1.5} />
                  )}
                </button>

                {/* Sub-items tree with vertical guide line */}
                {openManagement && (
                  <div className="ml-5 border-l border-[#8A8A8A]/30 pl-4 space-y-1.5 py-1">
                    <Link
                      to="/manager/staff"
                      className={`flex items-center gap-3 px-3.5 py-2 rounded-full text-[14px] font-medium transition-all duration-150 ${
                        isRouteActive("/manager/staff")
                          ? "bg-[#FFFFFF] text-[#1A1A1A] shadow-xs border border-slate-200/50"
                          : "text-[#8A8A8A] hover:text-[#1A1A1A]"
                      }`}
                    >
                      <Users size={16} strokeWidth={1.5} />
                      Quản lý nhân viên
                    </Link>

                    <Link
                      to="/manager/menu"
                      className={`flex items-center gap-3 px-3.5 py-2 rounded-full text-[14px] font-medium transition-all duration-150 ${
                        isRouteActive("/manager/menu")
                          ? "bg-[#FFFFFF] text-[#1A1A1A] shadow-xs border border-slate-200/50"
                          : "text-[#8A8A8A] hover:text-[#1A1A1A]"
                      }`}
                    >
                      <Utensils size={16} strokeWidth={1.5} />
                      Quản lý thực đơn
                    </Link>

                    <Link
                      to="/manager/crm"
                      className={`flex items-center gap-3 px-3.5 py-2 rounded-full text-[14px] font-medium transition-all duration-150 ${
                        isRouteActive("/manager/crm")
                          ? "bg-[#FFFFFF] text-[#1A1A1A] shadow-xs border border-slate-200/50"
                          : "text-[#8A8A8A] hover:text-[#1A1A1A]"
                      }`}
                    >
                      <BadgeCheck size={16} strokeWidth={1.5} />
                      Quản lý khách hàng
                    </Link>
                  </div>
                )}
              </div>

              {/* Quản Lý Tiền & Chi Phí Section (Parent item + Tree sub-items) */}
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setOpenFinance(!openFinance)}
                  className={`w-full group flex items-center justify-between rounded-full px-4 py-2.5 text-[15px] font-medium transition-all duration-200 cursor-pointer ${
                    isFinanceActive
                      ? "bg-[#1A1A1A] text-[#FFFFFF] shadow-md"
                      : "text-[#1A1A1A] hover:bg-[#FFFFFF]/60"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <CircleDollarSign
                      size={18}
                      strokeWidth={1.5}
                      className={
                        isFinanceActive ? "text-[#FFFFFF]" : "text-[#1A1A1A]"
                      }
                    />
                    Quản Lý Tiền & Chi Phí
                  </span>
                  {openFinance ? (
                    <Minus size={16} strokeWidth={1.5} />
                  ) : (
                    <ChevronDown size={16} strokeWidth={1.5} />
                  )}
                </button>

                {/* Sub-items tree with vertical guide line */}
                {openFinance && (
                  <div className="ml-5 border-l border-[#8A8A8A]/30 pl-4 space-y-1.5 py-1">
                    <Link
                      to="/manager/payrolls"
                      className={`flex items-center gap-3 px-3.5 py-2 rounded-full text-[14px] font-medium transition-all duration-150 ${
                        isRouteActive("/manager/payrolls")
                          ? "bg-[#FFFFFF] text-[#1A1A1A] shadow-xs border border-slate-200/50"
                          : "text-[#8A8A8A] hover:text-[#1A1A1A]"
                      }`}
                    >
                      <CircleDollarSign size={16} strokeWidth={1.5} />
                      Bảng lương
                    </Link>

                    <Link
                      to="/manager/expenses"
                      className={`flex items-center gap-3 px-3.5 py-2 rounded-full text-[14px] font-medium transition-all duration-150 ${
                        isRouteActive("/manager/expenses")
                          ? "bg-[#FFFFFF] text-[#1A1A1A] shadow-xs border border-slate-200/50"
                          : "text-[#8A8A8A] hover:text-[#1A1A1A]"
                      }`}
                    >
                      <CircleDollarSign size={16} strokeWidth={1.5} />
                      Chi phí hoạt động
                    </Link>
                  </div>
                )}
              </div>

              {/* Báo Cáo Section (Parent item + Tree sub-items) */}
              {canViewReports && (
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => setOpenReports(!openReports)}
                    className={`w-full group flex items-center justify-between rounded-full px-4 py-2.5 text-[15px] font-medium transition-all duration-200 cursor-pointer ${
                      isReportsActive
                        ? "bg-[#1A1A1A] text-[#FFFFFF] shadow-md"
                        : "text-[#1A1A1A] hover:bg-[#FFFFFF]/60"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <LineChart
                        size={18}
                        strokeWidth={1.5}
                        className={
                          isReportsActive ? "text-[#FFFFFF]" : "text-[#1A1A1A]"
                        }
                      />
                      Báo Cáo
                    </span>
                    {openReports ? (
                      <Minus size={16} strokeWidth={1.5} />
                    ) : (
                      <ChevronDown size={16} strokeWidth={1.5} />
                    )}
                  </button>

                  {/* Sub-items tree with vertical guide line */}
                  {openReports && (
                    <div className="ml-5 border-l border-[#8A8A8A]/30 pl-4 space-y-1.5 py-1">
                      <Link
                        to="/manager/analytics"
                        className={`flex items-center gap-3 px-3.5 py-2 rounded-full text-[14px] font-medium transition-all duration-150 ${
                          isRouteActive("/manager/analytics")
                            ? "bg-[#FFFFFF] text-[#1A1A1A] shadow-xs border border-slate-200/50"
                            : "text-[#8A8A8A] hover:text-[#1A1A1A]"
                        }`}
                      >
                        <LineChart size={16} strokeWidth={1.5} />
                        Báo cáo & thống kê
                      </Link>

                      <Link
                        to="/manager/finance-report"
                        className={`flex items-center gap-3 px-3.5 py-2 rounded-full text-[14px] font-medium transition-all duration-150 ${
                          isRouteActive("/manager/finance-report")
                            ? "bg-[#FFFFFF] text-[#1A1A1A] shadow-xs border border-slate-200/50"
                            : "text-[#8A8A8A] hover:text-[#1A1A1A]"
                        }`}
                      >
                        <CircleDollarSign size={16} strokeWidth={1.5} />
                        Báo cáo tài chính
                      </Link>

                      <Link
                        to="/manager/loss-debt-report"
                        className={`flex items-center gap-3 px-3.5 py-2 rounded-full text-[14px] font-medium transition-all duration-150 ${
                          isRouteActive("/manager/loss-debt-report")
                            ? "bg-[#FFFFFF] text-[#1A1A1A] shadow-xs border border-slate-200/50"
                            : "text-[#8A8A8A] hover:text-[#1A1A1A]"
                        }`}
                      >
                        <TrendingDown size={16} strokeWidth={1.5} />
                        Hao hụt & Công nợ
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Admin Settings */}
              {canManageSystem && (
                <Link
                  to="/admin/settings"
                  className={`group flex items-center justify-between rounded-full px-4 py-2.5 text-[15px] font-medium transition-all duration-200 ${
                    isRouteActive("/admin/settings")
                      ? "bg-[#1A1A1A] text-[#FFFFFF] shadow-md"
                      : "text-[#1A1A1A] hover:bg-[#FFFFFF]/60"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Building2
                      size={18}
                      strokeWidth={1.5}
                      className={
                        isRouteActive("/admin/settings")
                          ? "text-[#FFFFFF]"
                          : "text-[#1A1A1A]"
                      }
                    />
                    Cài đặt nhà hàng
                  </span>
                  <span className="rounded-full bg-[#FFFFFF] px-2 py-0.5 text-[10px] font-bold text-[#8A8A8A] border border-[#8A8A8A]/20">
                    Admin
                  </span>
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Footer Indicator */}
        <div className="pt-3 mt-auto border-t border-[#8A8A8A]/20 flex items-center gap-2 text-[12px] font-medium text-[#8A8A8A]">
          <Database size={14} strokeWidth={1.5} className="text-[#1A1A1A]" />
          <span>Hệ thống thời gian thực</span>
          <span className="ml-auto h-2 w-2 rounded-full bg-[#EC4899]" />
        </div>
      </div>
    </aside>
  );
};

