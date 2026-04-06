/**
 * Knowledge Base Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides structured queries against three Firestore knowledge collections:
 *
 *   nutrition_facts     — USDA-sourced nutrient data for common Pakistani foods
 *   clinical_guidelines — Condition-specific dietary rules (ADA, WHO, etc.)
 *   recipes_catalog     — Pre-vetted halal recipes with safety metadata
 *
 * QUERY STRATEGY (pre-embedding):
 *   Uses simple Firestore field filters + array-contains queries.
 *   When vector search is added later, these become fallback/hybrid filters.
 *
 * CACHING: In-memory cache with TTL to avoid hammering Firestore on every request.
 */

import { db, isFirebaseInitialized } from '../../config/firebase.js';

// ── In-memory cache ─────────────────────────────────────────────────────────

const _cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    _cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  _cache.set(key, { data, timestamp: Date.now() });
}

// ═════════════════════════════════════════════════════════════════════════════
// NUTRITION FACTS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Get nutrition facts by ingredient IDs.
 *
 * @param {string[]} ingredientIds - e.g. ['chicken_breast', 'lentils', 'brown_rice']
 * @returns {Promise<Array>}
 */
export async function getNutritionFacts(ingredientIds = []) {
  if (!isFirebaseInitialized || !db || ingredientIds.length === 0) return [];

  const cacheKey = `nf:${ingredientIds.sort().join(',')}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    // Firestore 'in' queries support max 30 values
    const chunks = chunkArray(ingredientIds.slice(0, 30), 10);
    const results = [];

    for (const chunk of chunks) {
      const snap = await db.collection('nutrition_facts')
        .where('ingredientId', 'in', chunk)
        .get();
      snap.forEach((doc) => results.push({ id: doc.id, ...doc.data() }));
    }

    setCache(cacheKey, results);
    return results;
  } catch (err) {
    console.warn('[knowledgeBase] getNutritionFacts error:', err.message);
    return [];
  }
}

/**
 * Get nutrition facts matching specific diet tags.
 *
 * @param {string[]} tags - e.g. ['halal', 'high_protein']
 * @param {number} [limit=10]
 * @returns {Promise<Array>}
 */
export async function getNutritionByTags(tags = [], limit = 10) {
  if (!isFirebaseInitialized || !db || tags.length === 0) return [];

  const cacheKey = `nf_tags:${tags.sort().join(',')}:${limit}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    // Firestore array-contains only supports ONE value per query
    const tag = tags[0];
    const snap = await db.collection('nutrition_facts')
      .where('dietTags', 'array-contains', tag)
      .limit(limit)
      .get();

    const results = [];
    snap.forEach((doc) => results.push({ id: doc.id, ...doc.data() }));

    // Client-side filter for remaining tags
    const filtered = tags.length > 1
      ? results.filter((r) => tags.every((t) => (r.dietTags || []).includes(t)))
      : results;

    setCache(cacheKey, filtered);
    return filtered;
  } catch (err) {
    console.warn('[knowledgeBase] getNutritionByTags error:', err.message);
    return [];
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// CLINICAL GUIDELINES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Get clinical guidelines for specific health conditions.
 *
 * @param {string[]} conditionIds - Normalized condition IDs from normalizeInput
 *   e.g. ['type2_diabetes', 'hypertension']
 * @returns {Promise<Array>}
 */
export async function getClinicalGuidelines(conditionIds = []) {
  if (!isFirebaseInitialized || !db || conditionIds.length === 0) return [];

  const cacheKey = `cg:${conditionIds.sort().join(',')}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const chunks = chunkArray(conditionIds.slice(0, 30), 10);
    const results = [];

    for (const chunk of chunks) {
      const snap = await db.collection('clinical_guidelines')
        .where('conditionId', 'in', chunk)
        .get();
      snap.forEach((doc) => results.push({ id: doc.id, ...doc.data() }));
    }

    setCache(cacheKey, results);
    return results;
  } catch (err) {
    console.warn('[knowledgeBase] getClinicalGuidelines error:', err.message);
    return [];
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// RECIPES CATALOG
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Get recipes safe for given health conditions.
 *
 * @param {object} params
 * @param {string[]} [params.conditionIds] - Filter by safe conditions
 * @param {string[]} [params.dietTags] - Filter by diet tags
 * @param {number} [params.maxCalories] - Max calories per serving
 * @param {number} [params.limit=5]
 * @returns {Promise<Array>}
 */
export async function getRecipesCatalog({ conditionIds = [], dietTags = [], maxCalories, limit = 5 } = {}) {
  if (!isFirebaseInitialized || !db) return [];

  const cacheKey = `rc:${conditionIds.join(',')}:${dietTags.join(',')}:${maxCalories || 'any'}:${limit}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    let query = db.collection('recipes_catalog');

    // Apply ONE array-contains filter
    if (conditionIds.length > 0) {
      query = query.where('safeForConditions', 'array-contains', conditionIds[0]);
    } else if (dietTags.length > 0) {
      query = query.where('dietTags', 'array-contains', dietTags[0]);
    }

    query = query.limit(limit);
    const snap = await query.get();

    let results = [];
    snap.forEach((doc) => results.push({ id: doc.id, ...doc.data() }));

    // Client-side filtering for additional constraints
    if (maxCalories) {
      results = results.filter((r) => (r.calories || 0) <= maxCalories);
    }
    if (conditionIds.length > 1) {
      results = results.filter((r) =>
        conditionIds.every((c) => (r.safeForConditions || []).includes(c))
      );
    }

    setCache(cacheKey, results);
    return results;
  } catch (err) {
    console.warn('[knowledgeBase] getRecipesCatalog error:', err.message);
    return [];
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Clear the knowledge base cache (for testing/admin).
 */
export function clearCache() {
  _cache.clear();
}

export default {
  getNutritionFacts,
  getNutritionByTags,
  getClinicalGuidelines,
  getRecipesCatalog,
  clearCache,
};
