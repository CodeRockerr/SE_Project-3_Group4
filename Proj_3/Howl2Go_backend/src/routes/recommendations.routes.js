import { Router } from 'express';
import { recommendByIngredients } from '../controllers/ingredientRecommendation.controller.js';

const router = Router();

// GET /api/recommendations/ingredients?include=lettuce,tomato&exclude=cheese
router.get('/ingredients', recommendByIngredients);

export default router;
