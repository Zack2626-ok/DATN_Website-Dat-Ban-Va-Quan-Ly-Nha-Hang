import { Router } from "express";
import {
  getRestaurantInfo,
  updateRestaurantInfo,
} from "../controllers/restaurantInfo.controller";

const router = Router();

router.get("/", getRestaurantInfo);
router.put("/", updateRestaurantInfo);

export default router;
