import { Router } from "express";
import {
  registerCustomer,
  loginCustomer,
  getCustomerMe,
  updateCustomerMe,
  changeCustomerPassword,
  getCustomerLoyalty,
  getVouchers,
  redeemCustomerVoucher,
  getMyUnusedVouchers,
  getMyBookings,
  createEventContract,
  getMyEventContracts,
  cancelMyBooking,
} from "../controllers/customerAuth.controller";
import { authCustomer } from "../middlewares/auth.middleware";

const router = Router();

// Public auth routes
router.post("/register", registerCustomer);
router.post("/login", loginCustomer);

// Protected routes
router.get("/me", authCustomer, getCustomerMe);
router.patch("/me", authCustomer, updateCustomerMe);
router.patch("/me/change-password", authCustomer, changeCustomerPassword);
router.get("/loyalty", authCustomer, getCustomerLoyalty);
router.get("/vouchers", authCustomer, getVouchers);
router.post("/vouchers/redeem", authCustomer, redeemCustomerVoucher);
router.get("/my-unused-vouchers", authCustomer, getMyUnusedVouchers);
router.get("/bookings/my", authCustomer, getMyBookings);
router.patch("/bookings/:id/cancel", authCustomer, cancelMyBooking);
router.post("/contracts", authCustomer, createEventContract);
router.get("/contracts/my", authCustomer, getMyEventContracts);

export default router;
