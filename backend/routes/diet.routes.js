/**
 * Diet Routes
 * POST /api/diet/generate — Generate a multi-day diet plan
 */

import { Router } from 'express';
import { generateDietPlan } from '../controllers/diet.controller.js';
import { verifyFirebaseToken } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/generate', verifyFirebaseToken, aiLimiter, generateDietPlan);

export default router;
