import { Router } from "express";
import multer from "multer";
import path from "path";
import {
  submitExpense,
  getMyExpenses,
  getPendingApprovals,
  getAllExpenses,
  getExpenseById,
  takeApprovalAction,
  overrideExpense,
  resubmitExpense,
} from "../controllers/expense.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

// Multer setup for local disk storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, "../../uploads"));
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only images and PDFs are allowed"));
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

// Order matters — specific paths before param paths
router.get("/mine", authenticate, getMyExpenses);
router.get("/pending-approvals", authenticate, requireRole("MANAGER", "ADMIN"), getPendingApprovals);
router.get("/", authenticate, requireRole("ADMIN"), getAllExpenses);
router.get("/:id", authenticate, getExpenseById);

router.post("/", authenticate, upload.single("receipt"), submitExpense);
router.post("/:id/action", authenticate, requireRole("MANAGER", "ADMIN"), takeApprovalAction);
router.post("/:id/override", authenticate, requireRole("ADMIN"), overrideExpense);
router.post("/:id/resubmit", authenticate, resubmitExpense);

export default router;
