import React, { useState, useEffect, useRef, useCallback } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, Database, LogOut, Search, User, X, CheckCircle, UtensilsCrossed, Phone, Timer, Clock } from "lucide-react";
import { io } from "socket.io-client";
import { getBookingValidationStatus, updateBookingValidationStatus } from "../../services/systemService";
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
import api from "../../services/axiosInstance";

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

  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const [workSummary, setWorkSummary] = React.useState<any>(null);
  const [loadingSummary, setLoadingSummary] = React.useState(false);

  const fetchWorkSummary = React.useCallback(async () => {
    try {
      setLoadingSummary(true);
      const res = await api.get("/v1/attendance/summary");
      setWorkSummary(res.data.data);
    } catch (err) {
      // silent fail
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  React.useEffect(() => {
    if (showProfileModal) {
      fetchWorkSummary();
      const interval = setInterval(fetchWorkSummary, 10000);
      return () => clearInterval(interval);
    }
  }, [showProfileModal, fetchWorkSummary]);

  const [bookingValidationEnabled, setBookingValidationEnabled] = useState<boolean>(true);
  const [togglingValidation, setTogglingValidation] = useState<boolean>(false);

  // Real-time Booking Assignment Notification
  const [assignedNotification, setAssignedNotification] = useState<any>(null);

  const getCurrentLoggedUser = useCallback(() => {
    if (user) return user;
    try {
      const reduxState = localStorage.getItem("resmanagerState");
      if (reduxState) {
        const parsed = JSON.parse(reduxState);
        if (parsed?.auth?.user) return parsed.auth.user;
      }
    } catch (e) {}
    return null;
  }, [user]);

  useEffect(() => {
    getBookingValidationStatus()
      .then(setBookingValidationEnabled)
      .catch(() => {});

    const socket = io(import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000", {
      transports: ["polling", "websocket"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socket.on("system:booking_validation_changed", (data: { enabled: boolean }) => {
      setBookingValidationEnabled(data.enabled);
    });

    // Helper check: Only show Pop-Up on Waiter role and targeted account
    const isWaiter = displayRole === "waiter";

    const isIntendedForCurrentUser = (payload: any): boolean => {
      if (!isWaiter || !payload) return false;
      const targetWaiter = (payload.assignedWaiterName || "").trim().toLowerCase();
      if (targetWaiter.startsWith("tất cả") || targetWaiter.includes("tất cả")) return true;

      const currentUser = getCurrentLoggedUser();
      if (!currentUser) return true;

      const myId = currentUser.id ? String(currentUser.id) : "";
      const targetId = payload.assignedWaiterId ? String(payload.assignedWaiterId) : "";
      if (myId && targetId) {
        if (myId === targetId) return true;
      }

      const myName = (currentUser.full_name || currentUser.name || currentUser.username || "").trim().toLowerCase();
      if (myName && targetWaiter) {
        if (targetWaiter.includes(myName) || myName.includes(targetWaiter)) return true;
        const myNum = myName.replace(/\D/g, "");
        const targetNum = targetWaiter.replace(/\D/g, "");
        if (myNum && targetNum && myNum === targetNum) return true;
      }

      return true;
    };

    // Socket.io listener for real-time booking assignment across devices/browsers
    socket.on("booking:assigned", (data: any) => {
      console.log("🔔 Received booking:assigned socket payload:", data);
      if (isIntendedForCurrentUser(data)) {
        setAssignedNotification(data);
        playBeepSound();
      }
    });

    const handleBookingCheckedIn = (data: any) => {
      const bId = data?.bookingId || data?.id;
      if (bId) {
        const storedStr = localStorage.getItem("active_waiter_assigned_booking");
        if (storedStr) {
          try {
            const stored = JSON.parse(storedStr);
            if (String(stored.bookingId) === String(bId) || String(stored.id) === String(bId)) {
              localStorage.removeItem("active_waiter_assigned_booking");
            }
          } catch {}
        }

        setAssignedNotification((prev: any) => {
          if (prev && (String(prev.bookingId) === String(bId) || String(prev.id) === String(bId))) {
            return null;
          }
          return prev;
        });

        window.dispatchEvent(new CustomEvent("booking_claimed_event", { detail: data }));
      }
    };
    socket.on("table:booking_checked_in", handleBookingCheckedIn);
    socket.on("booking:claimed", handleBookingCheckedIn);

    // Listen for custom event booking_assigned_event
    const handleAssignedEvent = (e: any) => {
      if (e.detail && isIntendedForCurrentUser(e.detail)) {
        setAssignedNotification(e.detail);
        localStorage.setItem("active_waiter_assigned_booking", JSON.stringify(e.detail));
        playBeepSound();
      }
    };
    window.addEventListener("booking_assigned_event", handleAssignedEvent);

    // BroadcastChannel listener for cross-tab sync
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("booking_notifications");
      channel.onmessage = (msg) => {
        if (msg.data?.type === "NEW_ASSIGNMENT" && isIntendedForCurrentUser(msg.data.payload)) {
          setAssignedNotification(msg.data.payload);
          localStorage.setItem("active_waiter_assigned_booking", JSON.stringify(msg.data.payload));
          playBeepSound();
        }
      };
    } catch (err) {}

    // Native storage event listener for cross-window / cross-tab sync
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === "booking_assignments_list" && e.newValue) {
        try {
          const list = JSON.parse(e.newValue);
          if (list.length > 0) {
            const latest = list[0];
            if (isIntendedForCurrentUser(latest)) {
              setAssignedNotification(latest);
              playBeepSound();
            }
          }
        } catch (err) {}
      }
    };
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      socket.disconnect();
      window.removeEventListener("booking_assigned_event", handleAssignedEvent);
      window.removeEventListener("storage", handleStorageEvent);
      if (channel) channel.close();
    };
  }, [displayRole, getCurrentLoggedUser, user]);

  // Auto check stored assignments for Waiter when accessing /waiter/tables
  useEffect(() => {
    if (displayRole === "waiter") {
      try {
        const stored = JSON.parse(localStorage.getItem("booking_assignments_list") || "[]");
        if (stored.length > 0) {
          const latest = stored[0];
          const targetWaiter = (latest.assignedWaiterName || "").trim().toLowerCase();
          const currentUser = getCurrentLoggedUser();
          const myId = currentUser?.id ? String(currentUser.id) : "";
          const targetId = latest.assignedWaiterId ? String(latest.assignedWaiterId) : "";
          const myName = (currentUser?.full_name || currentUser?.name || currentUser?.username || "").trim().toLowerCase();

          let isMatch = targetWaiter.startsWith("tất cả") || 
            targetWaiter.includes("tất cả") ||
            (myId && targetId && myId === targetId) ||
            (myName && targetWaiter && (targetWaiter.includes(myName) || myName.includes(targetWaiter)));

          if (!currentUser) isMatch = true;

          if (isMatch) {
            const handledKey = "handled_assign_" + (latest.id || latest.bookingId);
            if (!sessionStorage.getItem(handledKey)) {
              setAssignedNotification(latest);
            }
          }
        }
      } catch (e) {}
    }
  }, [displayRole, getCurrentLoggedUser, location.pathname, user]);

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
            <div
              onClick={() => setShowProfileModal(true)}
              title="Xem thông tin cá nhân & Số giờ làm thời gian thực"
              className="flex items-center gap-3 bg-white/90 backdrop-blur-md border border-white/80 rounded-full pl-3 pr-1.5 py-1.5 shadow-xs cursor-pointer hover:bg-white hover:shadow-md transition-all group"
            >
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
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1A1A1A] text-white group-hover:scale-105 transition-transform">
                <User size={15} />
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLogoutModal(true);
                }}
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

      {/* Real-Time Pop-Up Notification Modal for Waiter (Chỉ hiển thị với Phục vụ) */}
      {displayRole === "waiter" && assignedNotification && (
        <div className="fixed top-6 right-6 z-[9999] max-w-md w-full bg-white rounded-3xl shadow-2xl border-2 border-indigo-500 p-6 animate-in slide-in-from-top duration-300 font-sans">
          <div className="flex items-start justify-between border-b border-indigo-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-100 text-indigo-700 rounded-xl font-bold animate-bounce text-base">📌</span>
              <div>
                <h4 className="font-extrabold text-indigo-950 text-xs font-display uppercase tracking-wider">THÔNG BÁO PHÂN CÔNG ĐẶT BÀN LỚN</h4>
                <span className="text-[10px] text-slate-400 font-semibold">Bởi Quản lý nhà hàng</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const handledKey = "handled_assign_" + (assignedNotification.id || assignedNotification.bookingId);
                sessionStorage.setItem(handledKey, "true");
                setAssignedNotification(null);
              }}
              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100 space-y-2.5 text-xs text-slate-700 font-sans mb-5">
            <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
              <span className="font-extrabold text-indigo-800">Khu vực / Tầng:</span>
              <span className="font-black text-indigo-950 text-sm bg-indigo-100 px-3 py-1 rounded-lg border border-indigo-200">{assignedNotification.assignedArea}</span>
            </div>

            <div className="flex justify-between">
              <span className="font-bold text-slate-500">Thông tin khách:</span>
              <span className="font-bold text-slate-900">{assignedNotification.guestName} ({assignedNotification.guestPhone})</span>
            </div>

            <div className="flex justify-between">
              <span className="font-bold text-slate-500">Số lượng khách:</span>
              <span className="font-black text-rose-700 text-sm">{assignedNotification.partySize} người</span>
            </div>

            <div className="flex justify-between">
              <span className="font-bold text-slate-500">Thời gian đến:</span>
              <span className="font-extrabold text-emerald-800">{assignedNotification.startTime}</span>
            </div>

            <div className="flex justify-between text-[11px] pt-1 border-t border-indigo-100">
              <span className="text-slate-400">Thời gian phân công:</span>
              <span className="font-semibold text-slate-600">{assignedNotification.assignedAt}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const targetArea = assignedNotification.assignedArea;
              const notificationData = assignedNotification;
              const handledKey = "handled_assign_" + (assignedNotification.id || assignedNotification.bookingId);
              sessionStorage.setItem(handledKey, "true");
              setAssignedNotification(null);
              navigate("/waiter/tables", { state: { autoOpenAssignedBooking: notificationData, targetArea } });
            }}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-extrabold shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            🔘 Bấm vào đây để chọn Bàn chính & Mở bàn
          </button>
        </div>
      )}

      {/* Staff Profile & Realtime Worked Hours Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
            {/* Top Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white relative">
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 text-white font-black text-2xl flex items-center justify-center border-2 border-white/20 shadow-md">
                  {(workSummary?.full_name || user?.full_name || defaultName).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">
                      {workSummary?.full_name || user?.full_name || defaultName}
                    </h3>
                    <span className="bg-white/20 text-white font-black text-[10px] px-2 py-0.5 rounded-full border border-white/20">
                      {workSummary?.employee_code || user?.employee_code || `NV${String(user?.id || 1).padStart(3, "0")}`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium mt-0.5 capitalize">
                    Chức vụ: {ROLE_LABELS[displayRole] || displayRole}
                  </p>
                  <p className="text-[11px] text-amber-300 font-medium mt-1 flex items-center gap-1">
                    <span>🎂 Ngày sinh:</span>
                    <span className="font-bold">
                      {workSummary?.date_of_birth
                        ? new Date(workSummary.date_of_birth).toLocaleDateString("vi-VN")
                        : "18/08/1998"}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Body: Realtime Work & Salary */}
            <div className="p-6 space-y-4 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Thống kê giờ làm & Lương</span>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Thời gian thực
                </span>
              </div>

              {/* Worked Hours & Hourly Rate Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <p className="text-xs text-slate-500 font-medium">Tổng giờ làm</p>
                  <p className="text-2xl font-black text-slate-900 mt-1 font-mono">
                    {loadingSummary && !workSummary ? "..." : `${workSummary?.total_hours ?? 0.0}h`}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Tích lũy realtime</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <p className="text-xs text-slate-500 font-medium">Lương theo giờ</p>
                  <p className="text-xl font-black text-amber-600 mt-1 font-mono">
                    {workSummary ? `${Number(workSummary.hourly_rate).toLocaleString("vi-VN")}đ` : "25.000đ"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Mức lương cơ sở</p>
                </div>
              </div>

              {/* Real-Time Total Calculated Salary Callout */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50/60 p-4 rounded-2xl border border-emerald-200/70 shadow-2xs">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-900">Tổng lương ước tính</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                    {new Date().toLocaleDateString("vi-VN")}
                  </span>
                </div>
                <p className="text-2xl font-black text-emerald-700 mt-1 font-mono tracking-tight">
                  {workSummary ? `${Number(workSummary.total_salary).toLocaleString("vi-VN")}đ` : "0đ"}
                </p>
                <div className="mt-2 pt-2 border-t border-emerald-200/50 text-[11px] font-medium text-emerald-800/80 flex items-center justify-between">
                  <span>Công thức tính:</span>
                  <span className="font-bold text-emerald-900 font-mono">
                    {workSummary
                      ? `${workSummary.total_hours}h × ${Number(workSummary.hourly_rate).toLocaleString("vi-VN")}đ/h`
                      : "0h × 25.000đ/h"}
                  </span>
                </div>
              </div>

              {/* User Details Box */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Số điện thoại:</span>
                  <span className="font-bold text-slate-800">{workSummary?.phone || user?.phone || "0912345678"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="font-bold text-slate-800">{workSummary?.email || user?.email || "waiter1@resmanager.com"}</span>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  navigate("/checkin");
                }}
                className="flex-1 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold transition-colors border border-amber-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Timer size={15} />
                Chấm công ngay
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  setShowLogoutModal(true);
                }}
                className="py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-colors border border-rose-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut size={15} />
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
