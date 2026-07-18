import { Router } from "express";
import {
  getPublicMenu,
  getPublicPromotions,
  getPublicHalls,
  getPublicEventPackages,
} from "../controllers/customerPublic.controller";

const router = Router();

router.get("/menu", getPublicMenu);
router.get("/promotions", getPublicPromotions);
router.get("/halls", getPublicHalls);
router.get("/event-packages", getPublicEventPackages);

export default router;
