import React from "react";
import { Grid, Calendar } from "lucide-react";
import { ActorShellLayout, NavLinkItem } from "../../components/layout/ActorShellLayout";
import { staffSocketService } from "../../services/staffSocketService";

const navLinks: NavLinkItem[] = [
  { to: "/waiter/tables", label: "Sơ đồ bàn", icon: <Grid size={16} /> },
  { to: "/waiter/bookings", label: "Lịch đặt bàn", icon: <Calendar size={16} /> },
];

export const WaiterLayout: React.FC = () => {
  React.useEffect(() => {
    staffSocketService.connect();
    return () => staffSocketService.disconnect();
  }, []);

  return (
    <ActorShellLayout
      actorRole="waiter"
      navLinks={navLinks}
      homeLink="/waiter/tables"
      mainClassName="text-[15px] md:text-base"
    />
  );
};
