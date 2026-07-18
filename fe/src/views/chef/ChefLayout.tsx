import React from "react";
import { ChefHat, Package } from "lucide-react";
import { ActorShellLayout, NavLinkItem } from "../../components/layout/ActorShellLayout";

const navLinks: NavLinkItem[] = [
  { to: "/chef/kds", label: "Màn hình KDS", icon: <ChefHat size={16} /> },
  { to: "/chef/inventory", label: "Quản lý kho", icon: <Package size={16} /> },
];

export const ChefLayout: React.FC = () => (
  <ActorShellLayout actorRole="chef" navLinks={navLinks} homeLink="/chef/kds" />
);
