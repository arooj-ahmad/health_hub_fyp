/**
 * Diet Routes
 * POST /api/diet/generate — Generate a multi-day diet plan
 */

import { Router } from 'express';
import { generateDietPlan } from '../controllers/diet.controller.js';
import { verifyFirebaseToken } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { normalizeDietInput } from '../middleware/normalizeInput.js';

const router = Router();

router.post('/generate', verifyFirebaseToken, aiLimiter, normalizeDietInput, generateDietPlan);

export default router;
