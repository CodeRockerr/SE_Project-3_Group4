import { Router } from "express";
import { recommendCombos } from "../controllers/combo.controller.js";

const router = Router();

/**
 * GET /api/food/combo-suggestions?mainItemId=...&limit=5
 */
router.get("/combo-suggestions", recommendCombos);

export default router;
