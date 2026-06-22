import { Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import {
  ManagerLayout,
  ManagerDashboard,
  MenuManagement,
  ShiftManagement,
  BanquetConfig,
} from "../views/manager";
import { WaiterTableMap, BookingListPage, WaitlistPage } from "../views/waiter";
import { AdminRbac } from "../views/admin";

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
    <Route path="tables" element={<WaiterTableMap />} />
    <Route path="bookings" element={<BookingListPage />} />
    <Route path="waitlist" element={<WaitlistPage />} />
    <Route path="staff" element={<AdminRbac />} />
    <Route path="menu" element={<MenuManagement />} />
    <Route path="shifts" element={<ShiftManagement />} />
    <Route path="events" element={<BanquetConfig />} />
  </Route>
);
