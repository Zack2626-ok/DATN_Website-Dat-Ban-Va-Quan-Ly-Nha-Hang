import React, { useState, useEffect, useRef } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, Database, LogOut, Search, User, X, CheckCircle, UtensilsCrossed, Phone } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { ROLE_LABELS } from "../../constants/roles";
import type { UserRole } from "../../interfaces/auth";
import { setSearchQuery, clearSearchQuery } from "../../store/uiSlice";
import {
  getNotificationsApi,
  markNotificationAsReadApi,
  clearNotificationsApi,
} from "../../services/api";
import { toast } from "react-hot-toast";
import { Modal } from "../Modal";
import { getRestaurantInfo, type RestaurantInfo } from "../../services/restaurantInfoService";

const formatTime = (timeStr: string) => {
  try {
    const date = new Date(timeStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;

    return date.toLocaleDateString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch (e) {
    return "";
  }
};
import { logoutAction } from "../../store/authSlice";
import { getWaiterNotifications } from "../../services/waiterService";

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
  const [notifications, setNotifications] = useState<any[]>([]);
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
        className={`relative rounded-lg p-2 transition-colors cursor-pointer ${
          open ? "bg-sky-100 text-sky-600" : "text-slate-500 hover:bg-sky-50 hover:text-sky-600"
        }`}
        title="Thông báo"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-650 text-[9px] font-bold text-white px-1 shadow bg-red-600 animate-pulse">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-xl bg-white/95 backdrop-blur-xl border border-sky-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <UtensilsCrossed size={15} className="text-orange-500" />
              <span className="text-sm font-playfair font-bold text-sky-700 uppercase tracking-wider">Món đã xong — cần mang ra</span>
            </div>
            {count > 0 && (
              <button
                onClick={dismissAll}
                className="text-[11px] font-bold text-sky-600 hover:text-sky-700 transition-colors cursor-pointer"
              >
                Đánh dấu tất cả
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {visible.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-slate-500">
                <CheckCircle size={28} className="text-green-500 animate-bounce" />
                <p className="text-xs italic">Không có món nào cần mang ra</p>
              </div>
            ) : (
              visible.map((n) => (
                <div
                  key={n.item_id}
                  className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-orange-50/40 hover:text-slate-900 transition-colors"
                >
                  {/* Click vào phần text → điều hướng đến trang Order của bàn */}
                  <Link
                    to={n.table_id ? `/waiter/orders/${n.table_id}` : "/waiter/tables"}
                    onClick={() => setOpen(false)}
                    className="flex flex-1 items-start gap-3 min-w-0"
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600 border border-orange-100">
                      <UtensilsCrossed size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{n.item_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {n.table_name ? `Bàn ${n.table_name}` : "Mang về / Tại quầy"}
                        {" · "}Order #{n.order_id}
                      </p>
                      <p className="text-[10px] text-orange-600 font-medium mt-0.5">Nhấn để xem bàn →</p>
                    </div>
                  </Link>
                  <button
                    onClick={() => dismissOne(n.item_id)}
                    className="shrink-0 rounded p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 cursor-pointer"
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
            <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-2.5 text-center">
              <p className="text-[10px] text-slate-400 font-medium">Cập nhật tự động mỗi 20 giây</p>
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
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const searchQuery = useAppSelector((state) => state.ui.searchQuery);
  const displayRole = user?.role || actorRole;
  const defaultNames: Record<string, string> = {
    admin: "System Admin",
    manager: "Restaurant Manager",
    waiter: "Waiter 1",
    cashier: "Cashier 1",
    chef: "Chef 1",
    sales_event: "Sales Event 1",
  };
  const defaultName = defaultNames[displayRole] || "Demo User";

  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null);

  useEffect(() => {
    getRestaurantInfo()
      .then(setRestaurantInfo)
      .catch(() => {});
  }, []);

  // Clear search query on route changes to prevent query leakage
  React.useEffect(() => {
    dispatch(clearSearchQuery());
  }, [location.pathname, dispatch]);

  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);

  const playBeepSound = () => {
    try {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(660, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);

      setTimeout(() => {
        audioCtx.close();
      }, 500);
    } catch (err) {
      console.error("Failed to play notification beep sound:", err);
    }
  };

  // Track notified IDs to avoid duplicate toast side-effects in React 18 StrictMode
  const notifiedIdsRef = React.useRef<Set<number>>(new Set());
  const hasInitializedRef = React.useRef<boolean>(false);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => {
    let active = true;
    hasInitializedRef.current = false;
    notifiedIdsRef.current.clear();

    const fetchNotifications = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const data = await getNotificationsApi(displayRole);
        if (!active) return;

        const unreadItems = data.filter((n: any) => !n.is_read);

        if (!hasInitializedRef.current) {
          // Lần đầu tiên load: ghi nhận danh sách ID đã có để không nổ toast thông báo cũ
          unreadItems.forEach((n: any) => notifiedIdsRef.current.add(n.id));
          hasInitializedRef.current = true;
        } else {
          // Lần poll tiếp theo: lọc ra các thông báo mới chưa từng nổ toast
          const freshItems = unreadItems.filter((n: any) => !notifiedIdsRef.current.has(n.id));
          if (freshItems.length > 0) {
            freshItems.forEach((notif: any) => {
              notifiedIdsRef.current.add(notif.id);
              toast.success(notif.message, { duration: 5000 });
            });
            playBeepSound();
          }
        }

        setNotifications(data);
      } catch (err) {
        console.error("Failed to load notifications:", err);
      }
    };

    if (intervalRef.current) clearInterval(intervalRef.current);

    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, 30000); // 30s

    return () => {
      active = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [displayRole]);

  const handleMarkAsRead = async (id: number, isRead: boolean) => {
    if (isRead) return;
    try {
      await markNotificationAsReadApi(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  // Parse tên bàn từ message: "Bàn B02" hoặc "bàn B02"
  const parseTableNameFromMessage = (message: string): string | null => {
    const match = message.match(/[Bb]àn\s+([A-Z0-9]+)/i);
    return match ? match[1].toUpperCase() : null;
  };

  // Click notification: mark as read + navigate tới trang gọi món (waiter)
  const handleNotificationClick = async (item: any) => {
    // Mark as read
    await handleMarkAsRead(item.id, item.is_read);
    setDropdownOpen(false);

    // Chỉ navigate nếu là waiter
    if (displayRole !== "waiter" && displayRole !== "manager" && displayRole !== "admin") return;

    // Parse tên bàn từ message
    const tableName = parseTableNameFromMessage(item.message || "");
    if (!tableName) return;

    // Lấy danh sách bàn để tìm tableId
    try {
      const { getTablesV1 } = await import("../../services/tableService");
      const tables = await getTablesV1();
      const found = tables.find(
        (t: any) => t.name.toUpperCase() === tableName
      );
      if (found) {
        navigate(`/waiter/orders/${found.id}`);
      }
    } catch (err) {
      console.error("Failed to navigate to order page:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await clearNotificationsApi(displayRole);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-transparent text-slate-800 md:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b border-sky-700 bg-gradient-to-b from-sky-600 to-sky-800 md:w-64 md:border-b-0 md:border-r z-20 shadow-xl">
        <div className="border-b border-white/10 p-5">
          <Link to={homeLink} className="text-2xl font-playfair font-bold text-white hover:text-sky-100 drop-shadow-sm tracking-wide">
            ResManager
          </Link>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-sky-200">
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
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive
                  ? "bg-white/20 text-white font-bold border border-white/10 shadow-sm"
                  : "text-sky-100 hover:bg-white/10 hover:text-white border border-transparent"
                  }`}
              >
                <span className="flex items-center gap-2.5">
                  {link.icon}
                  {link.label}
                </span>
                {link.badge !== undefined && link.badge > 0 && (
                  <span className="rounded bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden border-t border-white/10 p-4 text-xs text-sky-200 md:flex md:flex-col md:gap-2">
          {restaurantInfo && (
            <a
              href={`tel:${restaurantInfo.hotline.replace(/\s/g, "")}`}
              className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-white hover:bg-white/20 transition-colors mb-1"
            >
              <Phone size={13} className="text-green-300" />
              <span className="font-bold text-[11px]">{restaurantInfo.hotline}</span>
            </a>
          )}
          <div className="flex items-center gap-2">
            <Database size={12} className="text-green-300" />
            Hệ thống online
            <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-green-300 shadow-[0_0_8px_rgba(134,239,172,0.8)]" />
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden relative">
        <header className="flex items-center justify-between bg-white/80 backdrop-blur-xl px-6 py-4 z-10 border-b border-sky-100 shadow-sm relative">
          <div className="relative hidden max-w-sm flex-1 sm:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => dispatch(setSearchQuery(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white/50 py-2 pl-9 pr-8 text-sm text-slate-700 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
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
            {actorRole === "waiter" ? (
              <WaiterNotificationBell />
            ) : (
              /* Notification Bell with Dropdown */
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={`relative rounded-lg p-2 transition-colors cursor-pointer ${
                    dropdownOpen ? "bg-sky-100 text-sky-600" : "text-slate-500 hover:bg-sky-50 hover:text-sky-600"
                  }`}
                >
                  <Bell size={18} />
                  {notifications.filter((n) => !n.is_read).length > 0 && (
                    <span className="absolute right-1 top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-sky-500 text-white text-[8px] font-bold px-1 shadow-sm">
                      {notifications.filter((n) => !n.is_read).length}
                    </span>
                  )}
                </button>

                {dropdownOpen && (
                  <>
                    {/* Overlay background to dismiss */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setDropdownOpen(false)}
                    />

                    {/* Dropdown Container */}
                    <div className="absolute right-0 mt-2.5 w-80 rounded-xl bg-white/95 backdrop-blur-xl border border-sky-100 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                        <span className="text-xs font-playfair font-bold text-sky-700 uppercase tracking-widest">Thông báo</span>
                        {notifications.filter((n) => !n.is_read).length > 0 && (
                          <button
                            onClick={handleMarkAllAsRead}
                            className="text-[11px] font-bold text-sky-600 hover:text-sky-700 transition-colors cursor-pointer"
                          >
                            Đọc tất cả
                          </button>
                        )}
                      </div>

                      {/* Notification list */}
                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                        {notifications.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center text-slate-500">
                            <Bell size={24} className="mb-2 text-slate-400" />
                            <p className="text-xs italic">Không có thông báo nào</p>
                          </div>
                        ) : (
                          notifications.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => handleNotificationClick(item)}
                              className={`flex flex-col gap-1 px-4 py-3 text-left transition-colors cursor-pointer select-none ${
                                item.is_read ? "bg-transparent hover:bg-slate-50" : "bg-sky-50/50 hover:bg-sky-50"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1.5">
                                <span className={`text-[12px] leading-tight ${item.is_read ? "text-slate-600 font-medium" : "text-sky-900 font-bold"}`}>
                                  {item.message}
                                </span>
                                {!item.is_read && (
                                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-500 animate-pulse shadow-[0_0_8px_rgba(14,165,233,0.6)]" />
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {formatTime(item.created_at)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-700 flex items-center justify-end gap-1.5">
                  <span>{user?.full_name || defaultName}</span>
                  {user && (
                    <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 border border-sky-200">
                      {user.employee_code || `NV${String(user.id).padStart(3, "0")}`}
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500">{ROLE_LABELS[displayRole]}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-sky-600 border border-sky-100">
                <User size={16} />
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutModal(true)}
                title="Đăng xuất"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer ml-1"
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

      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Xác nhận đăng xuất"
        size="sm"
        theme="light"
        footer={
          <div className="flex w-full gap-3 justify-end">
            <button
              onClick={() => setShowLogoutModal(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={() => {
                setShowLogoutModal(false);
                dispatch(logoutAction());
                navigate("/auth/login", { replace: true });
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-rose-500 text-white hover:bg-rose-600 transition-colors cursor-pointer shadow-[0_0_15px_rgba(244,63,94,0.3)]"
            >
              Đăng xuất
            </button>
          </div>
        }
      >
        <p className="text-slate-600 text-sm">Bạn có chắc chắn muốn đăng xuất khỏi hệ thống ResManager không?</p>
      </Modal>
    </div>
  );
};
