import React from "react";
import { Outlet, Link } from "react-router-dom";
import { Phone, Mail } from "lucide-react";

/**
 * ClientLayout - Shell for public guest views (Header, Footer, and layout structures)
 */
export const ClientLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-brand-dark flex flex-col relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Luxury Sticky Navbar */}
      <header className="sticky top-0 z-40 glass border-b border-white/5 px-6 md:px-12 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center font-display font-bold text-lg text-brand-dark">
            L
          </span>
          <h1 className="text-xl md:text-2xl font-black font-display tracking-widest bg-gradient-to-r from-brand-primary to-white bg-clip-text text-transparent">
            L'AMBROISIE
          </h1>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold tracking-wider text-zinc-300">
          <Link to="/" className="hover:text-brand-primary transition-colors">TRANG CHỦ</Link>
          <a href="#menu" className="hover:text-brand-primary transition-colors">THỰC ĐƠN</a>
          <a href="#reserve" className="hover:text-brand-primary transition-colors">SƠ ĐỒ BÀN</a>
          <a href="#about" className="hover:text-brand-primary transition-colors">TRẢI NGHIỆM</a>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            to="/admin"
            className="px-4 py-2 text-xs font-bold tracking-widest text-brand-primary border border-brand-primary/30 rounded-lg hover:bg-brand-primary/10 hover:border-brand-primary/60 transition-all uppercase cursor-pointer"
          >
            Quản trị viên
          </Link>
          <a
            href="#reserve"
            className="px-5 py-2 text-xs font-bold tracking-widest text-brand-dark bg-brand-primary rounded-lg hover:bg-brand-primary-hover shadow-[0_4px_20px_rgba(197,168,128,0.25)] transition-all uppercase cursor-pointer"
          >
            Đặt bàn
          </a>
        </div>
      </header>

      {/* Dynamic Content View */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="mt-auto bg-brand-dark border-t border-white/5 px-6 md:px-12 py-12 w-full text-center">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col items-center md:items-start gap-2">
            <h2 className="text-lg font-black font-display tracking-widest text-brand-primary">L'AMBROISIE</h2>
            <p className="text-zinc-500 text-xs">© 2026 Tập đoàn Ẩm thực L'Ambroisie. Mọi quyền được bảo lưu.</p>
          </div>
          <div className="flex gap-6 text-sm text-zinc-400">
            <span className="flex items-center gap-1.5"><Phone size={14} /> +84 28 3829 4000</span>
            <span className="flex items-center gap-1.5"><Mail size={14} /> contact@lambroisie.com</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
