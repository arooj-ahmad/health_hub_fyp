/**
 * Lab Report Routes
 * POST /api/lab/analyze — Analyze lab report values
 */

import { Router } from 'express';
import { analyzeLabReport } from '../controllers/lab.controller.js';
import { verifyFirebaseToken } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/analyze', verifyFirebaseToken, aiLimiter, analyzeLabReport);

export default router;
