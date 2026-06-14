import { Router } from "express";

const router = Router();

// TEST tạm trước
router.post("/login", (req, res) => {
  res.json({
    message: "login ok",
    user: { id: 1, role: "ADMIN" },
    accessToken: "fake-token",
    refreshToken: "fake-refresh",
  });
});

router.post("/register", (req, res) => {
  res.json({ message: "register ok" });
});

router.get("/me", (req, res) => {
  res.json({ id: 1, role: "ADMIN" });
});

export default router;