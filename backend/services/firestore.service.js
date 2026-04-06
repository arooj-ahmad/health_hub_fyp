/**
 * Firestore Service — Backend Data Access Layer
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides read/write operations for Firestore from the backend.
 * Uses Firebase Admin SDK (server-side, no client auth needed).
 *
 * CURRENT: Placeholder structure with core operations stubbed.
 * The frontend currently handles Firestore directly via client SDK.
 * This service will be populated as features migrate to the backend.
 */

import { db, isFirebaseInitialized } from '../config/firebase.js';

/**
 * Save a generated diet plan to Firestore.
 *
 * @param {string} userId
 * @param {object} planData
 * @returns {Promise<string>} document ID
 */
export async function saveDietPlan(userId, planData) {
  if (!isFirebaseInitialized || !db) {
    console.warn('[firestore] Not initialized — skipping saveDietPlan');
    return null;
  }

  const docRef = await db.collection('users').doc(userId)
    .collection('dietPlans').add({
      ...planData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  return docRef.id;
}

/**
 * Save a chat message to Firestore.
 *
 * @param {string} userId
 * @param {object} messageData - { role, content }
 * @returns {Promise<string|null>} document ID
 */
export async function saveChatMessage(userId, messageData) {
  if (!isFirebaseInitialized || !db) {
    console.warn('[firestore] Not initialized — skipping saveChatMessage');
    return null;
  }

  const docRef = await db.collection('users').doc(userId)
    .collection('chatHistory').add({
      ...messageData,
      timestamp: new Date(),
    });

  return docRef.id;
}

/**
 * Get user health profile.
 *
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function getUserProfile(userId) {
  if (!isFirebaseInitialized || !db) {
    console.warn('[firestore] Not initialized — skipping getUserProfile');
    return null;
  }

  const doc = await db.collection('users').doc(userId)
    .collection('healthProfile').doc('current').get();

  return doc.exists ? doc.data() : null;
}

/**
 * Save recipe generation result.
 *
 * @param {string} userId
 * @param {object} recipeData
 * @returns {Promise<string|null>}
 */
export async function saveRecipeResult(userId, recipeData) {
  if (!isFirebaseInitialized || !db) {
    console.warn('[firestore] Not initialized — skipping saveRecipeResult');
    return null;
  }

  const docRef = await db.collection('users').doc(userId)
    .collection('recipes').add({
      ...recipeData,
      createdAt: new Date(),
    });

  return docRef.id;
}

/**
 * Save lab analysis result.
 *
 * @param {string} userId
 * @param {object} labData
 * @returns {Promise<string|null>}
 */
export async function saveLabAnalysis(userId, labData) {
  if (!isFirebaseInitialized || !db) {
    console.warn('[firestore] Not initialized — skipping saveLabAnalysis');
    return null;
  }

  const docRef = await db.collection('users').doc(userId)
    .collection('labAnalyses').add({
      ...labData,
      createdAt: new Date(),
    });

  return docRef.id;
}

export default {
  saveDietPlan,
  saveChatMessage,
  getUserProfile,
  saveRecipeResult,
  saveLabAnalysis,
};
