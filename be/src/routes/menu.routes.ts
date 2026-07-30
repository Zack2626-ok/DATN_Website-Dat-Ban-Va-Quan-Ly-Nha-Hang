import { Router } from "express";
import {
  getAllMenuItems,
  getMenuItemById,
  getMenuItemsByCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
  getMenuRecipe,
  updateMenuRecipe,
} from "../controllers/menu.controller";

const router = Router();

router.get("/", getAllMenuItems);
router.get("/category/:category", getMenuItemsByCategory);
router.post("/", createMenuItem);
router.get("/:id", getMenuItemById);
router.patch("/:id", updateMenuItem);
router.patch("/:id/availability", toggleMenuItemAvailability);
router.delete("/:id", deleteMenuItem);

// Recipe routes
router.get("/:id/recipe", getMenuRecipe);
router.put("/:id/recipe", updateMenuRecipe);

export default router;
