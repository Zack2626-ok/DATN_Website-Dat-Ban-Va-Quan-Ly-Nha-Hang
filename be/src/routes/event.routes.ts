import { Router } from "express";
import {
  getEventsHandler,
  getEventByIdHandler,
  createEventHandler,
  updateEventHandler,
  updateStatusHandler
} from "../controllers/event.controller";

const router = Router();

router.get("/", getEventsHandler);
router.get("/:id", getEventByIdHandler);
router.post("/", createEventHandler);
router.put("/:id", updateEventHandler);
router.patch("/:id/status", updateStatusHandler);

export default router;
