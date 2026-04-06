/**
 * Global Error Handler Middleware
 * ─────────────────────────────────────────────────────────────────────────────
 * Catches unhandled errors from controllers/services and returns a
 * consistent JSON error response. Prevents stack traces from leaking
 * to clients in production.
 */

import config from '../config/index.js';

export const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  console.error(`[ERROR] ${req.method} ${req.originalUrl} →`, {
    status: statusCode,
    message,
    ...(config.isDev && { stack: err.stack }),
  });

  res.status(statusCode).json({
    success: false,
    error: config.isDev ? message : 'An unexpected error occurred.',
    ...(config.isDev && { stack: err.stack }),
  });
};
