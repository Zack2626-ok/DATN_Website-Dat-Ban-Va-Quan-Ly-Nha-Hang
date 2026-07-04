import React, { useState, useEffect, useRef } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Bell, CheckCircle, Database, LogOut, Search, User, X, UtensilsCrossed } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { ROLE_LABELS } from "../../constants/roles";
import type { UserRole } from "../../interfaces/auth";
import { setSearchQuery, clearSearchQuery } from "../../store/uiSlice";
import { logoutAction } from "../../store/authSlice";
import { getWaiterNotifications, type WaiterNotification } from "../../services/waiterService";

export interface NavLinkItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface ActorShellLayoutProps {
  actorRole: UserRole;
  navLinks: NavLinkItem[];
  homeLink: string;
  mainClassName?: string;
}

/** Bell thông báo món xong — chỉ dùng cho waiter */
const WaiterNotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<WaiterNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const data = await getWaiterNotifications();
      setNotifications(data);
    } catch {
      // silent fail
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000); // poll mỗi 20 giây
    return () => clearInterval(interval);
  }, []);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const visible = notifications.filter((n) => !dismissed.has(n.item_id));
  const count = visible.length;

  const dismissOne = (id: number) => setDismissed((prev) => new Set(prev).add(id));
  const dismissAll = () => setDismissed(new Set(notifications.map((n) => n.item_id)));

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors"
        title="Thông báo"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white animate-pulse">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-gray-100 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <UtensilsCrossed size={15} className="text-orange-500" />
              <span className="text-sm font-bold text-gray-800">Món đã xong — cần mang ra</span>
            </div>
            {count > 0 && (
              <button
                onClick={dismissAll}
                className="text-[11px] text-blue-600 hover:underline font-medium"
              >
                Đánh dấu tất cả
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto">
            {visible.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-gray-400">
                <CheckCircle size={28} className="text-green-400" />
                <p className="text-sm">Không có món nào cần mang ra</p>
              </div>
            ) : (
              visible.map((n) => (
                <div
                  key={n.item_id}
                  className="flex items-start gap-3 border-b border-gray-50 px-4 py-3 hover:bg-orange-50 transition-colors"
                >
                  {/* Click vào phần text → điều hướng đến trang Order của bàn */}
                  <Link
                    to={n.table_id ? `/waiter/orders/${n.table_id}` : "/waiter/tables"}
                    onClick={() => setOpen(false)}
                    className="flex flex-1 items-start gap-3 min-w-0"
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100">
                      <UtensilsCrossed size={13} className="text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{n.item_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {n.table_name ? `Bàn ${n.table_name}` : "Mang về / Tại quầy"}
                        {" · "}Order #{n.order_id}
                      </p>
                      <p className="text-[10px] text-orange-500 font-medium mt-0.5">Nhấn để xem bàn →</p>
                    </div>
                  </Link>
                  <button
                    onClick={() => dismissOne(n.item_id)}
                    className="shrink-0 rounded p-1 text-gray-300 hover:text-gray-500 hover:bg-gray-100"
                    title="Bỏ qua"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {visible.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2.5 text-center">
              <p className="text-xs text-gray-400">Cập nhật tự động mỗi 20 giây</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const ActorShellLayout: React.FC<ActorShellLayoutProps> = ({
  actorRole,
  navLinks,
  homeLink,
  mainClassName = "",
}) => {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const searchQuery = useAppSelector((state) => state.ui.searchQuery);
  const displayRole = user?.role || actorRole;

  // Clear search query on route changes to prevent query leakage
  React.useEffect(() => {
    dispatch(clearSearchQuery());
  }, [location.pathname, dispatch]);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-700 md:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b border-gray-200 bg-gray-900 md:w-64 md:border-b-0 md:border-r">
        <div className="border-b border-gray-800 p-5">
          <Link to={homeLink} className="text-lg font-bold text-white hover:text-blue-300">
            ResManager
          </Link>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            {ROLE_LABELS[displayRole]}
          </p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navLinks.map((link) => {
            const isActive =
              location.pathname === link.to || location.pathname.startsWith(`${link.to}/`);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-700 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  {link.icon}
                  {link.label}
                </span>
                {link.badge !== undefined && link.badge > 0 && (
                  <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden border-t border-gray-800 p-4 text-xs text-gray-400 md:flex md:items-center md:gap-2">
          <Database size={12} className="text-green-400" />
          Hệ thống online
          <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-green-400" />
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <div className="relative hidden max-w-sm flex-1 sm:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => dispatch(setSearchQuery(e.target.value))}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-8 text-sm focus:border-blue-700 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => dispatch(clearSearchQuery())}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="ml-auto flex items-center gap-4">
            {/* Bell thông báo thực — chỉ waiter */}
            {actorRole === "waiter" ? (
              <WaiterNotificationBell />
            ) : (
              <button type="button" className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100">
                <Bell size={18} />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-gray-700">{user?.full_name || "Demo User"}</p>
                <p className="text-xs text-gray-400">{ROLE_LABELS[displayRole]}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500">
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

        <main className={`flex-1 overflow-y-auto p-6 ${mainClassName}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
