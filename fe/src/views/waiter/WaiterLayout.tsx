import React from "react";
import { Grid, CalendarDays } from "lucide-react";
import { ActorShellLayout, NavLinkItem } from "../../components/layout/ActorShellLayout";

const navLinks: NavLinkItem[] = [
  { to: "/waiter/tables", label: "Sơ đồ bàn", icon: <Grid size={16} /> },
  { to: "/waiter/bookings", label: "Quản lý đặt bàn", icon: <CalendarDays size={16} /> },
];

export const WaiterLayout: React.FC = () => (
  <ActorShellLayout actorRole="waiter" navLinks={navLinks} homeLink="/waiter/tables" />
);
