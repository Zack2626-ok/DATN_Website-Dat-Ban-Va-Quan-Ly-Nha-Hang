import { Router } from "express";
import {
  getWaitlistHandler,
  addToWaitlistHandler,
  notifyWaitlistHandler,
  removeFromWaitlistHandler,
} from "../controllers/waitlist.controller";

const router = Router();

router.get("/", getWaitlistHandler);
router.post("/", addToWaitlistHandler);
router.patch("/:id/notify", notifyWaitlistHandler);
router.delete("/:id", removeFromWaitlistHandler);

export default router;
