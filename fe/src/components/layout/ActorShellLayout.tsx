import React, { useState, useEffect, useRef } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, Database, LogOut, Search, User, X, CheckCircle, UtensilsCrossed, Phone, Timer } from "lucide-react";
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
              if (displayRole !== "chef") {
                toast.success(notif.message, { duration: 5000 });
              }
            });
            if (displayRole !== "chef") {
              playBeepSound();
            }
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
    <div className="min-h-screen w-full bg-[#E4E4E4] text-[#1A1A1A] flex flex-col md:flex-row font-sans p-2 md:p-3.5 gap-2 md:gap-3.5 select-none">
      {/* Floating Sidebar Container */}
      <aside className="flex w-full shrink-0 flex-col md:w-72 p-2 font-sans select-none z-20">
        <div className="flex flex-1 flex-col rounded-[24px] bg-gradient-to-b from-[#F0F0F0] to-[#EAEAEA] border border-white/80 shadow-xs p-4 w-full">
          {/* Header - ResManager + UtensilsCrossed */}
          <div className="flex items-center gap-2.5 pb-3.5 border-b border-[#8A8A8A]/20">
            <UtensilsCrossed size={20} strokeWidth={1.8} className="text-[#1A1A1A]" />
            <Link to={homeLink} className="text-lg font-black text-[#1A1A1A] tracking-tight font-sans">
              ResManager
            </Link>
            <span className="ml-auto text-[10px] font-bold text-[#8A8A8A] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FFFFFF] border border-[#8A8A8A]/20">
              {ROLE_LABELS[displayRole] || displayRole}
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-2 overflow-y-auto py-3.5 scrollbar-none">
            {navLinks.map((link) => {
              const isActive =
                location.pathname === link.to ||
                (link.to !== "/" && location.pathname.startsWith(`${link.to}/`));
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`group flex items-center justify-between rounded-full px-4 py-2.5 text-[15px] font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-[#1A1A1A] text-[#FFFFFF] shadow-md"
                      : "text-[#1A1A1A] hover:bg-[#FFFFFF]/60"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    {link.icon}
                    {link.label}
                  </span>
                  {link.badge !== undefined && link.badge > 0 && (
                    <span className="rounded-full bg-[#EC4899] px-2 py-0.5 text-[10px] font-extrabold text-white shadow-xs">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer Contact / Realtime Indicator */}
          <div className="pt-3 mt-auto border-t border-[#8A8A8A]/20 flex flex-col gap-2 text-[12px] font-medium text-[#8A8A8A]">
            {restaurantInfo && (
              <a
                href={`tel:${restaurantInfo.hotline.replace(/\s/g, "")}`}
                className="flex items-center gap-2 rounded-full bg-[#FFFFFF] px-3 py-1.5 text-[#1A1A1A] border border-slate-200/60 shadow-2xs hover:bg-slate-50 transition-colors"
              >
                <Phone size={13} strokeWidth={1.5} className="text-[#3E2016]" />
                <span className="font-bold text-[11px]">{restaurantInfo.hotline}</span>
              </a>
            )}
            <div className="flex items-center gap-2 pt-1">
              <Database size={14} strokeWidth={1.5} className="text-[#1A1A1A]" />
              <span>Hệ thống thời gian thực</span>
              <span className="ml-auto h-2 w-2 rounded-full bg-[#EC4899]" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Top Header */}
        <header className="flex items-center justify-between px-4 py-3 md:px-6">
          <div className="relative hidden max-w-sm flex-1 sm:block">
            <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md border border-white/80 rounded-full px-4 py-2 shadow-xs">
              <Search size={16} className="text-[#8A8A8A]" />
              <input
                type="text"
                placeholder="Tìm kiếm thông tin..."
                value={searchQuery}
                onChange={(e) => dispatch(setSearchQuery(e.target.value))}
                className="w-full bg-transparent text-sm text-[#1A1A1A] placeholder-[#8A8A8A] focus:outline-none font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => dispatch(clearSearchQuery())}
                  className="text-[#8A8A8A] hover:text-[#1A1A1A] cursor-pointer"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {actorRole === "waiter" ? (
              <WaiterNotificationBell />
            ) : (
              /* Notification Bell with Dropdown */
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/90 border border-white/80 text-[#1A1A1A] shadow-xs hover:bg-white transition-colors cursor-pointer"
                  title="Thông báo"
                >
                  <Bell size={18} strokeWidth={1.5} />
                  {notifications.filter((n) => !n.is_read).length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#EC4899] text-white text-[8px] font-bold px-1 shadow-xs">
                      {notifications.filter((n) => !n.is_read).length}
                    </span>
                  )}
                </button>

                {dropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setDropdownOpen(false)}
                    />

                    <div className="absolute right-0 mt-2.5 w-80 rounded-3xl bg-white/95 backdrop-blur-xl border border-slate-200/70 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 p-2">
                      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Thông báo</span>
                        {notifications.filter((n) => !n.is_read).length > 0 && (
                          <button
                            type="button"
                            onClick={handleMarkAllAsRead}
                            className="text-[11px] font-bold text-[#3E2016] hover:underline cursor-pointer"
                          >
                            Đánh dấu đã đọc
                          </button>
                        )}
                      </div>

                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 scrollbar-none">
                        {notifications.length === 0 ? (
                          <div className="py-8 text-center text-xs font-medium text-[#8A8A8A]">
                            Không có thông báo mới
                          </div>
                        ) : (
                          notifications.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => handleNotificationClick(item)}
                              className={`p-3 text-xs cursor-pointer transition-colors hover:bg-slate-50 flex items-start gap-2.5 ${
                                !item.is_read ? "bg-amber-50/50 font-bold" : "text-[#8A8A8A]"
                              }`}
                            >
                              <CheckCircle size={14} className="text-[#3E2016] mt-0.5 shrink-0" />
                              <div className="flex-1">
                                <p className="text-[#1A1A1A] font-semibold">{item.message}</p>
                                <span className="text-[10px] text-[#8A8A8A] mt-1 block">
                                  {formatTime(item.created_at)}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Profile Pill Card */}
            <button
              type="button"
              onClick={() => navigate("/checkin")}
              title="Chấm công vào hoặc ra"
              className="hidden sm:flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-extrabold text-amber-700 transition-colors hover:bg-amber-100"
            >
              <Timer size={14} />
              Chấm công
            </button>
            <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md border border-white/80 rounded-full pl-3 pr-1.5 py-1.5 shadow-xs">
              <div className="hidden text-right sm:block pl-1">
                <p className="text-xs font-bold text-[#1A1A1A] flex items-center justify-end gap-1.5">
                  <span>{user?.full_name || defaultName}</span>
                  {user && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-[#1A1A1A] border border-slate-200">
                      {user.employee_code || `NV${String(user.id).padStart(3, "0")}`}
                    </span>
                  )}
                </p>
                <p className="text-[10px] font-semibold text-[#8A8A8A]">{ROLE_LABELS[displayRole]}</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1A1A1A] text-white">
                <User size={15} />
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutModal(true)}
                title="Đăng xuất"
                className="flex items-center justify-center h-8 w-8 rounded-full text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto p-4 md:p-6 ${mainClassName}`}>
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
              type="button"
              onClick={() => setShowLogoutModal(false)}
              className="px-4 py-2 rounded-full text-xs font-extrabold border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => {
                setShowLogoutModal(false);
                dispatch(logoutAction());
                navigate("/auth/login", { replace: true });
              }}
              className="px-5 py-2 rounded-full text-xs font-black bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer shadow-xs"
            >
              Đăng xuất
            </button>
          </div>
        }
      >
        <p className="text-slate-700 text-xs font-medium">Bạn có chắc chắn muốn đăng xuất khỏi hệ thống ResManager không?</p>
      </Modal>
    </div>
  );
};
