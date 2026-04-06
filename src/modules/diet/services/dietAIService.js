/**
 * dietAIService.js — Groq/AI-powered structured diet plan generation
 *
 * Builds a detailed prompt with all user data, system-calculated values,
 * health-condition adaptations, and exclusion lists, then asks the AI
 * to return a **structured JSON** plan (not markdown).
 *
 * The JSON schema returned for each day:
 * {
 *   dailyPlans: [
 *     {
 *       day: 1,
 *       meals: [
 *         { slot, name, items: [{ food, quantity, calories, protein, carbs, fat }], calories, protein, carbs, fat }
 *       ],
 *       totalCalories, totalProtein, totalCarbs, totalFat
 *     }
 *   ],
 *   explanation: "...",
 *   tips: ["..."],
 *   disclaimer: "..."
 * }
 */

import { generateAIResponse } from '@/services/aiService';
import { createDietPlan, getUserDietPlans } from '@/services/firestoreService';
import { MEAL_SLOTS, distributeMealCalories } from '../utils/mealHelpers';
import { calcDailyMacros } from '../utils/portionCalculator';
import { Timestamp } from 'firebase/firestore';

// ── Prompt Builder ───────────────────────────────────────────────────────────

function buildDietDayPrompt({
  age, gender, height, weight,
  bmi, bmiCategory, goal, targetWeight,
  dailyCalories, activityLevel,
  conditions, allergies,
  exclusionList, conditionAdaptations,
  durationDays, dailyMacros, mealCalories,
  dayNumber,
}) {
  const condRulesText = conditionAdaptations.length > 0
    ? conditionAdaptations.map((adaptation) => `• ${adaptation.label}: ${adaptation.rules.join('; ')}`).join('\n')
    : 'None';

  const exclusionText = exclusionList.length > 0
    ? exclusionList.join(', ')
    : 'None';

  const mealSlotText = MEAL_SLOTS
    .map((slot) => `${slot.key} (${slot.label}): ~${mealCalories[slot.key]} kcal`)
    .join('\n');

  return `You are an advanced AI Diet Planning Assistant for SmartNutrition Pakistan.

Generate a diet plan for Day ${dayNumber} of ${durationDays}.

SYSTEM-CALCULATED VALUES (do NOT recalculate or change):
  BMI: ${bmi}
  BMI Category: ${bmiCategory}
  Goal: ${goal}
  Target Weight: ${targetWeight ? targetWeight + ' kg' : 'Already healthy'}
  Daily Calorie Target: ${dailyCalories} kcal
  Daily Macros: Protein ${dailyMacros.protein}g | Carbs ${dailyMacros.carbs}g | Fat ${dailyMacros.fat}g

USER PROFILE:
  Age: ${age} | Gender: ${gender}
  Height: ${height} cm | Weight: ${weight} kg
  Activity Level: ${activityLevel}
  Health Conditions: ${conditions || 'None'}
  Allergies: ${allergies || 'None'}

CONDITION-SPECIFIC RULES:
${condRulesText}

EXCLUDED FOODS (never include):
${exclusionText}

MEAL STRUCTURE (4 meals/day):
${mealSlotText}

IMPORTANT RULES:
1. ALL food must be 100% HALAL — no pork, alcohol, or non-halal items.
2. Use common PAKISTANI foods: roti, daal, rice, sabzi, chicken, yogurt, etc.
3. Meals must be affordable and practical for Pakistani households.
4. Respect ALL allergies — zero tolerance.
5. Adjust for medical conditions as per the rules above.
6. Control oil, sugar, salt per health needs.
7. Keep each meal's calories close to the assigned target above.
8. Use simple English with Pakistani food names in parentheses.
9. Make Day ${dayNumber} distinct from other days while staying within the same calorie target.

Return ONLY valid JSON in this exact format:

{
  "day": ${dayNumber},
  "meals": [
    {
      "slot": "breakfast",
      "name": "Meal Name",
      "items": [
        { "food": "Food name", "quantity": "1 cup / 2 roti / 100g", "calories": 200, "protein": 10, "carbs": 25, "fat": 5 }
      ],
      "calories": 450,
      "protein": 20,
      "carbs": 50,
      "fat": 15
    }
  ],
  "totalCalories": 1800,
  "totalProtein": 90,
  "totalCarbs": 200,
  "totalFat": 60
}

The response MUST start with { and end with }.
Do NOT include markdown code blocks.
Do NOT include explanation text before or after the JSON.
Include all 4 meal slots: breakfast, lunch, snack, dinner.
If any meal detail is uncertain, still return valid JSON with placeholder-safe values.`;
}

// ── Parse + Sanitise AI Response ─────────────────────────────────────────────

/**
 * Clean AI response to extract valid JSON
 * Handles:
 * - Markdown code blocks (```json ... ```)
 * - Extra whitespace and newlines
 * - Text before/after JSON
 * - Escaped quotes and special characters
 */
