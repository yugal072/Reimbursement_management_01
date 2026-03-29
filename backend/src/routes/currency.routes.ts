import { Router } from "express";
import { getCurrencies } from "../controllers/currency.controller";

const router = Router();

router.get("/", getCurrencies);

export default router;
