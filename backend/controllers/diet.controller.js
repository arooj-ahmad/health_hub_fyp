/**
 * Diet Controller
 * ─────────────────────────────────────────────────────────────────────────────
 * Orchestrates diet plan generation:
 *   Request → Validate → (RAG hooks) → Build prompt → AI Service → Format → Respond
 *
 * Ported from: src/modules/diet/services/dietAIService.js
 */

import { generateAIResponse } from '../services/ai/aiService.js';
import { buildContext } from '../services/rag/contextBuilder.js';
import { retrieve } from '../services/rag/retrievalLayer.js';
import { injectMetadata } from '../services/rag/metadataInjector.js';
import { sanitizeInput, cleanAIJSON } from '../utils/promptSanitizer.js';
import { success, error, send } from '../utils/responseFormatter.js';

// ── Meal slot configuration (ported from frontend) ──────────────────────────

const MEAL_SLOTS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'snack', label: 'Snack' },
  { key: 'dinner', label: 'Dinner' },
];

function distributeMealCalories(totalCalories) {
  return {
    breakfast: Math.round(totalCalories * 0.25),
    lunch: Math.round(totalCalories * 0.30),
    snack: Math.round(totalCalories * 0.15),
    dinner: Math.round(totalCalories * 0.30),
  };
}

function calcDailyMacros(calories, goal) {
  const ratios = {
    'Weight Loss': { protein: 0.30, carbs: 0.40, fat: 0.30 },
    'Weight Gain': { protein: 0.25, carbs: 0.50, fat: 0.25 },
    'Maintain': { protein: 0.25, carbs: 0.50, fat: 0.25 },
  };

  const r = ratios[goal] || ratios['Maintain'];
  return {
    protein: Math.round((calories * r.protein) / 4),
    carbs: Math.round((calories * r.carbs) / 4),
    fat: Math.round((calories * r.fat) / 9),
  };
}

// ── Prompt builder (ported from frontend dietAIService.js) ──────────────────

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
    ? conditionAdaptations.map((a) => `• ${a.label}: ${a.rules.join('; ')}`).join('\n')
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

// ── Response normalizers ────────────────────────────────────────────────────

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

  return {
    slot: meal?.slot || fallbackSlot,
    name: meal?.name || 'Balanced meal',
    items,
    calories: Number(meal?.calories) || items.reduce((sum, i) => sum + i.calories, 0),
    protein: Number(meal?.protein) || items.reduce((sum, i) => sum + i.protein, 0),
    carbs: Number(meal?.carbs) || items.reduce((sum, i) => sum + i.carbs, 0),
    fat: Number(meal?.fat) || items.reduce((sum, i) => sum + i.fat, 0),
  };
}

function normaliseDailyPlan(dayPlan = {}, expectedDay) {
  const normalisedMeals = MEAL_SLOTS.map((slot) => {
    const matched = Array.isArray(dayPlan?.meals)
      ? dayPlan.meals.find((m) => m?.slot === slot.key)
      : null;
    return normaliseMeal(matched, slot.key);
  });

  return {
    day: Number(dayPlan?.day) || expectedDay,
    meals: normalisedMeals,
    totalCalories: Number(dayPlan?.totalCalories) || normalisedMeals.reduce((s, m) => s + m.calories, 0),
    totalProtein: Number(dayPlan?.totalProtein) || normalisedMeals.reduce((s, m) => s + m.protein, 0),
    totalCarbs: Number(dayPlan?.totalCarbs) || normalisedMeals.reduce((s, m) => s + m.carbs, 0),
    totalFat: Number(dayPlan?.totalFat) || normalisedMeals.reduce((s, m) => s + m.fat, 0),
  };
}

// ── Controller ──────────────────────────────────────────────────────────────

export async function generateDietPlan(req, res) {
  try {
    const {
      profile, computed, selectedGoal,
      durationDays, conditions, allergies,
      conditionAdaptations = [], exclusionList = [],
    } = req.body;

    // ── Validate required fields ──
    if (!profile || !computed || !durationDays) {
      return send(res, error('Missing required fields: profile, computed, durationDays', 400));
    }

    const userId = req.user?.uid || 'anonymous';
    const goal = selectedGoal || computed.goal || 'Maintain';
    const calories = computed.cal || 2000;
    const dailyMacros = calcDailyMacros(calories, goal);
    const mealCalories = distributeMealCalories(calories);

    // ── RAG Pipeline (placeholders) ──
    const context = await buildContext({ userId, type: 'diet' });
    const retrievedDocs = await retrieve({ query: `${goal} diet plan`, type: 'diet' });

    const promptContext = {
      age: profile.age, gender: profile.gender,
      height: profile.height, weight: profile.weight,
      bmi: computed.bmi, bmiCategory: computed.cat,
      goal, targetWeight: computed.tw,
      dailyCalories: calories,
      activityLevel: profile.activityLevel,
      conditions: sanitizeInput(conditions || ''),
      allergies: sanitizeInput(allergies || ''),
      exclusionList, conditionAdaptations,
      durationDays, dailyMacros, mealCalories,
    };

    // ── Generate day-by-day ──
    const dailyPlans = [];

    for (let day = 1; day <= durationDays; day++) {
      const rawPrompt = buildDietDayPrompt({ ...promptContext, dayNumber: day });
      const prompt = injectMetadata({ prompt: rawPrompt, context, retrievedDocs });

      const aiResponse = await generateAIResponse({ prompt, type: 'diet', userId });

      if (!aiResponse?.success) {
        console.warn(`[diet] AI skipped for day ${day}:`, aiResponse?.error);
        continue;
      }

      const cleaned = cleanAIJSON(aiResponse.content);
      if (!cleaned) continue;

      try {
        const parsed = JSON.parse(cleaned);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          dailyPlans.push(normaliseDailyPlan(parsed, day));
        }
      } catch (parseErr) {
        console.warn(`[diet] JSON parse failed for day ${day}:`, parseErr.message);
      }
    }

    if (dailyPlans.length === 0) {
      return send(res, success({
        dailyPlans: [],
        explanation: 'AI service temporarily unavailable. Please try again later.',
        tips: ['Please refresh and try again.'],
        disclaimer: 'This diet plan is for informational purposes only and does not replace professional medical advice.',
      }));
    }

    dailyPlans.sort((a, b) => a.day - b.day);

    // ── Build explanation and tips ──
    const explanation = `This ${durationDays}-day plan is aligned with your ${goal.toLowerCase()} goal, ${computed.cat} BMI category, and daily target of ${calories} kcal. Each day keeps the meal structure consistent so the plan is easier to follow.`;

    const tips = [
      `Follow portion sizes closely to stay on track with your ${goal.toLowerCase()} target.`,
      'Drink water regularly throughout the day and avoid sugary drinks.',
      'Prepare meals in advance where possible.',
    ];
    if (allergies) tips.push(`Double-check ingredients to avoid these allergens: ${allergies}.`);
    if (conditions) tips.push(`Monitor how meals affect your health conditions: ${conditions}.`);

    // ── Firestore save placeholder ──
    // await firestoreService.saveDietPlan(userId, { dailyPlans, explanation, tips, ... });

    return send(res, success({
      dailyPlans,
      explanation,
      tips: tips.slice(0, 4),
      disclaimer: 'This diet plan is for informational purposes only and does not replace professional medical advice.',
    }));
  } catch (err) {
    console.error('[diet] Unhandled error:', err);
    return send(res, error('Failed to generate diet plan. Please try again later.'));
  }
}
