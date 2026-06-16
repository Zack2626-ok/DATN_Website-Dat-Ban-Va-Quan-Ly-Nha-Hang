import { Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import {
  ManagerLayout,
  ManagerDashboard,
  MenuManagement,
  ShiftManagement,
} from "../views/manager";

export const ManagerRoutes = () => (
  <Route
    path="/manager"
    element={
      <ProtectedRoute allowedRoles={["manager"]}>
        <ManagerLayout />
      </ProtectedRoute>
    }
  >
    <Route index element={<Navigate to="/manager/dashboard" replace />} />
    <Route path="dashboard" element={<ManagerDashboard />} />
    <Route path="menu" element={<MenuManagement />} />
    <Route path="shifts" element={<ShiftManagement />} />
  </Route>
);
