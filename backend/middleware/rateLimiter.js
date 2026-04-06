/**
 * Rate Limiter Middleware
 * ─────────────────────────────────────────────────────────────────────────────
 * Basic rate limiting to prevent API abuse.
 * Uses express-rate-limit with sensible defaults for AI endpoints.
 *
 * Future: Can be swapped for Redis-based rate limiting in production.
 */

import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter — 60 requests per minute per IP.
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please try again in a minute.',
  },
});

/**
 * AI endpoint rate limiter — stricter: 10 requests per minute per IP.
 * AI calls are expensive; this prevents runaway usage.
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'AI request rate limit exceeded. Please wait before trying again.',
  },
});
