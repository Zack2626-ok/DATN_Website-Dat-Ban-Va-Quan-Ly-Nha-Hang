import { Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import {
  ManagerLayout,
  ManagerDashboard,
  MenuManagement,
  ShiftManagement,
  BanquetConfig,
  AnalyticsView,
  TableMapIndex,
  PromotionManagement,
} from "../views/manager";
import UserManagement from "../views/manager/UserManagement";
import RegisterPage from "../views/auth/RegisterPage";

export const ManagerRoutes = () => (
  <>
    <Route
      path="/manager"
      element={
        <ProtectedRoute allowedRoles={["manager", "admin"]}>
          <ManagerLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<Navigate to="/manager/dashboard" replace />} />
      <Route path="dashboard" element={<ManagerDashboard />} />
      <Route path="tables" element={<TableMapIndex />} />
      <Route path="staff" element={<UserManagement />} />
      <Route path="menu" element={<MenuManagement />} />
      <Route path="shifts" element={<ShiftManagement />} />
      <Route path="events" element={<BanquetConfig />} />
      <Route path="analytics" element={<AnalyticsView />} />
      <Route path="promotions" element={<PromotionManagement />} />
    </Route>

    {/* Tạo tài khoản nhân viên — chỉ admin/manager mới truy cập được */}
    <Route
      path="/auth/register"
      element={
        <ProtectedRoute allowedRoles={["admin", "manager"]}>
          <RegisterPage />
        </ProtectedRoute>
      }
    />
  </>
);

