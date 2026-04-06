/**
 * Recipe Controller — v2 (Data-Aware)
 * ─────────────────────────────────────────────────────────────────────────────
 * Pipeline: Normalize → Validate → RAG hooks → AI → Schema Validate → Log → Respond
 */

import { generateAIResponse } from '../services/ai/aiService.js';
import { buildContext } from '../services/rag/contextBuilder.js';
import { retrieve } from '../services/rag/retrievalLayer.js';
import { injectMetadata } from '../services/rag/metadataInjector.js';
import { cleanAIJSON } from '../utils/promptSanitizer.js';
import { success, error, send } from '../utils/responseFormatter.js';
import { validateRecipeResponse } from '../utils/schemaValidator.js';
import { logGeneration, createTimer } from '../services/logging/aiLogger.js';

export async function generateRecipes(req, res) {
  const timer = createTimer();

  try {
    const n = req.normalizedBody;
    const rawInput = req.body;

    if (!n || !n.ingredients || n.ingredients.length === 0) {
      return send(res, error('Missing or empty ingredients array', 400));
    }
    if (!n.userProfile) {
      return send(res, error('Missing userProfile', 400));
    }

    const userId = req.user?.uid || 'anonymous';
    const { suggestedSubstitutions, problemIngredients } = n.riskAnalysis;

    // ── RAG hooks ──
    const context = await buildContext({ userId, type: 'recipe' });
    const retrievedDocs = await retrieve({ query: n.ingredients.join(', '), type: 'recipe' });

    // ── Build prompt ──
    const substitutionText = suggestedSubstitutions.length > 0
      ? `\nSuggested healthier substitutions (USE these in recipes where possible):\n${suggestedSubstitutions.map((s) => `- ${s.original} → ${s.replacement} (${s.reason})`).join('\n')}`
      : '';

    const warningText = n.userOverrode
      ? `\nIMPORTANT: The user has overridden health warnings. Still try to:
- Reduce quantities of flagged ingredients
- Use healthier cooking methods (grilling, baking, steaming, boiling, air frying)
- Avoid deep frying
- Apply the suggested substitutions where possible
Problem ingredients the user insisted on: ${problemIngredients.map((p) => p.ingredient).join(', ')}`
      : '';

    const rawPrompt = `You are an advanced AI Recipe Generator for SmartNutrition, a Pakistani health-focused cooking app.

=== SYSTEM RULES ===
- The BMI, BMI Category, Goal, and Daily Calorie Target are PRE-CALCULATED by the backend.
- You must NOT recalculate BMI, change the goal, or modify the calorie target.
- Use values EXACTLY as provided.
- ALL recipes must be 100% HALAL (no pork, no alcohol, no non-halal meat).
- NEVER include allergens.
- Recipes must be safe for the user's health conditions.

=== USER HEALTH PROFILE ===
Age: ${n.userProfile.age}
Gender: ${n.userProfile.gender}
Height: ${n.userProfile.height} cm
Weight: ${n.userProfile.weight} kg
BMI: ${n.userProfile.bmi}
BMI Category: ${n.userProfile.bmiCategory}
Health Conditions: ${n.userProfile.conditions || 'None'}
Allergies: ${n.userProfile.allergies || 'None'}
Goal: ${n.userProfile.goal}
Daily Calorie Target: ${n.userProfile.calories} kcal

=== AVAILABLE INGREDIENTS ===
${n.ingredients.join(', ')}
${substitutionText}
${warningText}

=== RECIPE REQUIREMENTS ===
Generate EXACTLY 4 different healthy recipes.
Each must be: healthy, simple, affordable, HALAL, Pakistani-practical.
Prefer: grilling, baking, steaming, boiling, air frying. Avoid deep frying.

=== OUTPUT FORMAT ===
Return ONLY a JSON object (no markdown fences, no extra text):
{
  "recipes": [
    {
      "name": "...", "cookingTime": "...", "difficulty": "Easy",
      "servings": 2, "caloriesPerServing": 380,
      "ingredients": [{"item": "...", "quantity": "..."}],
      "instructions": ["Step 1...", "Step 2..."],
      "macronutrients": {"protein": "28g", "carbohydrates": "45g", "fats": "10g", "fiber": "3g"},
      "healthNote": "..."
    }
  ],
  "healthierAlternatives": [{"original": "...", "healthier": "...", "benefit": "..."}],
  "disclaimer": "..."
}

Generate exactly 4 recipes with different styles (curry, salad/side, rice dish, soup/stew).`;

    const prompt = injectMetadata({ prompt: rawPrompt, context, retrievedDocs });

    // ── Call AI ──
    const aiResponse = await generateAIResponse({
      prompt, type: 'recipe', userId, options: { maxTokens: 4000 },
    });

    let responseData;
    if (!aiResponse?.success) {
      responseData = {
        recipes: [], healthierAlternatives: [],
        disclaimer: 'AI service temporarily unavailable. Please try again later.',
      };
    } else {
      const cleaned = cleanAIJSON(aiResponse.content);
      if (!cleaned) {
        responseData = {
          recipes: [], healthierAlternatives: [],
          disclaimer: 'Failed to parse AI response. Please try again.',
        };
      } else {
        try {
          const parsed = JSON.parse(cleaned);
          responseData = {
            recipes: parsed.recipes || [],
            healthierAlternatives: parsed.healthierAlternatives || [],
            disclaimer: parsed.disclaimer || 'This suggestion is for informational purposes only.',
          };
        } catch (parseErr) {
          console.warn('[recipe] JSON parse failed:', parseErr.message);
          responseData = {
            recipes: [], healthierAlternatives: [],
            disclaimer: 'Failed to parse recipe data. Please try again.',
          };
        }
      }
    }

    // ── Schema validation ──
    const validation = validateRecipeResponse(responseData);
    const latencyMs = timer.stop();

    // ── Async logging ──
    logGeneration({
      userId, type: 'recipe', rawInput, normalizedInput: n,
      systemComputed: { bmi: n.userProfile.bmi, goal: n.userProfile.goal, calories: n.userProfile.calories },
      latencyMs,
      success: validation.data?.recipes?.length > 0,
      error: validation.data?.recipes?.length === 0 ? 'No recipes generated' : null,
      outputPreview: JSON.stringify((validation.data?.recipes || [])[0] || {}).substring(0, 500),
      metadata: {
        ingredientCount: n.ingredients.length,
        recipesGenerated: validation.data?.recipes?.length || 0,
        validationErrors: validation.errors,
      },
    });

    return send(res, success(validation.data));

  } catch (err) {
    const latencyMs = timer.stop();
    logGeneration({
      userId: req.user?.uid || 'anonymous', type: 'recipe',
      rawInput: req.body, normalizedInput: req.normalizedBody || {},
      systemComputed: {}, latencyMs, success: false,
      error: err.message, outputPreview: '',
    });
    console.error('[recipe] Unhandled error:', err);
    return send(res, error('Failed to generate recipes. Please try again later.'));
  }
}
