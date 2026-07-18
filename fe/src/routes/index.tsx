import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ClientRoutes } from "./client.routes";
import { AdminRoutes } from "./admin.routes";
import { ManagerRoutes } from "./manager.routes";
import { WaiterRoutes } from "./waiter.routes";
import { CashierRoutes } from "./cashier.routes";
import { ChefRoutes } from "./chef.routes";
import { SalesRoutes } from "./sales.routes";
import { AccessDeniedPage } from "../views/auth/AccessDeniedPage";

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Customer Client Side Routes */}
      {ClientRoutes()}

      {/* Staff Admin Workspace Routes for each Actor */}
      {AdminRoutes()}
      {ManagerRoutes()}
      {WaiterRoutes()}
      {CashierRoutes()}
      {ChefRoutes()}
      {SalesRoutes()}

      {/* Access Denied Route */}
      <Route path="/403" element={<AccessDeniedPage />} />

      {/* Route Fallback (Non-existent routes redirect back to client landing) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
