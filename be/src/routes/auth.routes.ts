import { Router } from "express";
import { registerHandler, loginHandler, getMeHandler } from "../controllers/auth.controller";

const router = Router();

router.post("/register", registerHandler);
router.post("/login", loginHandler);
router.get("/me", getMeHandler);

export default router;