import { Navigate } from "react-router-dom";
import { useAppSelector } from "../store/hooks";
import type { UserRole } from "../interfaces/auth";

interface Props {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, isLoading } = useAppSelector((state) => state.auth);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-400">
        Đang tải...
      </div>
    );
  }

  // ============ BỎ QUA LOGIN ĐỂ XEM TRƯỚC GIAO DIỆN ============
  // if (!user) return <Navigate to="/auth/login" replace />;
  // Đổi role bên dưới để xem giao diện từng actor: admin | manager | waiter | cashier | chef | sales_event
  const effectiveRole = user?.role;
  // ===============================================================

  // [DEMO MODE]: Comment lại kiểm tra role để có thể mở nhiều tab các role khác nhau cùng lúc
  /*
  if (allowedRoles && !allowedRoles.includes(effectiveRole)) {
    const roleRoutes: Record<string, string> = {
      admin: "/admin",
      manager: "/manager",
      waiter: "/waiter",
      cashier: "/cashier",
      chef: "/chef",
      sales_event: "/sales",
    };
    const fallbackPath = roleRoutes[effectiveRole] || "/";
    return <Navigate to={fallbackPath} replace />;
  }
  */

  return <>{children}</>;
}
