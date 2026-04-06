/**
 * Request Logger Middleware
 * ─────────────────────────────────────────────────────────────────────────────
 * Logs every incoming request with method, URL, userId, and timing.
 *
 * RAG-READY HOOK: This logger is designed to be extended with:
 *   - Request body hashing for replay/audit
 *   - Prompt logging for fine-tuning datasets
 *   - Response content logging for quality evaluation
 *
 * To enable prompt logging later, add a post-response hook that captures
 * the AI prompt and response alongside this metadata.
 */

const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const userId = req.user?.uid || 'anonymous';

    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: duration,
      userId,
      ip: req.ip,
      // RAG-READY: Uncomment to log prompt metadata for training
      // promptType: req.body?.type || 'unknown',
      // promptLength: JSON.stringify(req.body || '').length,
    };

    if (res.statusCode >= 400) {
      console.warn('[REQUEST]', JSON.stringify(logEntry));
    } else {
      console.log('[REQUEST]', JSON.stringify(logEntry));
    }
  });

  next();
};

export default requestLogger;
