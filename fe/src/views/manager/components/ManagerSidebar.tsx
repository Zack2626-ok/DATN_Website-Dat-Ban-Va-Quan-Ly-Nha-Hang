import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Settings,
  ChevronDown,
  ChevronRight,
  Users,
  Utensils,
  Calendar,
  Database,
  Grid,
  CalendarDays,
  UserCheck,
  Clock,
  LineChart,
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

  // Check if route is active
  const isRouteActive = (to: string) => {
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-gray-200 bg-gray-900 md:w-64 md:border-b-0 md:border-r">
      {/* Header */}
      <div className="border-b border-gray-800 p-5">
        <Link to="/manager/dashboard" className="text-lg font-bold text-white hover:text-gray-200">
          ResManager
        </Link>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          {ROLE_LABELS[user?.role || "manager"]}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {/* Dashboard - Top Level Item */}
        <Link
          to="/manager/dashboard"
          className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            isRouteActive("/manager/dashboard")
              ? "bg-[#FF5A5F] text-white"
              : "text-gray-300 hover:bg-gray-800 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-2.5">
            <LayoutDashboard size={16} />
            Tổng quan ca
          </span>
        </Link>

        {/* Sơ đồ bàn - Top Level Item */}
        <Link
          to="/manager/tables"
          className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            isRouteActive("/manager/tables")
              ? "bg-[#FF5A5F] text-white"
              : "text-gray-300 hover:bg-gray-800 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-2.5">
            <Grid size={16} />
            Sơ đồ bàn
          </span>
        </Link>

        {/* Đặt bàn - Top Level Item */}
        <Link
          to="/manager/bookings"
          className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            isRouteActive("/manager/bookings")
              ? "bg-[#FF5A5F] text-white"
              : "text-gray-300 hover:bg-gray-800 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-2.5">
            <CalendarDays size={16} />
            Đặt bàn
          </span>
        </Link>

        {/* Danh sách chờ - Top Level Item */}
        <Link
          to="/manager/waitlist"
          className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            isRouteActive("/manager/waitlist")
              ? "bg-[#FF5A5F] text-white"
              : "text-gray-300 hover:bg-gray-800 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-2.5">
            <UserCheck size={16} />
            Danh sách chờ
          </span>
        </Link>

        {/* Ca làm việc - Top Level Item */}
        <Link
          to="/manager/shifts"
          className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            isRouteActive("/manager/shifts")
              ? "bg-[#FF5A5F] text-white"
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
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isSystemMenuOpen ? "max-h-64" : "max-h-0"
            }`}
          >
            <div className="ml-4 space-y-1 py-1">
              {/* Quản lý Nhân sự */}
              <Link
                to="/manager/staff"
                className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isRouteActive("/manager/staff")
                    ? "bg-[#FF5A5F] text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Users size={14} />
                  Quản lý Nhân sự
                </span>
              </Link>

              {/* Quản lý Thực đơn */}
              <Link
                to="/manager/menu"
                className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isRouteActive("/manager/menu")
                    ? "bg-[#FF5A5F] text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Utensils size={14} />
                  Quản lý Thực đơn
                </span>
              </Link>

              {/* Cấu hình Sự kiện & Tiệc */}
              <Link
                to="/manager/events"
                className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isRouteActive("/manager/events")
                    ? "bg-[#FF5A5F] text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Calendar size={14} />
                  Cấu hình Sự kiện & Tiệc
                </span>
              </Link>

              {/* Báo cáo & Phân tích */}
              <Link
                to="/manager/analytics"
                className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isRouteActive("/manager/analytics")
                    ? "bg-[#FF5A5F] text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <LineChart size={14} />
                  Báo cáo & Phân tích
                </span>
              </Link>
            </div>
          </div>
        </div>
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
