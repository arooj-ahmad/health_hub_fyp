/**
 * AI Generations Logger
 * ─────────────────────────────────────────────────────────────────────────────
 * Stores structured generation records in Firestore `ai_generations` collection.
 *
 * Every AI call (diet, recipe, chat, lab) produces a generation record with:
 *   - Full input snapshot (raw + normalized)
 *   - System-computed values
 *   - Provider/model metadata
 *   - Latency measurement
 *   - Output preview + success status
 *   - Prompt & schema version tags
 *
 * CRITICAL: Logging is async and fire-and-forget. It MUST NOT:
 *   - Block the API response
 *   - Throw errors that break the controller
 *   - Slow down the user experience
 *
 * DATA PURPOSE: These records enable future:
 *   - RAG quality evaluation
 *   - Prompt A/B testing via promptVersion
 *   - Response drift detection via schemaVersion
 *   - User-level usage analytics
 *   - Fine-tuning dataset generation
 */

import { db, isFirebaseInitialized } from '../../config/firebase.js';
import config from '../../config/index.js';
import crypto from 'crypto';

// ── Version Constants ───────────────────────────────────────────────────────
// Bump these when prompt templates or output schemas change.

export const PROMPT_VERSIONS = {
  diet: 'diet_v1',
  recipe: 'recipe_v1',
  chat: 'chat_v1',
  lab: 'lab_v1',
};

export const SCHEMA_VERSIONS = {
  diet: 'diet_schema_v1',
  recipe: 'recipe_schema_v1',
  chat: 'chat_schema_v1',
  lab: 'lab_schema_v1',
};

/**
 * Log an AI generation event — fire-and-forget.
 *
 * @param {object} params
 * @param {string} params.userId           - Authenticated user ID
 * @param {string} params.type             - 'diet' | 'recipe' | 'chat' | 'lab'
 * @param {object} params.rawInput         - Original request body (before normalization)
 * @param {object} params.normalizedInput  - Cleaned/normalized input
 * @param {object} params.systemComputed   - Backend-computed values (BMI, calories, macros)
 * @param {number} params.latencyMs        - Time taken for AI call(s) in milliseconds
 * @param {boolean} params.success         - Whether AI call succeeded
 * @param {string|null} params.error       - Error message (null on success)
 * @param {string} params.outputPreview    - First 500 chars of AI output
 * @param {string} [params.outputRef]      - Optional Firestore doc reference for full output
 * @param {object} [params.metadata]       - Additional metadata (day count, ingredient list, etc.)
 */
export function logGeneration({
  userId,
  type,
  rawInput,
  normalizedInput,
  systemComputed = {},
  latencyMs,
  success: isSuccess,
  error: errorMsg = null,
  outputPreview = '',
  outputRef = null,
  metadata = {},
}) {
  // Fire-and-forget — do NOT await this in the controller
  _persistLog({
    userId,
    type,
    rawInput,
    normalizedInput,
    systemComputed,
    latencyMs,
    success: isSuccess,
    error: errorMsg,
    outputPreview,
    outputRef,
    metadata,
  }).catch((err) => {
    // Silent failure — logging must never break the application
    console.warn('[aiLogger] Failed to persist generation log:', err.message);
  });
}

/**
 * Internal: Actually write the record to Firestore.
 * Separated so the public function can fire-and-forget.
 */
async function _persistLog({
  userId,
  type,
  rawInput,
  normalizedInput,
  systemComputed,
  latencyMs,
  success: isSuccess,
  error: errorMsg,
  outputPreview,
  outputRef,
  metadata,
}) {
  const generationId = crypto.randomUUID();
  const providerName = config.ai.provider;
  const providerConfig = config.ai[providerName] || {};

  const record = {
    generationId,
    userId: userId || 'anonymous',
    type,
    promptVersion: PROMPT_VERSIONS[type] || `${type}_v1`,
    schemaVersion: SCHEMA_VERSIONS[type] || `${type}_schema_v1`,
    inputs: _sanitizeForFirestore(rawInput),
    normalizedInputs: _sanitizeForFirestore(normalizedInput),
    systemComputed: _sanitizeForFirestore(systemComputed),
    provider: providerName,
    model: providerConfig.model || 'unknown',
    latencyMs: Math.round(latencyMs) || 0,
    success: isSuccess,
    error: errorMsg || null,
    outputPreview: typeof outputPreview === 'string'
      ? outputPreview.substring(0, 500)
      : '',
    outputRef: outputRef || null,
    metadata: _sanitizeForFirestore(metadata),
    createdAt: new Date(),
  };

  // ── Persist to Firestore if available ──
  if (isFirebaseInitialized && db) {
    await db.collection('ai_generations').doc(generationId).set(record);
    console.log(`[aiLogger] ✓ Logged generation ${generationId} (${type}, ${latencyMs}ms, ${isSuccess ? 'ok' : 'fail'})`);
    return generationId;
  }

  // ── Fallback: Log to console in dev ──
  if (config.isDev) {
    console.log(`[aiLogger] [DEV] generation=${generationId} type=${type} user=${userId} latency=${latencyMs}ms success=${isSuccess}`);
  }

  return generationId;
}

/**
 * Sanitize an object for Firestore storage.
 * Removes undefined values and functions, truncates huge strings,
 * and ensures the object is serializable.
 */
function _sanitizeForFirestore(obj) {
  if (!obj || typeof obj !== 'object') return obj || {};

  try {
    // Deep clone via JSON to strip functions, undefined, circular refs
    const cleaned = JSON.parse(JSON.stringify(obj, (key, value) => {
      // Truncate very long strings (e.g. PDF text, full prompts)
      if (typeof value === 'string' && value.length > 5000) {
        return value.substring(0, 5000) + '...[truncated]';
      }
      return value;
    }));
    return cleaned;
  } catch (err) {
    console.warn('[aiLogger] Failed to sanitize object for Firestore:', err.message);
    return { _sanitizeError: err.message };
  }
}

/**
 * Create a latency timer.
 * Call start() before AI call, then call stop() after.
 *
 * @returns {{ stop: () => number }}
 */
export function createTimer() {
  const start = performance.now();
  return {
    stop() {
      return Math.round(performance.now() - start);
    },
  };
}

export default { logGeneration, createTimer, PROMPT_VERSIONS, SCHEMA_VERSIONS };
