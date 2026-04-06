/**
 * Diet Controller — v3 (Knowledge-Aware)
 * ─────────────────────────────────────────────────────────────────────────────
 * Full RAG-ready pipeline:
 *   Normalize → Snapshot → Compute → contextBuilder(KB) → metadataInjector
 *   → Build Prompt (with context + source instructions) → AI Service
 *   → Schema Validate (with sources + confidence) → Async Log → Respond
 *
 * This is the REFERENCE IMPLEMENTATION for the knowledge-aware pattern.
 */

import { generateAIResponse } from '../services/ai/aiService.js';
import { buildContext } from '../services/rag/contextBuilder.js';
import { retrieve } from '../services/rag/retrievalLayer.js';
import { injectMetadata, formatSourcesForPrompt } from '../services/rag/metadataInjector.js';
import { cleanAIJSON } from '../utils/promptSanitizer.js';
import { success, error, send } from '../utils/responseFormatter.js';
import { validateDietResponse } from '../utils/schemaValidator.js';
import { logGeneration, createTimer } from '../services/logging/aiLogger.js';

// ── Meal slot configuration ────────────────────────────────────────────────

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

// ── Prompt Builder (context-aware) ──────────────────────────────────────────

function buildDietDayPrompt({
  age, gender, height, weight,
  bmi, bmiCategory, goal, targetWeight,
  dailyCalories, activityLevel,
  conditions, allergies,
  exclusionList, conditionAdaptations,
  durationDays, dailyMacros, mealCalories,
  dayNumber,
  sourceInstructions,
}) {
  const condRulesText = conditionAdaptations.length > 0
    ? conditionAdaptations.map((a) => `• ${a.label}: ${a.rules.join('; ')}`).join('\n')
    : 'None';
  const exclusionText = exclusionList.length > 0 ? exclusionList.join(', ') : 'None';
  const mealSlotText = MEAL_SLOTS
    .map((slot) => `${slot.key} (${slot.label}): ~${mealCalories[slot.key]} kcal`)
    .join('\n');

  return `You are an advanced AI Diet Planning Assistant for SmartNutrition Pakistan.
You MUST use the SYSTEM CONTEXT (KNOWLEDGE BASE) provided above when generating meals.
If clinical guidelines are provided, follow them strictly.
If nutrition reference data is provided, use accurate calorie/macro values from it.

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
5. Adjust for medical conditions as per the clinical guidelines above.
6. Control oil, sugar, salt per health needs.
7. Keep each meal's calories close to the assigned target above.
8. Use simple English with Pakistani food names in parentheses.
9. Make Day ${dayNumber} distinct from other days while staying within the same calorie target.
10. If CLINICAL GUIDELINES say to AVOID a food, NEVER include it.
11. If CLINICAL GUIDELINES RECOMMEND a food, prefer including it.

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
  "totalFat": 60,
  "sources": [
    { "id": "source_id", "title": "Source Name", "source": "ADA_2025" }
  ],
  "confidence": 0.85
}

The response MUST start with { and end with }.
Do NOT include markdown code blocks.
Do NOT include explanation text before or after the JSON.
Include all 4 meal slots: breakfast, lunch, snack, dinner.
${sourceInstructions}
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

// ═════════════════════════════════════════════════════════════════════════════
// CONTROLLER — Knowledge-Aware Pipeline
// ═════════════════════════════════════════════════════════════════════════════

export async function generateDietPlan(req, res) {
  const timer = createTimer();

  try {
    // ── 1. Read normalized input ──
    const n = req.normalizedBody;
    const rawInput = req.body;

    if (!n || !n.profile || !n.computed || !n.durationDays) {
      return send(res, error('Missing required fields: profile, computed, durationDays', 400));
    }

    const userId = req.user?.uid || 'anonymous';

    // ── 2. Compute system values ──
    const goal = n.selectedGoal;
    const calories = n.computed.cal;
    const dailyMacros = calcDailyMacros(calories, goal);
    const mealCalories = distributeMealCalories(calories);

    const systemComputed = {
      bmi: n.computed.bmi, bmiCategory: n.computed.cat,
      goal, targetWeight: n.computed.tw,
      dailyCalories: calories, dailyMacros, mealCalories,
    };

    // ── 3. Knowledge Base Context ──
    const context = await buildContext({
      userId,
      type: 'diet',
      profile: n.profile,
      conditionIds: n.conditionsArray || [],
      goal,
      calories,
    });

    // ── 4. Retrieval Layer (future vector search) ──
    const retrievedDocs = await retrieve({ query: `${goal} diet plan`, type: 'diet' });

    // ── 5. Metadata Injection ──
    const sourceInstructions = formatSourcesForPrompt(context.sources);

    const promptContext = {
      age: n.profile.age, gender: n.profile.gender,
      height: n.profile.height, weight: n.profile.weight,
      bmi: n.computed.bmi, bmiCategory: n.computed.cat,
      goal, targetWeight: n.computed.tw,
      dailyCalories: calories,
      activityLevel: n.profile.activityLevel,
      conditions: n.conditions,
      allergies: n.allergies,
      exclusionList: n.exclusionList,
      conditionAdaptations: n.conditionAdaptations,
      durationDays: n.durationDays,
      dailyMacros, mealCalories,
      sourceInstructions,
    };

    // ── 6. Generate day-by-day ──
    const dailyPlans = [];
    const aiSources = [];

    for (let day = 1; day <= n.durationDays; day++) {
      const rawPrompt = buildDietDayPrompt({ ...promptContext, dayNumber: day });

      // Inject knowledge context into prompt
      const { enrichedPrompt, sources } = injectMetadata({
        prompt: rawPrompt,
        context,
        retrievedDocs,
      });

      const aiResponse = await generateAIResponse({
        prompt: enrichedPrompt, type: 'diet', userId,
      });

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

          // Collect AI-reported sources
          if (Array.isArray(parsed.sources)) {
            aiSources.push(...parsed.sources);
          }
        }
      } catch (parseErr) {
        console.warn(`[diet] JSON parse failed for day ${day}:`, parseErr.message);
      }
    }

    // ── 7. Build complete response ──
    const explanation = dailyPlans.length > 0
      ? `This ${n.durationDays}-day plan is aligned with your ${goal.toLowerCase()} goal, ${n.computed.cat} BMI category, and daily target of ${calories} kcal. Each day keeps the meal structure consistent so the plan is easier to follow.`
      : 'AI service temporarily unavailable. Please try again later.';

    const tips = [
      `Follow portion sizes closely to stay on track with your ${goal.toLowerCase()} target.`,
      'Drink water regularly throughout the day and avoid sugary drinks.',
      'Prepare meals in advance where possible.',
    ];
    if (n.allergies) tips.push(`Double-check ingredients to avoid these allergens: ${n.allergies}.`);
    if (n.conditions) tips.push(`Monitor how meals affect your health conditions: ${n.conditions}.`);

    // Merge knowledge base sources + AI-reported sources
    const mergedSources = _deduplicateSources([...context.sources, ...aiSources]);

    const responseData = {
      dailyPlans,
      explanation,
      tips: tips.slice(0, 4),
      disclaimer: 'This diet plan is for informational purposes only and does not replace professional medical advice.',
      sources: mergedSources,
      confidence: dailyPlans.length > 0
        ? Math.min(0.9, 0.5 + (context.guidelines.length * 0.1) + (context.nutrition.length * 0.05))
        : 0.0,
    };

    // ── 8. Schema validation ──
    const validation = validateDietResponse(responseData);
    if (validation.errors.length > 0) {
      console.warn('[diet] Schema validation warnings:', validation.errors);
    }

    const latencyMs = timer.stop();

    // ── 9. Async logging ──
    logGeneration({
      userId, type: 'diet', rawInput, normalizedInput: n,
      systemComputed,
      latencyMs,
      success: dailyPlans.length > 0,
      error: dailyPlans.length === 0 ? 'No plans generated' : null,
      outputPreview: JSON.stringify(dailyPlans[0] || {}).substring(0, 500),
      metadata: {
        durationDays: n.durationDays,
        plansGenerated: dailyPlans.length,
        validationErrors: validation.errors,
        contextStats: {
          guidelines: context.guidelines.length,
          nutrition: context.nutrition.length,
          recipes: context.recipes.length,
          sources: mergedSources.length,
        },
        confidence: responseData.confidence,
      },
    });

    // ── 10. Respond ──
    return send(res, success(validation.data));

  } catch (err) {
    const latencyMs = timer.stop();
    logGeneration({
      userId: req.user?.uid || 'anonymous', type: 'diet',
      rawInput: req.body, normalizedInput: req.normalizedBody || {},
      systemComputed: {}, latencyMs, success: false,
      error: err.message, outputPreview: '',
    });
    console.error('[diet] Unhandled error:', err);
    return send(res, error('Failed to generate diet plan. Please try again later.'));
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function _deduplicateSources(sources) {
  const seen = new Set();
  return sources.filter((s) => {
    if (!s?.id) return false;
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
}
