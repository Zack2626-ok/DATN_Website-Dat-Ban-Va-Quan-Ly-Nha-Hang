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
} from "../views/manager";
import { BookingListPage, WaitlistPage } from "../views/waiter";
import UserManagement from "../views/manager/UserManagement";

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
    <Route path="tables" element={<TableMapIndex />} />
    <Route path="bookings" element={<BookingListPage />} />
    <Route path="waitlist" element={<WaitlistPage />} />
    <Route path="staff" element={<UserManagement />} />
    <Route path="menu" element={<MenuManagement />} />
    <Route path="shifts" element={<ShiftManagement />} />
    <Route path="events" element={<BanquetConfig />} />
    <Route path="analytics" element={<AnalyticsView />} />
  </Route>
);
