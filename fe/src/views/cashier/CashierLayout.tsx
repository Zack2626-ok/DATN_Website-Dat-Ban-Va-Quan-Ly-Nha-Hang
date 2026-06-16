import React from "react";
import { CreditCard } from "lucide-react";
import { ActorShellLayout, NavLinkItem } from "../../components/layout/ActorShellLayout";

const navLinks: NavLinkItem[] = [
  { to: "/cashier/pos", label: "Thanh toán", icon: <CreditCard size={16} /> },
];

export const CashierLayout: React.FC = () => (
  <ActorShellLayout actorRole="cashier" navLinks={navLinks} homeLink="/cashier/pos" />
);
