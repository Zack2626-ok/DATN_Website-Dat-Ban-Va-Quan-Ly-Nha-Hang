import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ClientRoutes } from "./client.routes";
import { AdminRoutes } from "./admin.routes";

/**
 * AppRoutes - Main router gateway combining separated admin and client routes
 */
export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Customer Client Side Routes */}
      {ClientRoutes()}

      {/* Staff Admin Workspace Routes */}
      {AdminRoutes()}

      {/* Route Fallback (Non-existent routes redirect back to client landing) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
