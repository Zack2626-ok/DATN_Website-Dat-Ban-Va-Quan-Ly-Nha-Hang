import { Router } from "express";
import {
  getRolesHandler,
  getUsersHandler,
  createUserHandler,
  updateUserHandler,
  deleteUserHandler,
} from "../controllers/user.controller";
import { authStaff, authorizeRoles } from "../middlewares/auth.middleware";

const router = Router();

router.use(authStaff);
router.use(authorizeRoles(["admin", "manager"]));

router.get("/roles", getRolesHandler);
router.get("/", getUsersHandler);
router.post("/create", createUserHandler);
router.patch("/:id/update", updateUserHandler);
router.patch("/:id/delete", deleteUserHandler);

export default router;
