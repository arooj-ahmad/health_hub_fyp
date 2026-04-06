/**
 * Context Builder — Knowledge-Aware Implementation
 * ─────────────────────────────────────────────────────────────────────────────
 * Builds enriched context by querying the knowledge base collections:
 *   - clinical_guidelines: condition-specific dietary rules
 *   - nutrition_facts: nutrient data for relevant ingredients
 *   - recipes_catalog: pre-vetted safe recipes
 *
 * STRATEGY: Simple Firestore queries (no vector search).
 * When embeddings are added later, this module calls the retrieval layer
 * FIRST, then falls back to these structured queries.
 *
 * CACHING: Delegates to knowledgeBase.js internal cache.
 *
 * RETURNS: Structured context object (NOT a string), so the metadata
 * injector can format it properly for the prompt.
 */

import {
  getClinicalGuidelines,
  getNutritionFacts,
  getNutritionByTags,
  getRecipesCatalog,
} from '../knowledge/knowledgeBase.js';
import { getLocalSeedData } from '../knowledge/seedData.js';
import { isFirebaseInitialized } from '../../config/firebase.js';

/**
 * Build enriched context for an AI prompt.
 *
 * @param {object} params
 * @param {string} params.userId          - Authenticated user ID
 * @param {string} params.type            - 'diet' | 'recipe' | 'chat' | 'lab'
 * @param {object} [params.profile]       - Normalized user profile
 * @param {string[]} [params.conditionIds] - Normalized condition IDs
 * @param {string[]} [params.ingredients]  - Ingredient list (for recipe context)
 * @param {string} [params.goal]          - User goal (Weight Loss, Weight Gain, Maintain)
 * @param {number} [params.calories]      - Daily calorie target
 * @returns {Promise<{ guidelines: Array, nutrition: Array, recipes: Array, sources: Array }>}
 */
export async function buildContext({
  userId,
  type,
  profile = {},
  conditionIds = [],
  ingredients = [],
  goal = '',
  calories = 2000,
}) {
  const context = {
    guidelines: [],
    nutrition: [],
    recipes: [],
    sources: [],
  };

  try {
    // ── Use Firestore if available, otherwise fall back to local data ──
    if (isFirebaseInitialized) {
      await _buildFromFirestore(context, { type, conditionIds, ingredients, goal, calories });
    } else {
      _buildFromLocalData(context, { type, conditionIds, ingredients, goal, calories });
    }
  } catch (err) {
    console.warn('[contextBuilder] Error building context — proceeding without:', err.message);
  }

  return context;
}

// ═════════════════════════════════════════════════════════════════════════════
// FIRESTORE-BACKED CONTEXT BUILDING
// ═════════════════════════════════════════════════════════════════════════════

