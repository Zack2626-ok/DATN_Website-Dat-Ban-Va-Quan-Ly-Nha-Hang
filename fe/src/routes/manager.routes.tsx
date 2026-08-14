import { Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import {
  ManagerLayout,
  ManagerDashboard,
  MenuManagement,
  ShiftManagement,
  AnalyticsView,
  TableMapIndex,
  PromotionManagement,
  BookingListPage,
  CRMManagement,
  InvoiceManagement,
  InventoryControl,
} from "../views/manager";
import { FinanceReport, LossDebtReport } from "../views/admin";
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
      <Route path="bookings" element={<BookingListPage />} />
      <Route path="staff" element={<UserManagement />} />
      <Route path="menu" element={<MenuManagement />} />
      <Route path="inventory" element={<InventoryControl />} />
      <Route path="shifts" element={<ShiftManagement />} />
      <Route path="analytics" element={<AnalyticsView />} />
      <Route path="finance-report" element={<FinanceReport />} />
      <Route path="loss-debt-report" element={<LossDebtReport />} />
      <Route path="promotions" element={<PromotionManagement />} />
      <Route path="crm" element={<CRMManagement />} />
      <Route path="invoices" element={<InvoiceManagement />} />
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

