import React, { useState } from "react";
import { Outlet, Link, NavLink } from "react-router-dom";
import { Menu, X, Phone, Mail, MapPin, Clock, UtensilsCrossed } from "lucide-react";
import { AIChatWidget } from "../../components/client/AIChatWidget";

const navLinks = [
  { to: "/", label: "Trang chủ", end: true },
  { to: "/menu", label: "Thực đơn" },
  { to: "/promotions", label: "Tin tức" },
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
    `text-sm font-semibold tracking-wide transition-colors relative py-1 ${
      isActive
        ? "text-client-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-client-primary after:rounded-full"
        : "text-client-muted hover:text-client-primary"
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-client-bg text-client-text font-sans">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-client-accent bg-client-bg/95 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-client-primary text-white shadow-md">
              <UtensilsCrossed size={18} />
            </span>
            <span className="text-xl font-bold tracking-tight font-display text-client-primary">Restro</span>
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
            {customerToken ? (
              <Link
                to="/account"
                className="rounded-lg border border-client-primary/30 px-4 py-2 text-sm font-semibold text-client-primary hover:bg-client-primary/5 transition-colors"
              >
                Xin chào, {customerName}
              </Link>
            ) : (
              <Link
                to="/customer/login"
                className="rounded-lg border border-client-primary/30 px-4 py-2 text-sm font-semibold text-client-primary hover:bg-client-primary/5 transition-colors"
              >
                Đăng nhập
              </Link>
            )}
            <Link
              to="/booking"
              className="rounded-lg bg-client-primary px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-client-primary-hover hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            >
              Đặt bàn ngay
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-lg p-2 text-client-muted hover:bg-client-accent md:hidden"
            aria-label="Mở menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-client-accent bg-client-bg px-4 py-4 md:hidden animate-fade-in">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2.5 text-sm font-semibold ${
                      isActive ? "bg-client-primary/10 text-client-primary" : "text-client-muted hover:bg-client-accent"
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
                    `rounded-lg px-3 py-2.5 text-sm font-semibold ${
                      isActive ? "bg-client-primary/10 text-client-primary" : "text-client-muted hover:bg-client-accent"
                    }`
                  }
                >
                  Tài khoản của tôi
                </NavLink>
              )}
              {!customerToken && (
                <Link
                  to="/customer/login"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-semibold text-client-primary hover:bg-client-primary/10"
                >
                  Đăng nhập khách hàng
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-client-accent bg-[#2a221c] text-[#f0eae1] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-client-primary text-white">
                  <UtensilsCrossed size={16} />
                </span>
                <span className="font-bold text-white font-display text-lg">Restro</span>
              </div>
              <p className="mt-3 text-sm text-[#c9bfae]">
                Restro — Không gian ẩm thực di sản mang tinh hoa hương vị Việt Nam truyền thống đến trải nghiệm hiện đại.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white uppercase tracking-wider text-xs font-display">Liên kết nhanh</h4>
              <ul className="mt-4 space-y-2 text-sm text-[#c9bfae]">
                <li>
                  <Link to="/menu" className="hover:text-client-secondary transition-colors">
                    Thực đơn nhà hàng
                  </Link>
                </li>
                <li>
                  <Link to="/promotions" className="hover:text-client-secondary transition-colors">
                    Chương trình ưu đãi
                  </Link>
                </li>
                <li>
                  <Link to="/booking" className="hover:text-client-secondary transition-colors">
                    Đặt bàn trực tuyến
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white uppercase tracking-wider text-xs font-display">Liên hệ</h4>
              <ul className="mt-4 space-y-3 text-sm text-[#c9bfae]">
                <li className="flex items-center gap-2">
                  <Phone size={14} className="shrink-0 text-client-secondary" />
                  028 3829 4000
                </li>
                <li className="flex items-center gap-2">
                  <Mail size={14} className="shrink-0 text-client-secondary" />
                  contact@restro.vn
                </li>
                <li className="flex items-start gap-2">
                  <MapPin size={14} className="mt-0.5 shrink-0 text-client-secondary" />
                  123 Nguyễn Huệ, Quận 1, TP.HCM
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white uppercase tracking-wider text-xs font-display">Giờ hoạt động</h4>
              <ul className="mt-4 space-y-2 text-sm text-[#c9bfae]">
                <li className="flex items-center gap-2">
                  <Clock size={14} className="shrink-0 text-client-secondary" />
                  Hàng ngày: 10:00 – 22:00
                </li>
                <li className="pl-6 text-xs text-[#9d8f7e] italic">Giờ vàng ưu đãi: 17:00 – 19:00</li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-[#3d3229] pt-6 text-center text-xs text-[#9d8f7e]">
            © {new Date().getFullYear()} Restro
          </div>
        </div>
      </footer>

      <AIChatWidget />
    </div>
  );
};