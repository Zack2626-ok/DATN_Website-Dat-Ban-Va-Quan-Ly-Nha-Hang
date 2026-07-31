import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Settings,
  ChevronDown,
  ChevronRight,
  Users,
  Utensils,
  Database,
  Grid,
  CalendarDays,
  Clock,
  LineChart,
  TrendingDown,
  BadgeCheck,
  Building2,
  CircleDollarSign,
} from "lucide-react";
import { useAppSelector } from "../../../store/hooks";
import { ROLE_LABELS } from "../../../constants/roles";

/**
 * ManagerSidebar - Sidebar riêng cho Manager role với accordion menu
 */
export const ManagerSidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAppSelector((state) => state.auth);
  const [isSystemMenuOpen, setIsSystemMenuOpen] = useState(true);
  const normalizedRole = (user?.role || "manager").toLowerCase();
  const isAdmin = normalizedRole === "admin";
  const isManager = normalizedRole === "manager";
  const canAccessOperations = isAdmin || isManager;
  const canViewReports = isAdmin || isManager;
  const canManageSystem = isAdmin;

  // Check if route is active
  const isRouteActive = (to: string) => {
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-sky-100 bg-gray-900 md:w-64 md:border-b-0 md:border-r">
      {/* Header */}
      <div className="border-b border-gray-800 p-5">
        <Link to="/manager/dashboard" className="text-lg font-bold text-white hover:text-gray-200">
          ResManager
        </Link>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          {ROLE_LABELS[user?.role || "manager"]}
        </p>
        <div className="mt-3 rounded-xl border border-sky-700/40 bg-slate-800/80 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Vai trò</span>
            <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${isAdmin ? "bg-emerald-500/20 text-emerald-300" : "bg-sky-500/20 text-sky-300"}`}>
              {isAdmin ? "Admin" : "Manager"}
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold text-white">
            {isAdmin ? "Bạn thấy toàn bộ menu quản trị" : "Bạn thấy menu vận hành và báo cáo"}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {isAdmin ? "Tất cả chức năng điều hành đang mở" : "Một số mục quản trị nâng cao bị ẩn đi"}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {!canAccessOperations ? null : (
          <>
            {/* Dashboard - Top Level Item */}
            <Link
              to="/manager/dashboard"
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isRouteActive("/manager/dashboard")
                ? "bg-sky-500 text-white"
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
            >
              <span className="flex items-center gap-2.5">
                <LayoutDashboard size={16} />
                Dashboard
              </span>
            </Link>

            {/* Quản lý bàn */}
            <Link
              to="/manager/tables"
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isRouteActive("/manager/tables")
                ? "bg-sky-500 text-white"
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
            >
              <span className="flex items-center gap-2.5">
                <Grid size={16} />
                Quản lý bàn
              </span>
            </Link>

            {/* Quản lý đặt bàn */}
            <Link
              to="/manager/bookings"
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isRouteActive("/manager/bookings")
                ? "bg-sky-500 text-white"
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
            >
              <span className="flex items-center gap-2.5">
                <CalendarDays size={16} />
                Quản lý đặt bàn
              </span>
            </Link>

            {/* Quản lý đơn hàng */}
            {/* <Link
              to="/manager/dashboard"
              className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <ShoppingBag size={16} />
                Quản lý đơn hàng
              </span>
              <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                Soon
              </span>
            </Link> */}

            {/* Ca làm việc */}
            <Link
              to="/manager/shifts"
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isRouteActive("/manager/shifts")
                ? "bg-sky-500 text-white"
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
            >
              <span className="flex items-center gap-2.5">
                <Clock size={16} />
                Ca làm việc
              </span>
            </Link>

            {/* Quản trị hệ thống - Accordion */}
            <div className="space-y-1">
              <button
                onClick={() => setIsSystemMenuOpen(!isSystemMenuOpen)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <Settings size={16} />
                  Quản Lý
                </span>
                {isSystemMenuOpen ? (
                  <ChevronDown size={16} className="text-gray-400" />
                ) : (
                  <ChevronRight size={16} className="text-gray-400" />
                )}
              </button>

              {/* Accordion Content */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isSystemMenuOpen ? "max-h-64" : "max-h-0"
                  }`}
              >
                <div className="ml-4 space-y-1 py-1">
                  {/* Quản lý nhân viên */}
                  <Link
                    to="/manager/staff"
                    className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isRouteActive("/manager/staff")
                      ? "bg-sky-500 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Users size={14} />
                      Quản lý nhân viên
                    </span>
                  </Link>

                  {/* Quản lý thực đơn */}
                  <Link
                    to="/manager/menu"
                    className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isRouteActive("/manager/menu")
                      ? "bg-sky-500 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Utensils size={14} />
                      Quản lý thực đơn
                    </span>
                  </Link>

                  {/* Quản lý khuyến mãi */}
                  {/* <Link
                    to="/manager/promotions"
                    className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isRouteActive("/manager/promotions")
                      ? "bg-sky-500 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Ticket size={14} />
                      Quản lý khuyến mãi
                    </span>
                  </Link> */}

                  {/* Quản lý khách hàng */}
                  <Link
                    to="/manager/crm"
                    className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isRouteActive("/manager/crm")
                      ? "bg-sky-500 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <BadgeCheck size={14} />
                      Quản lý khách hàng
                    </span>
                  </Link>

                  {/* Báo cáo & thống kê */}
                  <Link
                    to="/manager/analytics"
                    className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isRouteActive("/manager/analytics")
                      ? "bg-sky-500 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <LineChart size={14} />
                      Báo cáo & thống kê
                    </span>
                  </Link>
                  {canViewReports && (
                    <>
                      <Link
                        to="/manager/finance-report"
                        className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isRouteActive("/manager/finance-report")
                          ? "bg-sky-500 text-white"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white"
                          }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <CircleDollarSign size={14} />
                          Báo cáo tài chính
                        </span>
                      </Link>
                      <Link
                        to="/manager/loss-debt-report"
                        className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isRouteActive("/manager/loss-debt-report")
                          ? "bg-sky-500 text-white"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white"
                          }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <TrendingDown size={14} />
                          Hao hụt & Công nợ
                        </span>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
            {canManageSystem && (
              <Link
                to="/admin/settings"
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isRouteActive("/admin/settings")
                  ? "bg-amber-500 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
              >
                <span className="flex items-center gap-2.5">
                  <Building2 size={16} />
                  Cài đặt nhà hàng
                </span>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                  Admin
                </span>
              </Link>
            )}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="hidden border-t border-gray-800 p-4 text-xs text-gray-400 md:flex md:items-center md:gap-2">
        <Database size={12} className="text-green-400" />
        Hệ thống online
        <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-green-400" />
      </div>
    </aside>
  );
};
