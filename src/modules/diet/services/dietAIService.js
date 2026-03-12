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
import { MEAL_SLOTS, CALORIE_SPLIT, distributeMealCalories } from '../utils/mealHelpers';
import { calcDailyMacros } from '../utils/portionCalculator';
import { Timestamp } from 'firebase/firestore';

// ── Prompt Builder ───────────────────────────────────────────────────────────

function buildDietPrompt({
  age, gender, height, weight,
  bmi, bmiCategory, goal, targetWeight,
  dailyCalories, activityLevel,
  conditions, allergies,
  exclusionList, conditionAdaptations,
  durationDays, dailyMacros, mealCalories,
}) {
  const condRulesText = conditionAdaptations.length > 0
    ? conditionAdaptations.map(a => `• ${a.label}: ${a.rules.join('; ')}`).join('\n')
    : 'None';

  const exclusionText = exclusionList.length > 0
    ? exclusionList.join(', ')
    : 'None';

  const mealSlotText = MEAL_SLOTS
    .map(s => `${s.key} (${s.label}): ~${mealCalories[s.key]} kcal`)
    .join('\n');

  return `You are an advanced AI Diet Planning Assistant for SmartNutrition Pakistan.

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
9. Duration: ${durationDays} day(s). Generate a unique plan for EACH day.

RESPOND WITH VALID JSON ONLY — no markdown, no extra text. Use this exact schema:

{
  "dailyPlans": [
    {
      "day": 1,
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
  ],
  "explanation": "Short explanation of how this plan helps the user move from current weight to target weight, why it suits the BMI category, and any precautions.",
  "tips": ["Tip 1", "Tip 2", "Tip 3"],
  "disclaimer": "This diet plan is for informational purposes only and does not replace professional medical advice."
}

Generate for ALL ${durationDays} day(s). Each day should have all 4 meal slots: breakfast, lunch, snack, dinner.`;
}

// ── Parse + Sanitise AI Response ─────────────────────────────────────────────

function parseAIResponse(raw) {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');
  }

  try {
    const parsed = JSON.parse(cleaned);

    // Ensure dailyPlans exists
    if (!parsed.dailyPlans || !Array.isArray(parsed.dailyPlans)) {
      throw new Error('Missing dailyPlans array');
    }

    // Ensure each day has 4 meal slots
    for (const dp of parsed.dailyPlans) {
      if (!dp.meals || !Array.isArray(dp.meals)) {
        dp.meals = [];
      }
      // Calculate totals if missing
      if (!dp.totalCalories) {
        dp.totalCalories = dp.meals.reduce((s, m) => s + (m.calories || 0), 0);
      }
      if (!dp.totalProtein) {
        dp.totalProtein = dp.meals.reduce((s, m) => s + (m.protein || 0), 0);
      }
      if (!dp.totalCarbs) {
        dp.totalCarbs = dp.meals.reduce((s, m) => s + (m.carbs || 0), 0);
      }
      if (!dp.totalFat) {
        dp.totalFat = dp.meals.reduce((s, m) => s + (m.fat || 0), 0);
      }
    }

    return {
      dailyPlans: parsed.dailyPlans,
      explanation: parsed.explanation || '',
      tips: parsed.tips || [],
      disclaimer: parsed.disclaimer || 'This diet plan is for informational purposes only and does not replace professional medical advice.',
    };
  } catch (err) {
    console.error('Failed to parse AI diet response as JSON:', err);
    // Fallback: store raw text
    return {
      dailyPlans: [],
      explanation: '',
      tips: [],
      disclaimer: 'This diet plan is for informational purposes only and does not replace professional medical advice.',
      rawText: raw,
    };
  }
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

  const prompt = buildDietPrompt({
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
  });

  const rawResponse = await generateAIResponse(prompt);
  return parseAIResponse(rawResponse);
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
    // Legacy field for backward compat with DietPlanDetail
    aiGeneratedPlan: planResult.rawText || JSON.stringify(planResult.dailyPlans, null, 2),
    description: planResult.explanation
      ? planResult.explanation.substring(0, 200) + '...'
      : `${goal} plan for ${durationDays} days`,
    meals: [],
    durationDays,
    goalType: selectedGoal ? 'manual' : 'auto',
  };

  return await createDietPlan(userId, dietPlanData);
}

/**
 * Fetch user's diet plans (re-exported for convenience).
 */
export { getUserDietPlans } from '@/services/firestoreService';
