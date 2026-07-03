import { Router } from "express";
import {
  getHallsHandler,
  createHallHandler,
  updateHallHandler,
  toggleHallHandler,
  getPackagesHandler,
  createPackageHandler,
  updatePackageHandler,
  togglePackageHandler,
} from "../controllers/eventConfig.controller";

const router = Router();

// Halls routes
router.get("/halls", getHallsHandler);
router.post("/halls/create", createHallHandler);
router.patch("/halls/:id/update", updateHallHandler);
router.patch("/halls/:id/toggle", toggleHallHandler);

// Packages routes
router.get("/packages", getPackagesHandler);
router.post("/packages/create", createPackageHandler);
router.patch("/packages/:id/update", updatePackageHandler);
router.patch("/packages/:id/toggle", togglePackageHandler);

export default router;
