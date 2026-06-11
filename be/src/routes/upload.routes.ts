import { Router } from "express";
import { uploadImage } from "../controllers/upload.controller";
import { upload } from "../middlewares/upload.middleware";

const router = Router();

router.post("/", upload.single("image"), uploadImage);

export default router;
