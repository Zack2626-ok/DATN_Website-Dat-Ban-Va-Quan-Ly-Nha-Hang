import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Bell, Database, Search, User } from "lucide-react";
import { useAppSelector } from "../../store/hooks";
import { ROLE_LABELS } from "../../constants/roles";
import type { UserRole } from "../../interfaces/auth";

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
}

export const ActorShellLayout: React.FC<ActorShellLayoutProps> = ({
  actorRole,
  navLinks,
  homeLink,
}) => {
  const location = useLocation();
  const { user } = useAppSelector((state) => state.auth);
  const displayRole = user?.role || actorRole;

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
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm focus:border-blue-700 focus:outline-none"
            />
          </div>
          <div className="ml-auto flex items-center gap-4">
            <button type="button" className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100">
              <Bell size={18} />
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white">
                3
              </span>
            </button>
            <div className="flex items-center gap-2">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-gray-700">{user?.full_name || "Demo User"}</p>
                <p className="text-xs text-gray-400">{ROLE_LABELS[displayRole]}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                <User size={16} />
              </div>
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
