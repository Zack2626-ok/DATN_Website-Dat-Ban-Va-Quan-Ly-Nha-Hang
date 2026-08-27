import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ClientRoutes } from "./client.routes";
import { ManagerRoutes } from "./manager.routes";
import { WaiterRoutes } from "./waiter.routes";
import { CashierRoutes } from "./cashier.routes";
import { ChefRoutes } from "./chef.routes";
import { SalesRoutes } from "./sales.routes";
import { AccessDeniedPage } from "../views/auth/AccessDeniedPage";
import CheckInPage from "../views/auth/CheckInPage";
import { SystemSettingsPage } from "../views/manager/settings";

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Customer Client Side Routes */}
      {ClientRoutes()}

      {/* Check-in (chấm công) page — no ProtectedRoute wrapper needed */}
      <Route path="/checkin" element={<CheckInPage />} />

      {/* Redirect /admin to /manager */}
      <Route path="/admin/*" element={<Navigate to="/manager/dashboard" replace />} />

      {/* Staff Admin Workspace Routes for each Actor */}
      {ManagerRoutes()}
      {WaiterRoutes()}
      {CashierRoutes()}
      {ChefRoutes()}
      {SalesRoutes()}

      {/* Access Denied Route */}
      <Route path="/403" element={<AccessDeniedPage />} />

      {/* Route Fallback (Non-existent routes redirect back to client landing) */}
      <Route path="/settings" element={<SystemSettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
