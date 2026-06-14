import { Navigate }           from "react-router-dom";
import { useAppSelector }     from "../store/hooks"
import type { UserRole }      from "../interfaces/auth";

interface Props {
  children:      React.ReactNode;
  /** Nếu truyền vào, chỉ các role này mới được truy cập */
  allowedRoles?: UserRole[];
}

/**
 * Route guard:
 * - Chưa đăng nhập → redirect /login
 * - Sai role       → redirect /dashboard
 */
export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, isLoading } = useAppSelector((state) => state.auth);

  if (isLoading) {
  return (
    <div className="h-screen flex items-center justify-center text-gray-400">
      Đang tải...
    </div>
  );
}

  if (!user) return <Navigate to="/auth/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user?.role))
    return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}