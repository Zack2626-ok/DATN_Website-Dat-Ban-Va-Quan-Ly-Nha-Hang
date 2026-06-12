import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../store";
import { fetchOrders } from "../../store/orderSlice";
import { ORDER_STATUS } from "../../constants/orderStatus";
import {
  Bell,
  Database,
  LayoutDashboard,
  Grid,
  Package,
  ShieldAlert,
  Search,
  User,
  Calendar,
  Utensils,
  Truck,
  CreditCard,
  Users,
  ChefHat,
  ExternalLink,
  Settings,
  FileText,
  Star,
  Award,
} from "lucide-react";
import type { UserRole } from "../../interfaces";

/**
 * AdminLayout - Administrative dashboard shell.
 * Provides sidebar navigation, role management, and route guarding.
 */
export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Retrieve current active role from sessionStorage (default to manager)
  const [activeRole, setActiveRole] = useState<UserRole>(() => {
    return (sessionStorage.getItem("admin_role") as UserRole) || "manager";
  });

  // Fetch orders on mount and setup polling every 5 seconds for real-time data sync
  useEffect(() => {
    dispatch(fetchOrders());
    const interval = setInterval(() => {
      dispatch(fetchOrders());
    }, 5000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const handleRoleChange = (role: UserRole) => {
    setActiveRole(role);
    sessionStorage.setItem("admin_role", role);

    // Redirect to the appropriate default sub-route based on the role
    if (role === "chef") {
      navigate("/admin/kitchen");
    } else if (role === "waiter") {
      navigate("/admin/tables");
    } else if (role === "cashier") {
      navigate("/admin/cashier");
    } else {
      navigate("/admin/dashboard");
    }
  };

  // Kitchen pending count
  const pendingCount = useAppSelector((state) => 
    state.orders.orders.filter(
      (o) => o.status === ORDER_STATUS.CONFIRMED || o.status === ORDER_STATUS.IN_KITCHEN
    ).length
  );

  // Check role authorization for the current active path
  const isAuthorized = (): boolean => {
    const path = location.pathname;
    if (activeRole === "manager" || activeRole === "admin") return true; // Manager and Admin can access all
    
    if (
      path.includes("/dashboard") ||
      path.includes("/inventory") ||
      path.includes("/menu") ||
      path.includes("/events") ||
      path.includes("/staff") ||
      path.includes("/settings")
    ) {
      return false; // Manager only
    }
    if (path.includes("/tables")) {
      return activeRole === "waiter";
    }
    if (path.includes("/delivery")) {
      return activeRole === "waiter" || activeRole === "cashier";
    }
    if (path.includes("/kitchen")) {
      return activeRole === "chef";
    }
    if (path.includes("/cashier")) {
      return activeRole === "cashier";
    }
    return true;
  };

  // Define sidebar links based on role authorization
  const sidebarLinks = [
    {
      to: "/admin/dashboard",
      label: "Tổng quan",
      icon: <LayoutDashboard size={16} />,
      roles: ["manager"],
    },
    {
      to: "/admin/tables",
      label: "Sơ đồ bàn",
      icon: <Grid size={16} />,
      roles: ["manager", "waiter"],
    },
    {
      to: "/admin/menu",
      label: "Thực đơn",
      icon: <Utensils size={16} />,
      roles: ["manager"],
    },
    {
      to: "/admin/inventory",
      label: "Tôn kho",
      icon: <Package size={16} />,
      roles: ["manager"],
    },
    {
      to: "/admin/events",
      label: "Sự kiện",
      icon: <Calendar size={16} />,
      roles: ["manager"],
    },
    {
      to: "/admin/delivery",
      label: "Giao hàng",
      icon: <Truck size={16} />,
      roles: ["manager", "waiter", "cashier"],
    },
    {
      to: "/admin/cashier",
      label: "Thanh toán",
      icon: <CreditCard size={16} />,
      roles: ["manager", "cashier"],
    },
    {
      to: "/admin/staff",
      label: "Nhân sự & KH",
      icon: <Users size={16} />,
      roles: ["manager"],
    },
    {
      to: "/admin/kitchen",
      label: "Màn hình Bếp",
      icon: <ChefHat size={16} />,
      roles: ["manager", "chef"],
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      to: "/admin/client-menu",
      label: "Menu Khách hàng",
      icon: <ExternalLink size={16} />,
      roles: ["manager", "waiter", "chef", "cashier"],
    },
    {
      to: "/admin/form-demo",
      label: "Form Demo",
      icon: <FileText size={16} />,
      roles: ["manager", "waiter", "chef", "cashier"],
    },
    {
      to: "/admin/party-portal",
      label: "Portal Đặt Tiệc",
      icon: <Star size={16} />,
      roles: ["manager", "waiter", "chef", "cashier"],
    },
    {
      to: "/admin/loyalty",
      label: "Tích điểm KH",
      icon: <Award size={16} />,
      roles: ["manager", "waiter", "chef", "cashier"],
    },
    {
      to: "/admin/settings",
      label: "Cài đặt",
      icon: <Settings size={16} />,
      roles: ["manager"],
    },
  ];

  const filteredLinks = sidebarLinks.filter((link) =>
    activeRole === "admin" || link.roles.includes(activeRole)
  );

  return (
    <div className="min-h-screen bg-admin-bg flex flex-col md:flex-row text-admin-text-main font-body">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-admin-border flex flex-col shrink-0">
        {/* Logo brand */}
        <div className="p-6 border-b border-admin-border flex items-center gap-3 bg-white">
          <Link to="/" className="font-display font-black text-xl text-admin-primary tracking-tight hover:opacity-85 transition-all">
            ResManager
          </Link>
        </div>

        {/* Quick Role Switcher Dashboard for Demonstration */}
        <div className="p-4 border-b border-admin-border flex flex-col gap-2 bg-slate-50/50">
          <span className="text-[10px] font-bold text-admin-text-sub tracking-wider uppercase px-2">Phân quyền demo</span>
          <div className="grid grid-cols-2 gap-1.5">
            {(["admin", "manager", "waiter", "chef", "cashier"] as UserRole[]).map((role) => (
              <button
                key={role}
                onClick={() => handleRoleChange(role)}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                  activeRole === role
                    ? "bg-admin-primary text-white shadow-[0_2px_8px_rgba(15,98,254,0.15)]"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-200"
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Links Navigation */}
        <div className="flex-1 p-4 flex flex-col gap-1 bg-white">
          <span className="text-[10px] font-bold text-admin-text-sub tracking-wider uppercase px-2 mb-2 block">Menu</span>
          {filteredLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all ${
                  isActive
                    ? "bg-admin-primary-light text-admin-primary"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`${isActive ? "text-admin-primary" : "text-slate-400"}`}>
                    {link.icon}
                  </span>
                  <span>{link.label}</span>
                </div>
                {link.badge !== undefined && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white font-extrabold text-[9px]">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Workspace Footer status */}
        <div className="p-6 border-t border-admin-border bg-white flex justify-between items-center text-xs text-admin-text-sub font-medium">
          <span className="flex items-center gap-1.5">
            <Database size={12} className="text-admin-primary" /> Hệ thống online
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </aside>

      {/* Main Admin Content Wrapper */}
      <main className="flex-1 flex flex-col overflow-hidden bg-admin-bg">
        {/* Header toolbar */}
        <header className="px-8 py-5 border-b border-admin-border flex justify-between items-center bg-white">
          {/* Search bar */}
          <div className="relative flex-1 max-w-sm hidden sm:block">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm..."
              className="w-full pl-8 pr-4 py-1.5 bg-slate-100/60 border border-slate-200/50 rounded-lg text-xs focus:outline-none text-admin-text-main focus:border-admin-primary focus:bg-white transition-colors"
            />
          </div>

          <div className="flex items-center gap-4 ml-auto">
            {/* Notification bell */}
            <div className="w-8 h-8 rounded-full bg-slate-100/80 border border-slate-200/60 flex items-center justify-center text-slate-500 relative cursor-pointer hover:bg-slate-200/60 transition-colors">
              <Bell size={14} />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[8px] font-black text-white flex items-center justify-center">
                3
              </span>
            </div>

            {/* User Profile avatar & Role Display */}
            <div className="flex items-center gap-3">
              <div className="text-right flex flex-col items-end">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Tài khoản</span>
                <span className="text-[11px] font-black text-slate-700 mt-1 capitalize font-mono bg-slate-100 border border-slate-250/70 px-2 py-0.5 rounded shadow-2xs">
                  role: {activeRole}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-100/80 border border-slate-200/60 flex items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-200/60 transition-colors">
                <User size={14} />
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard workspace display with Router guards */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar">
          {isAuthorized() ? (
            <Outlet />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto py-16 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-6 shadow-lg shadow-rose-500/5">
                <ShieldAlert size={32} />
              </div>
              <h3 className="text-xl font-bold font-display text-admin-text-main mb-2">Từ chối truy cập</h3>
              <p className="text-admin-text-sub text-xs leading-relaxed mb-6">
                Vai trò của bạn (<strong className="text-rose-500 capitalize">{activeRole}</strong>) không có quyền xem khu vực quản trị này. Vui lòng chuyển vai trò sang manager ở sidebar để tiếp tục.
              </p>
              <button
                onClick={() => handleRoleChange("manager")}
                className="px-6 py-2.5 text-xs font-extrabold bg-admin-primary hover:bg-admin-primary-hover text-white rounded-lg cursor-pointer transition-colors shadow-lg font-display"
              >
                KHÔI PHỤC QUYỀN MANAGER
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="py-3 px-8 border-t border-admin-border bg-white flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 font-semibold shrink-0">
          <span>ResManager Console v1.0.0</span>
          <span>Bản quyền thuộc quyền sở hữu ResManager</span>
        </footer>
      </main>
    </div>
  );
};
