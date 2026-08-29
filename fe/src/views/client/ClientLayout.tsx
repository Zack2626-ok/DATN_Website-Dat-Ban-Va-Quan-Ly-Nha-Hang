import React, { useState } from "react";
import { Outlet, Link, NavLink } from "react-router-dom";
import { Menu, X, Phone, Mail, MapPin, Clock, UtensilsCrossed, User, Sparkles, ChevronRight } from "lucide-react";
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

  return (
    <div className="flex min-h-screen flex-col bg-client-bg text-client-text font-sans">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-client-accent/80 bg-client-bg/95 backdrop-blur-md shadow-xs transition-all duration-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-client-primary text-white shadow-md transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
              <UtensilsCrossed size={18} />
            </span>
            <span className="text-xl font-bold tracking-tight font-display text-client-primary group-hover:text-[#881814] transition-colors">
              Restro
            </span>
          </Link>

          {/* Animated Navigation Bar (Image 2) */}
          <nav className="hidden items-center gap-7 md:flex">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `group relative py-2 px-1 text-sm font-semibold tracking-wide transition-all duration-300 flex items-center ${
                    isActive
                      ? "text-client-primary font-bold"
                      : "text-slate-600 hover:text-client-primary hover:-translate-y-0.5"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span>{link.label}</span>
                    <span
                      className={`absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-gradient-to-r from-client-primary via-amber-500 to-client-primary transition-all duration-300 transform origin-center ${
                        isActive
                          ? "scale-x-100 opacity-100 shadow-[0_2px_8px_rgba(167,45,30,0.35)]"
                          : "scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-80"
                      }`}
                    />
                  </>
                )}
              </NavLink>
            ))}
            {customerToken && (
              <NavLink
                to="/account"
                className={({ isActive }) =>
                  `group relative py-2 px-1 text-sm font-semibold tracking-wide transition-all duration-300 flex items-center ${
                    isActive
                      ? "text-client-primary font-bold"
                      : "text-slate-600 hover:text-client-primary hover:-translate-y-0.5"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span>Tài khoản</span>
                    <span
                      className={`absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-gradient-to-r from-client-primary via-amber-500 to-client-primary transition-all duration-300 transform origin-center ${
                        isActive
                          ? "scale-x-100 opacity-100 shadow-[0_2px_8px_rgba(167,45,30,0.35)]"
                          : "scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-80"
                      }`}
                    />
                  </>
                )}
              </NavLink>
            )}
          </nav>

          {/* Action Buttons & Luxury Greeting (Image 1) */}
          <div className="hidden items-center gap-3 md:flex">
            {customerToken ? (
              <Link
                to="/account"
                className="group relative inline-flex items-center gap-2.5 rounded-full border border-amber-200/90 bg-white/90 px-3.5 py-1.5 shadow-2xs transition-all duration-300 hover:border-client-primary/50 hover:bg-white hover:shadow-md hover:-translate-y-0.5 active:scale-95"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-client-primary to-[#c73224] text-white shadow-xs font-bold text-xs ring-2 ring-amber-200/60 transition-transform duration-300 group-hover:rotate-6">
                  {customerName ? customerName.charAt(0).toUpperCase() : <User size={13} />}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider leading-none">
                    Xin chào
                  </span>
                  <span className="text-xs font-bold text-slate-800 group-hover:text-client-primary transition-colors leading-tight max-w-[130px] truncate">
                    {customerName}
                  </span>
                </div>
                <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-50 text-amber-600 transition-colors group-hover:bg-client-primary/10 group-hover:text-client-primary">
                  <Sparkles size={10} className="animate-pulse" />
                </span>
              </Link>
            ) : (
              <Link
                to="/customer/login"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-all duration-300 hover:border-client-primary/40 hover:bg-white hover:text-client-primary hover:shadow-xs hover:-translate-y-0.5"
              >
                <User size={13} className="text-slate-400 group-hover:text-client-primary" />
                <span>Đăng nhập</span>
              </Link>
            )}
            <Link
              to="/booking"
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-client-primary to-[#8e1d16] px-4 py-2 text-xs font-bold text-white shadow-md shadow-client-primary/20 hover:shadow-lg hover:shadow-client-primary/30 transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95"
            >
              <span>Đặt bàn ngay</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-xl p-2 text-client-muted hover:bg-client-accent md:hidden transition-colors"
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