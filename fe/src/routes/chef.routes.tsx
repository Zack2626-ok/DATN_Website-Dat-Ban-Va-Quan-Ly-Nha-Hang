import { Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { ChefLayout, ChefKitchenQueue, InventoryControl } from "../views/chef";

export const ChefRoutes = () => (
  <Route
    path="/chef"
    element={
      <ProtectedRoute allowedRoles={["chef", "manager", "admin"]}>
        <ChefLayout />
      </ProtectedRoute>
    }
  >
    <Route index element={<Navigate to="/chef/kds" replace />} />
    <Route path="kds" element={<ChefKitchenQueue />} />
    <Route path="inventory" element={<InventoryControl />} />
  </Route>
);
