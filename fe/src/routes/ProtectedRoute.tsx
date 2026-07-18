import { useAppSelector } from "../store/hooks";
import { Navigate } from "react-router-dom";
import type { UserRole } from "../interfaces/auth";

interface Props {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles: _allowedRoles }: Props) {
  const { user: _user, isLoading } = useAppSelector((state) => state.auth);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-400">
        Đang tải...
      </div>
    );
  }

  if (!_user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (_allowedRoles && !_allowedRoles.includes(_user.role)) {
    const roleRoutes: Record<string, string> = {
      admin: "/admin",
      manager: "/manager",
      waiter: "/waiter",
      cashier: "/cashier",
      chef: "/chef",
      sales_event: "/sales",
    };
    const fallbackPath = roleRoutes[_user.role] || "/";
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
