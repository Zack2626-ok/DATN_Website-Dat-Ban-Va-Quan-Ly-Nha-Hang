import React from "react";
import { Calendar } from "lucide-react";
import { ActorShellLayout, NavLinkItem } from "../../components/layout/ActorShellLayout";

const navLinks: NavLinkItem[] = [
  { to: "/sales/events", label: "Quản lý tiệc & Sự kiện", icon: <Calendar size={16} /> },
];

export const SalesLayout: React.FC = () => (
  <ActorShellLayout actorRole="sales_event" navLinks={navLinks} homeLink="/sales/events" />
);
