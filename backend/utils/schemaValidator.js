/**
 * Schema Validator
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates AI responses BEFORE sending to the frontend.
 *
 * Purpose:
 *   - Prevent malformed AI output from crashing the frontend
 *   - Enforce type contracts on every response field
 *   - Attempt safe repair when possible (re-parse, type coercion)
 *   - Log validation failures for quality monitoring
 *
 * Each type (diet, recipe, chat, lab) has its own validation schema.
 * Validators return { valid, data, errors } where:
 *   - valid: boolean — did it pass?
 *   - data:  object  — the validated (possibly repaired) data
 *   - errors: string[] — list of validation issues
 */

// ═════════════════════════════════════════════════════════════════════════════
// DIET SCHEMA
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Validate a single daily plan object from AI.
 */
function validateDailyPlan(plan, dayIndex) {
  const errors = [];
  const prefix = `Day ${plan?.day || dayIndex}`;

  if (!plan || typeof plan !== 'object') {
    return { valid: false, data: null, errors: [`${prefix}: Not an object`] };
  }

  // Ensure required numeric fields
  const day = Number(plan.day) || dayIndex;
  const totalCalories = Number(plan.totalCalories) || 0;
  const totalProtein = Number(plan.totalProtein) || 0;
  const totalCarbs = Number(plan.totalCarbs) || 0;
  const totalFat = Number(plan.totalFat) || 0;

  if (totalCalories <= 0) errors.push(`${prefix}: totalCalories is 0 or missing`);

  // Validate meals array
  const meals = Array.isArray(plan.meals) ? plan.meals : [];
  if (meals.length === 0) {
    errors.push(`${prefix}: No meals array`);
  }

  const validatedMeals = meals.map((meal, i) => {
    const slot = meal?.slot || `meal_${i}`;
    const mealErrors = [];

    if (!meal?.name) mealErrors.push(`${prefix}/${slot}: Missing name`);
    if (!Array.isArray(meal?.items) || meal.items.length === 0) {
      mealErrors.push(`${prefix}/${slot}: No items array`);
    }

    const items = Array.isArray(meal?.items) ? meal.items.map((item) => ({
      food: String(item?.food || 'TBD'),
      quantity: String(item?.quantity || 'As advised'),
      calories: Number(item?.calories) || 0,
      protein: Number(item?.protein) || 0,
      carbs: Number(item?.carbs) || 0,
      fat: Number(item?.fat) || 0,
    })) : [];

    errors.push(...mealErrors);

    return {
      slot: String(meal?.slot || slot),
      name: String(meal?.name || 'Balanced meal'),
      items,
      calories: Number(meal?.calories) || items.reduce((s, i) => s + i.calories, 0),
      protein: Number(meal?.protein) || items.reduce((s, i) => s + i.protein, 0),
      carbs: Number(meal?.carbs) || items.reduce((s, i) => s + i.carbs, 0),
      fat: Number(meal?.fat) || items.reduce((s, i) => s + i.fat, 0),
    };
  });

  return {
    valid: errors.length === 0,
    data: {
      day,
      meals: validatedMeals,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
    },
    errors,
  };
}

/**
 * Validate a full diet plan response.
 */
