import { useAppSelector } from "../store/hooks";
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

  // Chưa đăng nhập → về trang đăng nhập nhân viên
  // if (!_user) {
  //   return <Navigate to="/auth/login" replace />;
  // }

  // Đã đăng nhập nhưng không đúng role → redirect về workspace của role hiện tại
  // if (_allowedRoles && !_allowedRoles.includes(_user.role)) {
  //   const roleRoutes: Record<string, string> = {
  //     admin: "/admin",
  //     manager: "/manager",
  //     waiter: "/waiter",
  //     cashier: "/cashier",
  //     chef: "/chef",
  //     sales_event: "/sales",
  //   };
  //   const fallbackPath = roleRoutes[_user.role] || "/";
  //   return <Navigate to={fallbackPath} replace />;
  // }

  return <>{children}</>;
}
