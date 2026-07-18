import { Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import {
  AdminLayout,
  AdminAnalytics,
  AdminRbac,
  FinanceReport,
  LossDebtReport,
  AdminSettings,
} from "../views/admin";

export const AdminRoutes = () => (
  <Route
    path="/admin"
    element={
      <ProtectedRoute allowedRoles={["admin"]}>
        <AdminLayout />
      </ProtectedRoute>
    }
  >
    <Route index element={<Navigate to="/admin/analytics" replace />} />
    <Route path="analytics" element={<AdminAnalytics />} />
    <Route path="rbac" element={<AdminRbac />} />
    <Route path="finance-report" element={<FinanceReport />} />
    <Route path="loss-debt-report" element={<LossDebtReport />} />
    <Route path="settings" element={<AdminSettings />} />
  </Route>
);
