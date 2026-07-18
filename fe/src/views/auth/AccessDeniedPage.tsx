import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";
import { useAppSelector } from "../../store/hooks";

export const AccessDeniedPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  const getDashboardPath = (): string => {
    if (!user) return "/auth/login";
    const role = user.role ? user.role.toLowerCase() : "";
    switch (role) {
      case "admin":
        return "/admin";
      case "manager":
        return "/manager/dashboard";
      case "waiter":
        return "/waiter/tables";
      case "cashier":
        return "/payment";
      case "chef":
        return "/kds";
      case "sales_event":
        return "/events";
      default:
        return "/";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-8 rounded-3xl border border-slate-100 shadow-xl animate-scale-up">
        {/* Animated Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-rose-50 text-rose-600 rounded-full border border-rose-100 shadow-sm animate-pulse">
          <ShieldAlert size={40} />
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">403</h1>
          <h2 className="text-lg font-bold text-slate-700">Quyền truy cập bị từ chối</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Tài khoản của bạn ({user?.full_name || "Nhân viên"}) không có quyền truy cập vào chức năng hoặc phân hệ quản lý này. Vui lòng liên hệ quản trị hệ thống nếu đây là sự nhầm lẫn.
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-100 my-6" />

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            Quay lại trang trước
          </button>
          
          <button
            onClick={() => navigate(getDashboardPath())}
            className="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm shadow-sky-500/20 cursor-pointer"
          >
            <Home size={14} />
            Về trang làm việc chính
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccessDeniedPage;
