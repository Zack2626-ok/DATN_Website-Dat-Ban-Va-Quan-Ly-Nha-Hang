import { Route } from "react-router-dom";
import { ClientLayout, HomeView } from "../views/client";
import { MenuPage, PromotionsPage, BookingPage, AccountPage } from "../views/client";

/**
 * ClientRoutes - Sub-route tree for the customer booking website
 */
export const ClientRoutes = () => (
  <>
    {/* Public client pages with shared layout (navbar + footer) */}
    <Route path="/" element={<ClientLayout />}>
      <Route index element={<HomeView />} />
      <Route path="menu" element={<MenuPage />} />
      <Route path="promotions" element={<PromotionsPage />} />
      <Route path="booking" element={<BookingPage />} />
      <Route path="account" element={<AccountPage />} />
    </Route>
  </>
);
