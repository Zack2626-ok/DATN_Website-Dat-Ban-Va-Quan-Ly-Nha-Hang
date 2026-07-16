import React from "react";
import { Outlet } from "react-router-dom";
import { Bell, LogOut, Search, User } from "lucide-react";
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
  const { user } = useAppSelector((state) => state.auth);
  const searchQuery = useAppSelector((state) => state.ui.searchQuery);
  const displayRole = user?.role || "manager";
  const defaultName = displayRole === "manager" ? "Restaurant Manager" : "Demo User";

  return (
    <div className="flex min-h-screen flex-col bg-sky-50/50 text-slate-600 md:flex-row">
      {/* Sidebar */}
      <ManagerSidebar />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-sky-100 bg-white px-6 py-4">
          <div className="relative hidden max-w-sm flex-1 sm:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => dispatch(setSearchQuery(e.target.value))}
              className="w-full rounded-lg border border-sky-100 bg-sky-50/50 py-2 pl-9 pr-8 text-sm focus:border-sky-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => dispatch(clearSearchQuery())}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-slate-500 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="ml-auto flex items-center gap-4">
            <button type="button" className="relative rounded-lg p-2 text-slate-400 hover:bg-sky-100">
              <Bell size={18} />
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white">
                3
              </span>
            </button>
            <div className="flex items-center gap-2">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-600">{user?.full_name || defaultName}</p>
                <p className="text-xs text-gray-400">{ROLE_LABELS[displayRole]}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-slate-400">
                <User size={16} />
              </div>
              <button
                type="button"
                onClick={() => dispatch(logoutAction())}
                title="Đăng xuất"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
