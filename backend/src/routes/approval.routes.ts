import { Router } from "express";
import {
  createApprovalFlow,
  getApprovalFlows,
  getApprovalFlowById,
  updateApprovalFlow,
  deleteApprovalFlow,
  setDefaultFlow,
} from "../controllers/approval.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.get("/", authenticate, requireRole("ADMIN"), getApprovalFlows);
router.get("/:id", authenticate, requireRole("ADMIN"), getApprovalFlowById);
router.post("/", authenticate, requireRole("ADMIN"), createApprovalFlow);
router.put("/:id", authenticate, requireRole("ADMIN"), updateApprovalFlow);
router.delete("/:id", authenticate, requireRole("ADMIN"), deleteApprovalFlow);
router.post("/:id/set-default", authenticate, requireRole("ADMIN"), setDefaultFlow);

export default router;