function cleanAIJSON(text = '') {
  if (!text) return '';

  // Convert to string
  let cleaned = String(text).trim();

  // Remove markdown code blocks
  cleaned = cleaned.replace(/```json\s*/gi, '');
  cleaned = cleaned.replace(/```\s*/gi, '');

  // Find the first { and last } to extract JSON
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || firstBrace > lastBrace) {
    return '';
  }

  // Extract only the JSON portion
  cleaned = cleaned.substring(firstBrace, lastBrace + 1);

  // Handle common issues with newlines breaking strings
  // Be careful not to break valid escaped newlines in JSON strings
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

function normaliseMeal(meal = {}, fallbackSlot = 'meal') {
  const items = Array.isArray(meal.items)
    ? meal.items.map((item) => ({
      food: item?.food || 'TBD',
      quantity: item?.quantity || 'As advised',
      calories: Number(item?.calories) || 0,
      protein: Number(item?.protein) || 0,
      carbs: Number(item?.carbs) || 0,
      fat: Number(item?.fat) || 0,
    }))
    : [];

  const mealCalories = Number(meal?.calories) || items.reduce((sum, item) => sum + (item.calories || 0), 0);
  const mealProtein = Number(meal?.protein) || items.reduce((sum, item) => sum + (item.protein || 0), 0);
  const mealCarbs = Number(meal?.carbs) || items.reduce((sum, item) => sum + (item.carbs || 0), 0);
  const mealFat = Number(meal?.fat) || items.reduce((sum, item) => sum + (item.fat || 0), 0);

  return {
    slot: meal?.slot || fallbackSlot,
    name: meal?.name || 'Balanced meal',
    items,
    calories: mealCalories,
    protein: mealProtein,
    carbs: mealCarbs,
    fat: mealFat,
  };
}

function normaliseDailyPlan(dayPlan = {}, expectedDay) {
  const normalisedMeals = MEAL_SLOTS.map((slot) => {
    const matchedMeal = Array.isArray(dayPlan?.meals)
      ? dayPlan.meals.find((meal) => meal?.slot === slot.key)
      : null;
    return normaliseMeal(matchedMeal, slot.key);
  });

  return {
    day: Number(dayPlan?.day) || expectedDay,
    meals: normalisedMeals,
    totalCalories: Number(dayPlan?.totalCalories) || normalisedMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0),
    totalProtein: Number(dayPlan?.totalProtein) || normalisedMeals.reduce((sum, meal) => sum + (meal.protein || 0), 0),
    totalCarbs: Number(dayPlan?.totalCarbs) || normalisedMeals.reduce((sum, meal) => sum + (meal.carbs || 0), 0),
    totalFat: Number(dayPlan?.totalFat) || normalisedMeals.reduce((sum, meal) => sum + (meal.fat || 0), 0),
  };
}

function parseDailyPlanResponse(raw, expectedDay) {
  const cleaned = cleanAIJSON(raw);

  if (!cleaned) {
    console.warn('[dietAIService] AI day response could not be cleaned for day', expectedDay);
    return null;
  }

  try {
    const parsed = JSON.parse(cleaned);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      console.warn('[dietAIService] AI day response was not an object for day', expectedDay);
      return null;
    }

    return normaliseDailyPlan(parsed, expectedDay);
  } catch (error) {
    console.warn('[dietAIService] AI day parsing failed for day', expectedDay, error);
    return null;
  }
}

function buildPlanExplanation({ goal, bmiCategory, durationDays, calories, conditions }) {
  const base = `This ${durationDays}-day plan is aligned with your ${goal.toLowerCase()} goal, ${bmiCategory} BMI category, and daily target of ${calories} kcal.`;
  const conditionNote = conditions && conditions !== 'None'
    ? ` It also accounts for your reported health conditions: ${conditions}.`
    : '';

  return `${base}${conditionNote} Each day keeps the meal structure consistent so the plan is easier to follow and safer to sustain.`;
}

function buildPlanTips({ goal, allergies, conditions }) {
  const tips = [
    `Follow portion sizes closely to stay on track with your ${goal.toLowerCase()} target.`,
    'Drink water regularly throughout the day and avoid sugary drinks.',
    'Prepare meals in advance where possible so the full plan stays practical during the week.',
  ];

  if (allergies && allergies !== 'None') {
    tips.push(`Double-check ingredients to avoid these allergens: ${allergies}.`);
  }

  if (conditions && conditions !== 'None') {
    tips.push(`Monitor how meals affect your health conditions and adjust with your clinician if needed: ${conditions}.`);
  }

  return tips.slice(0, 4);
}

// ── Main Generation Function ─────────────────────────────────────────────────

/**
 * Generate a structured diet plan via AI.
 *
 * @param {object} params
 * @param {object} params.profile - { age, gender, height, weight, activityLevel }
 * @param {object} params.computed - { bmi, cat, goal, tw, cal }
 * @param {string} params.selectedGoal - user's chosen goal (may differ from auto)
 * @param {number} params.durationDays
 * @param {string} params.conditions
 * @param {string} params.allergies
 * @param {Array} params.conditionAdaptations
 * @param {Array} params.exclusionList
 * @returns {Promise<object>} parsed plan object
 */
