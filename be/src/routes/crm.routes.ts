import { Router } from "express";
import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerLoyaltyHistory,
  getAllVouchers,
  createVoucher,
  updateVoucher,
  toggleVoucherActive,
  deleteVoucher,
  getAllPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
} from "../controllers/crm.controller";

const router = Router();

// Customers API
router.get("/customers", getAllCustomers);
router.post("/customers", createCustomer);
router.get("/customers/:id", getCustomerById);
router.put("/customers/:id", updateCustomer);
router.delete("/customers/:id", deleteCustomer);
router.get("/customers/:id/loyalty", getCustomerLoyaltyHistory);

// Vouchers API
router.get("/vouchers", getAllVouchers);
router.post("/vouchers", createVoucher);
router.put("/vouchers/:id", updateVoucher);
router.patch("/vouchers/:id/toggle", toggleVoucherActive);
router.delete("/vouchers/:id", deleteVoucher);

// Promotions API
router.get("/promotions", getAllPromotions);
router.post("/promotions", createPromotion);
router.put("/promotions/:id", updatePromotion);
router.delete("/promotions/:id", deletePromotion);

export default router;