async function _buildFromFirestore(context, { type, conditionIds, ingredients, goal, calories }) {
  // 1. Clinical guidelines (for diet, recipe, lab, chat when conditions exist)
  if (conditionIds.length > 0) {
    const guidelines = await getClinicalGuidelines(conditionIds);
    context.guidelines = guidelines.map((g) => ({
      conditionId: g.conditionId,
      conditionName: g.conditionName,
      avoid: g.avoid || [],
      limit: g.limit || [],
      recommend: g.recommend || [],
      portionGuidance: g.portionGuidance || '',
      mealTiming: g.mealTiming || '',
      source: g.source,
      version: g.version,
    }));

    // Track sources
    guidelines.forEach((g) => {
      context.sources.push({
        id: g.conditionId,
        type: 'clinical_guideline',
        source: g.source,
        version: g.version,
        title: g.conditionName,
      });
    });
  }

  // 2. Nutrition facts (for diet and recipe)
  if (type === 'diet' || type === 'recipe') {
    let nutritionDocs = [];

    if (ingredients.length > 0) {
      // Map common names to ingredient IDs
      const ids = ingredients.map((i) => i.toLowerCase().replace(/\s+/g, '_'));
      nutritionDocs = await getNutritionFacts(ids);
    }

    // Also fetch by diet tags based on goal
    if (nutritionDocs.length < 3) {
      const goalTags = _goalToDietTags(goal);
      if (goalTags.length > 0) {
        const tagResults = await getNutritionByTags(goalTags, 5);
        const existingIds = new Set(nutritionDocs.map((n) => n.ingredientId));
        tagResults.forEach((r) => {
          if (!existingIds.has(r.ingredientId)) nutritionDocs.push(r);
        });
      }
    }

    context.nutrition = nutritionDocs.map((n) => ({
      ingredientId: n.ingredientId,
      name: n.name,
      servingSize: n.servingSize,
      nutrients: n.nutrients,
      dietTags: n.dietTags || [],
      source: n.source,
    }));

    nutritionDocs.forEach((n) => {
      context.sources.push({
        id: n.ingredientId,
        type: 'nutrition_fact',
        source: n.source,
        version: n.version,
        title: n.name,
      });
    });
  }

  // 3. Recipes catalog (for recipe and diet)
  if (type === 'recipe' || type === 'diet') {
    const recipes = await getRecipesCatalog({
      conditionIds,
      dietTags: ['halal'],
      maxCalories: Math.round(calories * 0.4),
      limit: 3,
    });

    context.recipes = recipes.map((r) => ({
      recipeId: r.recipeId,
      name: r.name,
      calories: r.calories,
      ingredients: r.ingredients,
      safeForConditions: r.safeForConditions,
      healthNote: r.healthNote,
      source: r.source,
    }));

    recipes.forEach((r) => {
      context.sources.push({
        id: r.recipeId,
        type: 'recipe_catalog',
        source: r.source,
        version: r.version,
        title: r.name,
      });
    });
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// LOCAL FALLBACK (DEV MODE)
// ═════════════════════════════════════════════════════════════════════════════

function _buildFromLocalData(context, { type, conditionIds, ingredients, goal, calories }) {
  const { nutritionFacts, clinicalGuidelines, recipesCatalog } = getLocalSeedData();

  // 1. Clinical guidelines
  if (conditionIds.length > 0) {
    const matched = clinicalGuidelines.filter((g) => conditionIds.includes(g.conditionId));
    context.guidelines = matched.map((g) => ({
      conditionId: g.conditionId,
      conditionName: g.conditionName,
      avoid: g.avoid || [],
      limit: g.limit || [],
      recommend: g.recommend || [],
      portionGuidance: g.portionGuidance || '',
      mealTiming: g.mealTiming || '',
      source: g.source,
      version: g.version,
    }));

    matched.forEach((g) => {
      context.sources.push({
        id: g.conditionId, type: 'clinical_guideline',
        source: g.source, version: g.version, title: g.conditionName,
      });
    });
  }

  // 2. Nutrition facts
  if (type === 'diet' || type === 'recipe') {
    const ids = ingredients.map((i) => i.toLowerCase().replace(/\s+/g, '_'));
    let matched = nutritionFacts.filter((n) => ids.includes(n.ingredientId));

    // Supplement with goal-relevant foods
    if (matched.length < 3) {
      const goalTags = _goalToDietTags(goal);
      const existingIds = new Set(matched.map((n) => n.ingredientId));
      const extra = nutritionFacts.filter(
        (n) => !existingIds.has(n.ingredientId) && goalTags.some((t) => (n.dietTags || []).includes(t))
      ).slice(0, 5 - matched.length);
      matched = [...matched, ...extra];
    }

    context.nutrition = matched.map((n) => ({
      ingredientId: n.ingredientId, name: n.name, servingSize: n.servingSize,
      nutrients: n.nutrients, dietTags: n.dietTags || [], source: n.source,
    }));

    matched.forEach((n) => {
      context.sources.push({
        id: n.ingredientId, type: 'nutrition_fact',
        source: n.source, version: n.version, title: n.name,
      });
    });
  }

  // 3. Recipes
  if (type === 'recipe' || type === 'diet') {
    let matched = recipesCatalog;
    if (conditionIds.length > 0) {
      matched = matched.filter((r) =>
        conditionIds.some((c) => (r.safeForConditions || []).includes(c))
      );
    }
    if (calories) {
      matched = matched.filter((r) => (r.calories || 0) <= calories * 0.4);
    }
    matched = matched.slice(0, 3);

    context.recipes = matched.map((r) => ({
      recipeId: r.recipeId, name: r.name, calories: r.calories,
      ingredients: r.ingredients, safeForConditions: r.safeForConditions,
      healthNote: r.healthNote, source: r.source,
    }));

    matched.forEach((r) => {
      context.sources.push({
        id: r.recipeId, type: 'recipe_catalog',
        source: r.source, version: r.version, title: r.name,
      });
    });
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function _goalToDietTags(goal) {
  const map = {
    'Weight Loss': ['low_fat', 'low_calorie', 'high_fiber', 'high_protein'],
    'Weight Gain': ['high_protein', 'whole_grain'],
    'Maintain': ['high_fiber', 'budget_friendly'],
  };
  return map[goal] || ['halal'];
}

export default { buildContext };
