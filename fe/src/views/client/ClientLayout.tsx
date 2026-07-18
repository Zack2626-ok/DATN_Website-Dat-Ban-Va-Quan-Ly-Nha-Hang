import React, { useState } from "react";
import { Outlet, Link, NavLink } from "react-router-dom";
import { Menu, X, Phone, Mail, MapPin, Clock, UtensilsCrossed } from "lucide-react";
import { HotlineButton } from "../../components/client/HotlineButton";

const navLinks = [
  { to: "/", label: "Trang chủ", end: true },
  { to: "/menu", label: "Thực đơn" },
  { to: "/promotions", label: "Ưu đãi" },
  { to: "/booking", label: "Đặt bàn" },
];

/**
 * ClientLayout — Shell công khai cho Khách hàng (Module 0)
 * Navbar + Footer, không dùng Sidebar nội bộ (UI Spec §2)
 */
export const ClientLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const customerToken = localStorage.getItem("customer_token");
  const customerInfoStr = localStorage.getItem("customer_info");
  let customerName = "";
  if (customerInfoStr) {
    try {
      customerName = JSON.parse(customerInfoStr).name || "Khách hàng";
    } catch (e) {
      console.error(e);
    }
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${isActive ? "text-blue-700" : "text-slate-500 hover:text-blue-700"}`;

  return (
    <div className="flex min-h-screen flex-col bg-sky-50/50 text-slate-600">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-sky-100 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700 text-white">
              <UtensilsCrossed size={18} />
            </span>
            <span className="text-xl font-bold text-slate-600">ResManager</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={navClass}>
                {link.label}
              </NavLink>
            ))}
            {customerToken && (
              <NavLink to="/account" className={navClass}>
                Tài khoản
              </NavLink>
            )}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/admin"
              className="rounded-lg border border-sky-100 px-4 py-2 text-sm font-semibold text-slate-400 hover:text-slate-600 hover:bg-sky-50/50 transition-colors"
            >
              Nhân viên
            </Link>
            {!customerToken ? (
              <Link
                to="/customer/login"
                className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
              >
                Đăng nhập
              </Link>
            ) : (
              <Link
                to="/account"
                className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
              >
                Xin chào, {customerName}
              </Link>
            )}
            <Link
              to="/booking"
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
            >
              Đặt bàn ngay
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-lg p-2 text-slate-500 hover:bg-sky-100 md:hidden"
            aria-label="Mở menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-sky-100 bg-white px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2.5 text-sm font-medium ${isActive ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-sky-50/50"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              {customerToken && (
                <NavLink
                  to="/account"
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2.5 text-sm font-medium ${isActive ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-sky-50/50"
                    }`
                  }
                >
                  Tài khoản của tôi
                </NavLink>
              )}
              <Link
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-sky-50/50"
              >
                Nhân viên đăng nhập
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-sky-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 text-white">
                  <UtensilsCrossed size={16} />
                </span>
                <span className="font-bold text-slate-600">ResManager</span>
              </div>
              <p className="mt-3 text-sm text-slate-400">
                Hệ thống quản lý nhà hàng & đặt bàn trực tuyến — trải nghiệm ẩm thực hiện đại.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-slate-600">Liên kết</h4>
              <ul className="mt-3 space-y-2 text-sm text-slate-400">
                <li>
                  <Link to="/menu" className="hover:text-blue-700">
                    Thực đơn
                  </Link>
                </li>
                <li>
                  <Link to="/promotions" className="hover:text-blue-700">
                    Ưu đãi & Combo
                  </Link>
                </li>
                <li>
                  <Link to="/booking" className="hover:text-blue-700">
                    Đặt bàn online
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-600">Liên hệ</h4>
              <ul className="mt-3 space-y-2 text-sm text-slate-400">
                <li className="flex items-center gap-2">
                  <Phone size={14} className="shrink-0 text-blue-700" />
                  028 3829 4000
                </li>
                <li className="flex items-center gap-2">
                  <Mail size={14} className="shrink-0 text-blue-700" />
                  contact@resmanager.vn
                </li>
                <li className="flex items-start gap-2">
                  <MapPin size={14} className="mt-0.5 shrink-0 text-blue-700" />
                  123 Nguyễn Huệ, Quận 1, TP.HCM
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-600">Giờ mở cửa</h4>
              <ul className="mt-3 space-y-2 text-sm text-slate-400">
                <li className="flex items-center gap-2">
                  <Clock size={14} className="shrink-0 text-blue-700" />
                  T2 – CN: 10:00 – 22:00
                </li>
                <li className="pl-6">Happy Hour: 17:00 – 19:00</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-sky-100 pt-6 text-center text-sm text-gray-400">
            © 2026 ResManager. Mọi quyền được bảo lưu.
          </div>
        </div>
      </footer>

      <HotlineButton />
    </div>
  );
};