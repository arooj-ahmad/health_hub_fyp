/**
 * dietPlanStorageService.js — Persistent storage for generated diet plans
 *
 * Primary read collection : dietPlans          (where saveDietPlan() writes)
 * Secondary write target  : dietplans_history  (secondary copy, rules may not be deployed)
 *
 * The history page reads from `dietPlans` first (confirmed to have data),
 * falling back to `dietplans_history`. Documents from `dietPlans` are
 * normalised to the shape the history UI expects.
 *
 * Responsibilities:
 *  • saveDietPlanHistory()    — store a secondary copy in dietplans_history
 *  • getUserDietPlanHistory() — fetch previous generations for the History page
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

const PRIMARY = 'dietPlans';          // ← main collection (data lives here)
const SECONDARY = 'dietplans_history'; // ← secondary copy

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalise a `dietPlans` document into the shape expected by the history UI.
 *
 * dietPlans docs use:  goal, targetCalories, goalType ("manual"|"auto"), healthConditions
 * History UI expects:  goalType (goal name), calorieTarget, manualGoalUsed, healthWarnings
 */
function normaliseDietPlanDoc(doc) {
  // Already in history format (from dietplans_history collection)
  if (doc.calorieTarget !== undefined) return doc;

  return {
    ...doc,
    // Map field names
    goalType: doc.goal || doc.goalType || '—',
    calorieTarget: doc.targetCalories || doc.calorieTarget || 0,
    manualGoalUsed: doc.goalType === 'manual',
    healthWarnings: doc.healthWarnings || doc.healthConditions || [],
    durationDays: doc.durationDays || 0,
    dailyPlans: doc.dailyPlans || [],
  };
}

// ── Save ─────────────────────────────────────────────────────────────────────

/**
 * Persist a secondary copy of a diet plan generation to dietplans_history.
 * The primary save is handled by saveDietPlan() in dietAIService → firestoreService.
 *
 * @param {string} userId
 * @param {object} data
 * @param {string} data.goalType       — e.g. "Weight Loss"
 * @param {number} data.durationDays
 * @param {number} data.calorieTarget
 * @param {object[]} data.dailyPlans   — the full AI-generated plan array
 * @param {boolean} data.manualGoalUsed
 * @param {string[]} data.healthWarnings
 * @returns {Promise<string|null>} — document ID or null
 */
export async function saveDietPlanHistory(userId, data) {
  if (!userId) {
    console.error('[dietPlanStorage] userId is required for saving to dietplans_history');
    return null;
  }
  if (!data) {
    console.warn('[dietPlanStorage] data is required for saving to dietplans_history');
    return null;
  }
  if (!data?.dailyPlans || !Array.isArray(data.dailyPlans)) {
    console.warn('[dietPlanStorage] dailyPlans is required and must be an array');
    return null;
  }
  if (data.dailyPlans.length === 0) {
    console.warn('[dietPlanStorage] dailyPlans array is empty, skipping save');
    return null;
  }

  try {
    console.log('[dietPlanStorage] Saving to', SECONDARY, '- userId:', userId, 'plans:', data.dailyPlans.length, 'days:', data.durationDays);

    const payload = {
      userId,
      goalType: data.goalType || '',
      durationDays: data.durationDays || 0,
      calorieTarget: data.calorieTarget || 0,
      dailyPlans: data.dailyPlans || [],
      manualGoalUsed: data.manualGoalUsed ?? false,
      healthWarnings: Array.isArray(data.healthWarnings) ? data.healthWarnings : [],
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, SECONDARY), payload);
    console.log('[dietPlanStorage] Successfully saved to', SECONDARY, ':', docRef.id);
    return docRef.id;
  } catch (err) {
    console.error('[dietPlanStorage] Secondary save failed:', err.message);
    console.error('[dietPlanStorage] Attempted to save payload:', { userId, goalType: data.goalType, durationDays: data.durationDays, dailyPlansCount: data.dailyPlans?.length });
    return null; // Non-fatal — primary save to dietPlans already succeeded
  }
}

// ── Retrieve ─────────────────────────────────────────────────────────────────

/**
 * Fetch the logged-in user's diet plan history, most recent first.
 *
 * Queries the `dietPlans` collection first (where data actually lives),
 * then falls back to `dietplans_history` if nothing is found.
 *
 * @param {string} userId
 * @param {number} [max=20]
 * @returns {Promise<object[]>}
 */
export async function getUserDietPlanHistory(userId, max = 20) {
  if (!userId) return [];

  // 1) Try the PRIMARY collection: dietPlans (confirmed to have documents)
  try {
    const q = query(
      collection(db, PRIMARY),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(max),
    );
    const snap = await getDocs(q);

    if (snap.docs.length > 0) {
      console.log('[dietPlanStorage] Loaded', snap.docs.length, 'entries from', PRIMARY);
      return snap.docs.map((d) => normaliseDietPlanDoc({ id: d.id, ...d.data() }));
    }
  } catch (err) {
    console.warn('[dietPlanStorage] Primary read failed:', err.message);
  }

  // 2) Fallback: dietplans_history
  try {
    const q = query(
      collection(db, SECONDARY),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(max),
    );
    const snap = await getDocs(q);

    if (snap.docs.length > 0) {
      console.log('[dietPlanStorage] Loaded', snap.docs.length, 'entries from', SECONDARY);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
  } catch (err) {
    console.warn('[dietPlanStorage] Secondary read failed:', err.message);
  }

  return [];
}
