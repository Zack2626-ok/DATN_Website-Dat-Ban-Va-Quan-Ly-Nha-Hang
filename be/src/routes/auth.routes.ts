import { Router } from "express";
import { registerHandler, loginHandler, getMeHandler } from "../controllers/auth.controller";
import { authStaff, authorizeRoles } from "../middlewares/auth.middleware";

const router = Router();

router.post("/register", authStaff, authorizeRoles(["admin", "manager"]), registerHandler);
router.post("/login", loginHandler);
router.get("/me", authStaff, getMeHandler);

export default router;