export async function generateDietPlan({
  profile,
  computed,
  selectedGoal,
  durationDays,
  conditions,
  allergies,
  conditionAdaptations,
  exclusionList,
}) {
  const goal = selectedGoal || computed.goal;
  const calories = computed.cal;
  const dailyMacros = calcDailyMacros(calories, goal);
  const mealCalories = distributeMealCalories(calories);

  const promptContext = {
    age: profile.age || computed.a,
    gender: profile.gender || computed.g,
    height: profile.height || computed.h,
    weight: profile.weight || computed.w,
    bmi: computed.bmi,
    bmiCategory: computed.cat,
    goal,
    targetWeight: computed.tw,
    dailyCalories: calories,
    activityLevel: profile.activityLevel || computed.act,
    conditions,
    allergies,
    exclusionList,
    conditionAdaptations,
    durationDays,
    dailyMacros,
    mealCalories,
  };

  try {
    const dailyPlans = [];

    for (let day = 1; day <= durationDays; day += 1) {
      const prompt = buildDietDayPrompt({
        ...promptContext,
        dayNumber: day,
      });

      const aiResponse = await generateAIResponse(prompt);

      if (!aiResponse?.success) {
        console.warn('[dietAIService] AI diet plan generation skipped for day', day, aiResponse?.error);
        continue;
      }

      const parsedDay = parseDailyPlanResponse(aiResponse.content, day);

      if (!parsedDay) {
        continue;
      }

      dailyPlans.push(parsedDay);
    }

    if (dailyPlans.length === 0) {
      return {
        success: false,
        dailyPlans: [],
        explanation: 'AI service temporarily unavailable. Please try again later.',
        tips: ['Please refresh and try again.'],
        disclaimer: 'This diet plan is for informational purposes only and does not replace professional medical advice.',
      };
    }

    dailyPlans.sort((left, right) => left.day - right.day);

    return {
      success: true,
      dailyPlans,
      explanation: buildPlanExplanation({
        goal,
        bmiCategory: computed.cat,
        durationDays,
        calories,
        conditions,
      }),
      tips: buildPlanTips({
        goal,
        allergies,
        conditions,
      }),
      disclaimer: 'This diet plan is for informational purposes only and does not replace professional medical advice.',
    };
  } catch (error) {
    console.warn('AI diet plan generation error:', error.message);
    return {
      success: false,
      dailyPlans: [],
      explanation: 'Failed to generate diet plan. Please try again later.',
      tips: ['Please refresh and try again.'],
      disclaimer: 'This diet plan is for informational purposes only and does not replace professional medical advice.',
    };
  }
}

// ── Firestore Save ───────────────────────────────────────────────────────────

/**
 * Persist a generated diet plan to Firestore.
 */

export async function saveDietPlan(userId, {
  planResult,
  computed,
  selectedGoal,
  durationDays,
  conditions,
  allergies,
  profile,
}) {
  if (!userId) {
    console.error('[dietAIService] userId is required for saving');
    throw new Error('userId is required');
  }
  if (!planResult?.dailyPlans) {
    console.error('[dietAIService] planResult.dailyPlans is required for saving');
    throw new Error('Daily plans are required');
  }

  const goal = selectedGoal || computed.goal;

  const dietPlanData = {
    name: `${goal} Plan – ${computed.cat} (${durationDays}d)`,
    goal,
    duration: `${durationDays} day${durationDays > 1 ? 's' : ''}`,
    targetCalories: computed.cal,
    startDate: Timestamp.now(),
    endDate: Timestamp.fromDate(new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)),
    status: 'active',
    currentWeight: parseFloat(profile.weight || computed.w),
    targetWeight: computed.tw || parseFloat(profile.weight || computed.w),
    bmi: computed.bmi,
    bmiCategory: computed.cat,
    activityLevel: profile.activityLevel || computed.act,
    healthConditions: conditions,
    allergies,
    // Store structured data
    dailyPlans: planResult.dailyPlans,
    explanation: planResult.explanation,
    tips: planResult.tips,
    disclaimer: planResult.disclaimer,
    // Keep this as structured JSON so clients can reliably read aiGeneratedPlan.dailyPlans
    aiGeneratedPlan: {
      dailyPlans: planResult.dailyPlans || [],
      explanation: planResult.explanation || '',
      tips: planResult.tips || [],
      disclaimer: planResult.disclaimer || 'This diet plan is for informational purposes only and does not replace professional medical advice.',
    },
    description: planResult.explanation
      ? planResult.explanation.substring(0, 200) + '...'
      : `${goal} plan for ${durationDays} days`,
    meals: [],
    durationDays,
    goalType: selectedGoal ? 'manual' : 'auto',
  };

  console.log('[dietAIService] Saving diet plan - userId:', userId, 'goal:', goal, 'days:', durationDays, 'dailyPlans:', planResult.dailyPlans.length);

  try {
    const docRef = await createDietPlan(userId, dietPlanData);
    console.log('[dietAIService] Successfully saved diet plan to dietPlans - docId:', docRef.id);
    return docRef;
  } catch (err) {
    console.error('[dietAIService] Failed to save diet plan:', err.message);
    throw err;
  }
}

/**
 * Fetch user's diet plans (re-exported for convenience).
 */
export { getUserDietPlans } from '@/services/firestoreService';
