import { Route } from "react-router-dom";
import { ClientLayout, HomeView } from "../views/client";

/**
 * ClientRoutes - Sub-route tree for the customer booking website
 */
export const ClientRoutes = () => (
  <Route path="/" element={<ClientLayout />}>
    <Route index element={<HomeView />} />
  </Route>
);
