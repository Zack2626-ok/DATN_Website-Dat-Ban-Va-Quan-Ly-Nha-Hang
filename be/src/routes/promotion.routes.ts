import { Router } from "express";
import {
  getAllPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion,
} from "../controllers/promotion.controller";

const router = Router();

router.get("/", getAllPromotions);
router.post("/", createPromotion);
router.get("/:id", getPromotionById);
router.patch("/:id", updatePromotion);
router.delete("/:id", deletePromotion);

export default router;
