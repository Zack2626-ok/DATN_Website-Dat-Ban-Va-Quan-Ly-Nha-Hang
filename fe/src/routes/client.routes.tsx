import { Route } from "react-router-dom";
import { ClientLayout, HomeView } from "../views/client";
import { MenuPage, PromotionsPage, BookingPage, AccountPage } from "../views/client";
import LoginPage from "../views/auth/LoginPage";
import { CustomerLoginPage, CustomerRegisterPage } from "../views/customer";

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

    {/* Authentication pages (standalone, no shared layout) */}
    <Route path="/auth/login" element={<LoginPage />} />
    <Route path="/customer/login" element={<CustomerLoginPage />} />
    <Route path="/customer/register" element={<CustomerRegisterPage />} />
  </>
);
