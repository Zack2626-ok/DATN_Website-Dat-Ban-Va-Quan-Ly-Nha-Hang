import { Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { CashierLayout, CashierPaymentPage, PaymentHistoryPage, CashierBookingDepositPage } from "../views/cashier";

export const CashierRoutes = () => (
  <Route
    path="/cashier"
    element={
      <ProtectedRoute allowedRoles={["cashier", "manager", "admin"]}>
        <CashierLayout />
      </ProtectedRoute>
    }
  >
    <Route index element={<Navigate to="/cashier/payment" replace />} />
    <Route path="pos" element={<Navigate to="/cashier/payment" replace />} />
    <Route path="payment" element={<CashierPaymentPage />} />
    <Route path="deposit" element={<CashierBookingDepositPage />} />
    <Route path="history" element={<PaymentHistoryPage />} />
  </Route>
);
