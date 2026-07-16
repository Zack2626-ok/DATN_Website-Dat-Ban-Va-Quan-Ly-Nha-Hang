import React from "react";
import { CreditCard, FileText, History } from "lucide-react";
import { ActorShellLayout, NavLinkItem } from "../../components/layout/ActorShellLayout";
import { HotlineButton } from "../../components/client/HotlineButton";

const navLinks: NavLinkItem[] = [
  { to: "/cashier/payment", label: "Thanh toán & Hóa đơn", icon: <CreditCard size={16} /> },
  { to: "/cashier/history", label: "Lịch sử TT", icon: <History size={16} /> },
];

export const CashierLayout: React.FC = () => (
  <>
    <ActorShellLayout actorRole="cashier" navLinks={navLinks} homeLink="/cashier/payment" />
    <HotlineButton />
  </>
);
