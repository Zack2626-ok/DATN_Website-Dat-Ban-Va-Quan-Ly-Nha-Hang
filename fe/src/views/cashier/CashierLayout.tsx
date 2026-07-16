import React from "react";
import { CreditCard, FileText } from "lucide-react";
import { ActorShellLayout, NavLinkItem } from "../../components/layout/ActorShellLayout";
import { HotlineButton } from "../../components/client/HotlineButton";

const navLinks: NavLinkItem[] = [
  { to: "/cashier/pos", label: "POS", icon: <CreditCard size={16} /> },
  { to: "/cashier/payment", label: "Thanh toán", icon: <FileText size={16} /> },
];

export const CashierLayout: React.FC = () => (
  <>
    <ActorShellLayout actorRole="cashier" navLinks={navLinks} homeLink="/cashier/payment" />
    <HotlineButton />
  </>
);
