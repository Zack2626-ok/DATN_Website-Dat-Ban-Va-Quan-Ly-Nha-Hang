import React from "react";
import { ChefHat, Package, History } from "lucide-react";
import { ActorShellLayout, NavLinkItem } from "../../components/layout/ActorShellLayout";
import { staffSocketService } from "../../services/staffSocketService";

const navLinks: NavLinkItem[] = [
  { to: "/chef/kds", label: "Màn hình KDS", icon: <ChefHat size={16} /> },
  { to: "/chef/inventory", label: "Quản lý kho", icon: <Package size={16} /> },
  { to: "/chef/cooking-history", label: "Lịch sử", icon: <History size={16} /> },
];

export const ChefLayout: React.FC = () => {
  React.useEffect(() => {
    staffSocketService.connect();
    return () => staffSocketService.disconnect();
  }, []);

  return <ActorShellLayout actorRole="chef" navLinks={navLinks} homeLink="/chef/kds" />;
};
