import { Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { SalesLayout, EventsManagement } from "../views/sales";

export const SalesRoutes = () => (
  <Route
    path="/sales"
    element={
      <ProtectedRoute allowedRoles={["sales_event", "manager", "admin"]}>
        <SalesLayout />
      </ProtectedRoute>
    }
  >
    <Route index element={<Navigate to="/sales/events" replace />} />
    <Route path="events" element={<EventsManagement />} />
  </Route>
);
