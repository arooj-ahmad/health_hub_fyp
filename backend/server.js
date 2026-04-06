/**
 * HealthHub Backend — Express Server
 * ─────────────────────────────────────────────────────────────────────────────
 * Production-grade Node.js backend for AI orchestration.
 *
 * Architecture:
 *   Request → CORS → JSON parse → Logger → Auth → Rate Limit → Controller → Response
 *
 * Controllers follow the pipeline:
 *   Validate → contextBuilder (RAG) → retrievalLayer (RAG) → metadataInjector (RAG) → AI Service → Format
 */

import express from 'express';
import cors from 'cors';
import config from './config/index.js';
import requestLogger from './middleware/requestLogger.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import dietRoutes from './routes/diet.routes.js';
import recipeRoutes from './routes/recipe.routes.js';
import chatRoutes from './routes/chat.routes.js';
import labRoutes from './routes/lab.routes.js';

const app = express();

// ── Global Middleware ───────────────────────────────────────────────────────

// CORS — allow frontend origins
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parse JSON bodies (limit to 10MB for lab report text)
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Global rate limiter (per-route AI limiter is applied in routes)
app.use('/api', apiLimiter);

// ── Routes ──────────────────────────────────────────────────────────────────

// Health check (no auth required)
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      service: 'healthhub-backend',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      ai: {
        provider: config.ai.provider,
        configured: !!config.ai[config.ai.provider]?.apiKey,
      },
    },
  });
});

// Feature routes
app.use('/api/diet', dietRoutes);
app.use('/api/recipe', recipeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/lab', labRoutes);

// ── 404 handler ─────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ── Global error handler ────────────────────────────────────────────────────

app.use(errorHandler);

// ── Start Server ────────────────────────────────────────────────────────────

app.listen(config.port, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  🏥 HealthHub Backend v1.0.0`);
  console.log(`  🌐 Running on http://localhost:${config.port}`);
  console.log(`  🤖 AI Provider: ${config.ai.provider}`);
  console.log(`  🔧 Environment: ${config.nodeEnv}`);
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log('  Endpoints:');
  console.log(`  GET  /api/health          → Health check`);
  console.log(`  POST /api/diet/generate   → Diet plan generation`);
  console.log(`  POST /api/recipe/generate → Recipe generation`);
  console.log(`  POST /api/chat            → AI Doctor chat`);
  console.log(`  POST /api/lab/analyze     → Lab report analysis`);
  console.log('');
});

export default app;
