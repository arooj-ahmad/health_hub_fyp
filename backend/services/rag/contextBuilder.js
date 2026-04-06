/**
 * Context Builder — RAG-Ready Placeholder
 * ─────────────────────────────────────────────────────────────────────────────
 * FUTURE: This module will build enriched context for AI prompts by:
 *   - Loading user's health profile from Firestore
 *   - Aggregating relevant past interactions
 *   - Pulling dietary preferences and restrictions
 *   - Including relevant medical history
 *
 * CURRENT: Returns empty context (passthrough).
 *
 * When RAG is implemented, controllers will call:
 *   const context = await buildContext({ userId, type: 'diet' });
 *   const enrichedPrompt = `${context}\n\n${originalPrompt}`;
 */

/**
 * Build enriched context for an AI prompt.
 *
 * @param {object} params
 * @param {string} params.userId - The authenticated user's ID
 * @param {string} params.type   - Request type: 'diet' | 'recipe' | 'chat' | 'lab'
 * @param {object} [params.metadata] - Additional metadata for context building
 * @returns {Promise<string>} Context string to prepend to the prompt (empty for now)
 */
export async function buildContext({ userId, type, metadata = {} }) {
  // TODO: Implement context retrieval from Firestore
  // Example future implementation:
  //
  // const userProfile = await firestoreService.getUserProfile(userId);
  // const recentPlans = await firestoreService.getRecentDietPlans(userId, 3);
  // const healthHistory = await firestoreService.getHealthHistory(userId);
  //
  // return formatContextString({ userProfile, recentPlans, healthHistory, type });

  return '';
}

export default { buildContext };
