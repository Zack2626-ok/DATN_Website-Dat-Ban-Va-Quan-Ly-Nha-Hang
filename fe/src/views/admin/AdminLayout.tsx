import React from "react";
import {
  BarChart3,
  Shield,
  FileText,
  TrendingDown,
  Settings,
} from "lucide-react";
import { ActorShellLayout, NavLinkItem } from "../../components/layout/ActorShellLayout";

const navLinks: NavLinkItem[] = [
  { to: "/admin/analytics", label: "Analytics tổng thể", icon: <BarChart3 size={16} /> },
  { to: "/admin/rbac", label: "Phân quyền (RBAC)", icon: <Shield size={16} /> },
  { to: "/admin/finance-report", label: "Báo cáo tài chính", icon: <FileText size={16} /> },
  { to: "/admin/loss-debt-report", label: "Hao hụt & Công nợ NCC", icon: <TrendingDown size={16} /> },
  { to: "/admin/settings", label: "Cấu hình hệ thống", icon: <Settings size={16} /> },
];

export const AdminLayout: React.FC = () => (
  <ActorShellLayout actorRole="admin" navLinks={navLinks} homeLink="/admin/analytics" />
);
