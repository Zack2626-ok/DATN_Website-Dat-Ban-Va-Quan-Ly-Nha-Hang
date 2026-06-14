import { Route, Navigate } from "react-router-dom";
import {
  AdminLayout,
  ManagerDashboard,
  WaiterTableMap,
  ChefKitchenQueue,
  CashierPOS,
  InventoryControl,
  MenuManagement,
  EventsManagement,
  DeliveryManagement,
  StaffManagement,
  SettingsControl,
  PartyPortalDemo,
  ClientMenuDemo,
  LoyaltyPointsDemo,
  FormDemo,
} from "../views/admin";

/**
 * AdminRoutes - Sub-route tree for the restaurant staff console
 * Routes are guarded based on selected user roles inside AdminLayout
 */
export const AdminRoutes = () => (
  <Route path="/admin" element={<AdminLayout />}>
    {/* Default redirect to Dashboard */}
    <Route index element={<Navigate to="/admin/dashboard" replace />} />
    
    {/* Administrative Consoles */}
    <Route path="dashboard" element={<ManagerDashboard />} />
    <Route path="tables" element={<WaiterTableMap />} />
    <Route path="menu" element={<MenuManagement />} />
    <Route path="kitchen" element={<ChefKitchenQueue />} />
    <Route path="cashier" element={<CashierPOS />} />
    <Route path="inventory" element={<InventoryControl />} />
    <Route path="events" element={<EventsManagement />} />
    <Route path="delivery" element={<DeliveryManagement />} />
    <Route path="staff" element={<StaffManagement />} />
    <Route path="settings" element={<SettingsControl />} />
    
    {/* Client Simulation Consoles */}
    <Route path="party-portal" element={<PartyPortalDemo />} />
    <Route path="client-menu" element={<ClientMenuDemo />} />
    <Route path="loyalty" element={<LoyaltyPointsDemo />} />
    <Route path="form-demo" element={<FormDemo />} />
  </Route>
);
