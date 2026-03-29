import { Router } from "express";
import { getUsers, createUser, updateUser, deleteUser } from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.get("/", authenticate, requireRole("ADMIN", "MANAGER"), getUsers);
router.post("/", authenticate, requireRole("ADMIN"), createUser);
router.patch("/:id", authenticate, requireRole("ADMIN"), updateUser);
router.delete("/:id", authenticate, requireRole("ADMIN"), deleteUser);

export default router;