export function validateDietResponse(responseData) {
  const errors = [];

  if (!responseData || typeof responseData !== 'object') {
    return { valid: false, data: null, errors: ['Response is not an object'] };
  }

  const dailyPlans = Array.isArray(responseData.dailyPlans) ? responseData.dailyPlans : [];
  if (dailyPlans.length === 0) {
    errors.push('No daily plans in response');
  }

  const validatedPlans = [];
  for (let i = 0; i < dailyPlans.length; i++) {
    const result = validateDailyPlan(dailyPlans[i], i + 1);
    errors.push(...result.errors);
    if (result.data) validatedPlans.push(result.data);
  }

  // Validate sources array
  const sources = validateSources(responseData.sources);

  // Validate confidence score
  const confidence = validateConfidence(responseData.confidence);

  const data = {
    dailyPlans: validatedPlans,
    explanation: typeof responseData.explanation === 'string' ? responseData.explanation : '',
    tips: Array.isArray(responseData.tips) ? responseData.tips.filter((t) => typeof t === 'string') : [],
    disclaimer: typeof responseData.disclaimer === 'string'
      ? responseData.disclaimer
      : 'This diet plan is for informational purposes only and does not replace professional medical advice.',
    sources,
    confidence,
  };

  return {
    valid: validatedPlans.length > 0,
    data,
    errors,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// RECIPE SCHEMA
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Validate a single recipe object.
 */
function validateRecipe(recipe, index) {
  const errors = [];
  const prefix = `Recipe ${index + 1}`;

  if (!recipe || typeof recipe !== 'object') {
    return { valid: false, data: null, errors: [`${prefix}: Not an object`] };
  }

  if (!recipe.name) errors.push(`${prefix}: Missing name`);
  if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
    errors.push(`${prefix}: Missing or empty ingredients`);
  }
  if (!Array.isArray(recipe.instructions) || recipe.instructions.length === 0) {
    errors.push(`${prefix}: Missing or empty instructions`);
  }

  const data = {
    name: String(recipe.name || `Recipe ${index + 1}`),
    cookingTime: String(recipe.cookingTime || 'Not specified'),
    difficulty: String(recipe.difficulty || 'Medium'),
    servings: Number(recipe.servings) || 2,
    caloriesPerServing: Number(recipe.caloriesPerServing) || 0,
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.map((ing) => ({
      item: String(ing?.item || ing || 'Unknown'),
      quantity: String(ing?.quantity || 'As needed'),
    })) : [],
    instructions: Array.isArray(recipe.instructions)
      ? recipe.instructions.filter((s) => typeof s === 'string')
      : [],
    macronutrients: recipe.macronutrients && typeof recipe.macronutrients === 'object'
      ? {
          protein: String(recipe.macronutrients.protein || '0g'),
          carbohydrates: String(recipe.macronutrients.carbohydrates || '0g'),
          fats: String(recipe.macronutrients.fats || '0g'),
          fiber: String(recipe.macronutrients.fiber || '0g'),
        }
      : { protein: '0g', carbohydrates: '0g', fats: '0g', fiber: '0g' },
    healthNote: String(recipe.healthNote || ''),
  };

  return { valid: errors.length === 0, data, errors };
}

/**
 * Validate a full recipe generation response.
 */
export function validateRecipeResponse(responseData) {
  const errors = [];

  if (!responseData || typeof responseData !== 'object') {
    return { valid: false, data: null, errors: ['Response is not an object'] };
  }

  const recipes = Array.isArray(responseData.recipes) ? responseData.recipes : [];
  if (recipes.length === 0) {
    errors.push('No recipes in response');
  }

  const validatedRecipes = [];
  for (let i = 0; i < recipes.length; i++) {
    const result = validateRecipe(recipes[i], i);
    errors.push(...result.errors);
    if (result.data) validatedRecipes.push(result.data);
  }

  const data = {
    recipes: validatedRecipes,
    healthierAlternatives: Array.isArray(responseData.healthierAlternatives)
      ? responseData.healthierAlternatives.map((alt) => ({
          original: String(alt?.original || ''),
          healthier: String(alt?.healthier || ''),
          benefit: String(alt?.benefit || ''),
        }))
      : [],
    disclaimer: typeof responseData.disclaimer === 'string'
      ? responseData.disclaimer
      : 'This suggestion is for informational purposes only and does not replace professional medical advice.',
  };

  return {
    valid: validatedRecipes.length > 0,
    data,
    errors,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// CHAT SCHEMA
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Validate a chat response.
 */
export function validateChatResponse(responseData) {
  const errors = [];

  if (!responseData || typeof responseData !== 'object') {
    return { valid: false, data: null, errors: ['Response is not an object'] };
  }

  const content = responseData.content;

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    errors.push('Empty or missing content in chat response');
    return {
      valid: false,
      data: {
        content: "I apologize, but I'm having trouble processing your request right now. Please try again later.",
      },
      errors,
    };
  }

  return {
    valid: true,
    data: { content: content.trim() },
    errors,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// LAB SCHEMA
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Validate a lab analysis response.
 */
export function validateLabResponse(responseData) {
  const errors = [];

  if (!responseData || typeof responseData !== 'object') {
    return { valid: false, data: null, errors: ['Response is not an object'] };
  }

  const aiResponse = responseData.aiResponse;
  if (!aiResponse || typeof aiResponse !== 'string' || aiResponse.trim().length === 0) {
    errors.push('Empty or missing aiResponse in lab analysis');
  }

  const validRiskLevels = ['low', 'medium', 'high'];
  const riskLevel = validRiskLevels.includes(responseData.riskLevel)
    ? responseData.riskLevel
    : 'low';

  const data = {
    aiResponse: typeof aiResponse === 'string' ? aiResponse.trim() : 'Lab analysis could not be completed.',
    riskLevel,
    systemValues: responseData.systemValues && typeof responseData.systemValues === 'object'
      ? responseData.systemValues
      : {},
  };

  return {
    valid: errors.length === 0,
    data,
    errors,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// SOURCE & CONFIDENCE VALIDATORS (shared across schemas)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Validate a sources array.
 * Each source should have { id, title, source }. Extra fields are allowed.
 *
 * @param {any} sources - Raw sources data
 * @returns {Array<{ id: string, title: string, source: string }>}
 */
export function validateSources(sources) {
  if (!Array.isArray(sources)) return [];

  return sources
    .filter((s) => s && typeof s === 'object')
    .map((s) => ({
      id: String(s.id || ''),
      title: String(s.title || s.name || ''),
      source: String(s.source || ''),
      ...(s.section ? { section: String(s.section) } : {}),
      ...(s.version ? { version: String(s.version) } : {}),
      ...(s.type ? { type: String(s.type) } : {}),
    }))
    .filter((s) => s.id || s.title || s.source);
}

/**
 * Validate a confidence score (0.0 to 1.0).
 *
 * @param {any} confidence - Raw confidence value
 * @returns {number} Clamped [0, 1]
 */
export function validateConfidence(confidence) {
  const num = parseFloat(confidence);
  if (isNaN(num)) return 0.0;
  return Math.min(1.0, Math.max(0.0, num));
}

/**
 * Validate a generic RAG-aware response schema.
 * This is the standard output shape for knowledge-aware endpoints:
 *
 * {
 *   answer: string,
 *   recommendations: string[],
 *   nutritionSummary: { calories, protein, carbs, fat },
 *   sources: [{ id, title, source }],
 *   confidence: 0.0 - 1.0
 * }
 *
 * @param {object} responseData
 * @returns {{ valid: boolean, data: object, errors: string[] }}
 */
export function validateSourcedResponse(responseData) {
  const errors = [];

  if (!responseData || typeof responseData !== 'object') {
    return { valid: false, data: null, errors: ['Response is not an object'] };
  }

  const answer = typeof responseData.answer === 'string'
    ? responseData.answer.trim()
    : '';
  if (!answer) errors.push('Missing or empty answer');

  const recommendations = Array.isArray(responseData.recommendations)
    ? responseData.recommendations.filter((r) => typeof r === 'string' && r.trim())
    : [];

  const nutritionSummary = responseData.nutritionSummary && typeof responseData.nutritionSummary === 'object'
    ? {
        calories: Number(responseData.nutritionSummary.calories) || 0,
        protein: Number(responseData.nutritionSummary.protein) || 0,
        carbs: Number(responseData.nutritionSummary.carbs) || 0,
        fat: Number(responseData.nutritionSummary.fat) || 0,
        fiber: Number(responseData.nutritionSummary.fiber) || 0,
      }
    : null;

  const sources = validateSources(responseData.sources);
  const confidence = validateConfidence(responseData.confidence);

  const data = {
    answer: answer || 'Unable to generate a response. Please try again.',
    recommendations,
    ...(nutritionSummary ? { nutritionSummary } : {}),
    sources,
    confidence,
  };

  return {
    valid: errors.length === 0,
    data,
    errors,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// GENERIC VALIDATOR
// ═════════════════════════════════════════════════════════════════════════════

const VALIDATORS = {
  diet: validateDietResponse,
  recipe: validateRecipeResponse,
  chat: validateChatResponse,
  lab: validateLabResponse,
  sourced: validateSourcedResponse,
};

/**
 * Validate an AI response for a given type.
 *
 * @param {string} type - 'diet' | 'recipe' | 'chat' | 'lab' | 'sourced'
 * @param {object} responseData - The response data to validate
 * @returns {{ valid: boolean, data: object, errors: string[] }}
 */
export function validateResponse(type, responseData) {
  const validator = VALIDATORS[type];
  if (!validator) {
    console.warn(`[schemaValidator] No validator for type: ${type}`);
    return { valid: true, data: responseData, errors: [] };
  }

  const result = validator(responseData);

  if (!result.valid) {
    console.warn(`[schemaValidator] ${type} validation failed:`, result.errors);
  }

  return result;
}

export default {
  validateResponse,
  validateDietResponse,
  validateRecipeResponse,
  validateChatResponse,
  validateLabResponse,
  validateSourcedResponse,
  validateSources,
  validateConfidence,
};
