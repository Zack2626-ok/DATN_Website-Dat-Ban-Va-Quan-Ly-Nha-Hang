import { Router } from "express";
import {
  getPublicMenu,
  getPublicPromotions,
  getPublicHalls,
  getPublicEventPackages,
  handleAIChatHandler,
} from "../controllers/customerPublic.controller";

const router = Router();

router.get("/menu", getPublicMenu);
router.get("/promotions", getPublicPromotions);
router.get("/halls", getPublicHalls);
router.get("/event-packages", getPublicEventPackages);
router.post("/ai-chat", handleAIChatHandler);

export default router;
