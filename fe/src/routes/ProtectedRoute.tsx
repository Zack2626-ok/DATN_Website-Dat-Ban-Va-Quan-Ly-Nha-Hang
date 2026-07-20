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
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 text-slate-400 gap-2">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold">Đang xác thực phiên...</span>
      </div>
    );
  }

  // Chưa đăng nhập → về trang đăng nhập nhân viên
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  // Đã đăng nhập nhưng không đúng role → redirect về trang báo lỗi 403
  if (allowedRoles) {
    const role = user.role ? (user.role.toLowerCase() as UserRole) : ("" as UserRole);
    if (!allowedRoles.map(r => r.toLowerCase()).includes(role)) {
      return <Navigate to="/403" replace />;
    }
  }

  return <>{children}</>;
}
