import { Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { WaiterLayout, WaiterTableMap } from "../views/waiter";

export const WaiterRoutes = () => (
  <Route
    path="/waiter"
    element={
      <ProtectedRoute allowedRoles={["waiter"]}>
        <WaiterLayout />
      </ProtectedRoute>
    }
  >
    <Route index element={<Navigate to="/waiter/tables" replace />} />
    <Route path="tables" element={<WaiterTableMap />} />
  </Route>
);
