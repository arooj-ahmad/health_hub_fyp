/**
 * recipeStorageService.js — Persistent storage for generated recipes
 *
 * Primary collection  : recipes_history
 * Fallback collection : recipes  (has long-deployed Firestore rules)
 *
 * The service tries recipes_history first. If that fails (e.g. security
 * rules not yet deployed), it transparently falls back to the recipes
 * collection that already has working rules and a composite index.
 *
 * Responsibilities:
 *  • saveRecipeHistory()    — store a successful generation
 *  • getUserRecipeHistory() — fetch previous generations (last 20)
 */

import { db } from '@/config/firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';

const PRIMARY = 'recipes_history';
const FALLBACK = 'recipes'; // already has deployed rules + userId/createdAt index

// ── helpers ──────────────────────────────────────────────────────────────────

function buildDoc(userId, data) {
  return {
    userId,
    ingredientsInput: Array.isArray(data.ingredientsInput) ? data.ingredientsInput : [],
    normalizedIngredients: Array.isArray(data.normalizedIngredients) ? data.normalizedIngredients : [],
    generatedRecipes: data.generatedRecipes || [],
    healthWarnings: Array.isArray(data.healthWarnings) ? data.healthWarnings : [],
    overrideUsed: data.overrideUsed ?? false,
    _type: 'recipe_generation',
    createdAt: serverTimestamp(),
  };
}

function buildQuery(col, userId, max) {
  return query(
    collection(db, col),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(max),
  );
}

// ── Save ─────────────────────────────────────────────────────────────────────

/**
 * Persist a successful recipe generation to Firestore.
 * Tries recipes_history first, falls back to recipes collection.
 *
 * @param {string} userId
 * @param {object} data
 * @returns {Promise<string>} — the new document ID
 */
export async function saveRecipeHistory(userId, data) {
  if (!userId) throw new Error('userId is required');
  if (!data?.generatedRecipes?.length) {
    console.warn('[recipeStorage] No recipes to save — skipping');
    return null;
  }

  const doc = buildDoc(userId, data);

  // Try primary collection
  try {
    const docRef = await addDoc(collection(db, PRIMARY), doc);
    console.log('[recipeStorage] Saved to', PRIMARY, ':', docRef.id);
    return docRef.id;
  } catch (primaryErr) {
    console.warn('[recipeStorage] Primary save failed:', primaryErr.message);
  }

  // Fallback to recipes collection (deployed rules + index)
  try {
    const docRef = await addDoc(collection(db, FALLBACK), doc);
    console.log('[recipeStorage] Saved to fallback', FALLBACK, ':', docRef.id);
    return docRef.id;
  } catch (fallbackErr) {
    console.error('[recipeStorage] Fallback save also failed:', fallbackErr.message);
    throw fallbackErr;
  }
}

// ── Retrieve ─────────────────────────────────────────────────────────────────

/**
 * Fetch the logged-in user's recipe history, most recent first.
 * Tries recipes_history first, falls back to recipes collection.
 *
 * @param {string} userId
 * @param {number} [max=20]
 * @returns {Promise<object[]>}
 */
export async function getUserRecipeHistory(userId, max = 20) {
  if (!userId) return [];

  // Try primary collection
  try {
    const snap = await getDocs(buildQuery(PRIMARY, userId, max));
    if (snap.docs.length > 0) {
      console.log('[recipeStorage] Loaded', snap.docs.length, 'entries from', PRIMARY);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
  } catch (e) {
    console.warn('[recipeStorage] Primary read failed:', e.message);
  }

  // Fallback: read from recipes collection (filter to generation docs)
  try {
    const snap = await getDocs(buildQuery(FALLBACK, userId, max));
    const results = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((d) => d._type === 'recipe_generation' || d.generatedRecipes);
    console.log('[recipeStorage] Loaded', results.length, 'entries from fallback', FALLBACK);
    return results;
  } catch (e) {
    console.warn('[recipeStorage] Fallback read failed:', e.message);
  }

  return [];
}
