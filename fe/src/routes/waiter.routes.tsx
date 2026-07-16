import { Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import {
  WaiterLayout,
  WaiterTableMap,
  BookingListPage,
  OrderPage,
  OrderTableListPage,
} from "../views/waiter";

export const WaiterRoutes = () => (
  <Route
    path="/waiter"
    element={
      <ProtectedRoute allowedRoles={["waiter", "manager", "admin"]}>
        <WaiterLayout />
      </ProtectedRoute>
    }
  >
    <Route index element={<Navigate to="/waiter/tables" replace />} />
    <Route path="tables" element={<WaiterTableMap />} />
    <Route path="bookings" element={<BookingListPage />} />
    <Route path="orders" element={<OrderTableListPage />} />
    <Route path="orders/:tableId" element={<OrderPage />} />
  </Route>
);
