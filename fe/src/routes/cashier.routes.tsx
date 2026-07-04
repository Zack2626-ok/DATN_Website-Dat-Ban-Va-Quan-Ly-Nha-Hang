import { Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { CashierLayout, CashierPOS, CashierPaymentPage } from "../views/cashier";

export const CashierRoutes = () => (
  <Route
    path="/cashier"
    element={
      <ProtectedRoute allowedRoles={["cashier"]}>
        <CashierLayout />
      </ProtectedRoute>
    }
  >
    <Route index element={<Navigate to="/cashier/payment" replace />} />
    <Route path="pos" element={<CashierPOS />} />
    <Route path="payment" element={<CashierPaymentPage />} />
  </Route>
);
