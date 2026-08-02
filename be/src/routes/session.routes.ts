import { Router } from "express";
import { sessionController } from "../controllers/session.controller";

const router = Router();

// POS APIs
router.post("/open", sessionController.openTableSession);
router.post("/close", sessionController.closeTableSession);

// Client API
router.post("/verify", sessionController.verifySession);

export default router;
