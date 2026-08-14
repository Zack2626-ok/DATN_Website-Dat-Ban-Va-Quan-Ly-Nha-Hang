import React from "react";
import { ChefHat, History } from "lucide-react";
import { ActorShellLayout, NavLinkItem } from "../../components/layout/ActorShellLayout";

const navLinks: NavLinkItem[] = [
  { to: "/chef/kds", label: "Màn hình KDS", icon: <ChefHat size={16} /> },
  { to: "/chef/cooking-history", label: "Lịch sử", icon: <History size={16} /> },
];

export const ChefLayout: React.FC = () => (
  <ActorShellLayout actorRole="chef" navLinks={navLinks} homeLink="/chef/kds" />
);
