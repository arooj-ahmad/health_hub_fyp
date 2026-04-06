/**
 * Chat Routes
 * POST /api/chat — AI Doctor chatbot conversation
 */

import { Router } from 'express';
import { handleChat } from '../controllers/chat.controller.js';
import { verifyFirebaseToken } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { normalizeChatInput } from '../middleware/normalizeInput.js';

const router = Router();

router.post('/', verifyFirebaseToken, aiLimiter, normalizeChatInput, handleChat);

export default router;
