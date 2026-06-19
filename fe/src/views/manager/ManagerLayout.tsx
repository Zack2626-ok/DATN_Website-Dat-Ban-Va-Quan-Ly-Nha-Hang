import React from "react";
import { LayoutDashboard, Utensils, Clock, Grid, CalendarDays, Users } from "lucide-react";
import { ActorShellLayout, NavLinkItem } from "../../components/layout/ActorShellLayout";

const navLinks: NavLinkItem[] = [
  { to: "/manager/dashboard", label: "Tổng quan ca", icon: <LayoutDashboard size={16} /> },
  { to: "/manager/tables", label: "Sơ đồ bàn", icon: <Grid size={16} /> },
  { to: "/manager/bookings", label: "Đặt bàn", icon: <CalendarDays size={16} /> },
  { to: "/manager/waitlist", label: "Danh sách chờ", icon: <Users size={16} /> },
  { to: "/manager/menu", label: "Quản lý thực đơn", icon: <Utensils size={16} /> },
  { to: "/manager/shifts", label: "Ca làm việc", icon: <Clock size={16} /> },
];

export const ManagerLayout: React.FC = () => (
  <ActorShellLayout actorRole="manager" navLinks={navLinks} homeLink="/manager/dashboard" />
);
