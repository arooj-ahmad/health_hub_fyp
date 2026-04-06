/**
 * Recipe Routes
 * POST /api/recipe/generate — Generate healthy recipes from ingredients
 */

import { Router } from 'express';
import { generateRecipes } from '../controllers/recipe.controller.js';
import { verifyFirebaseToken } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/generate', verifyFirebaseToken, aiLimiter, generateRecipes);

export default router;
