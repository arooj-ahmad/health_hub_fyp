/**
 * Recipe Controller
 * ─────────────────────────────────────────────────────────────────────────────
 * Orchestrates healthy recipe generation:
 *   Request → Validate → (RAG hooks) → Build prompt → AI Service → Parse → Respond
 *
 * Ported from: src/modules/recipe/services/recipeAIService.js
 */

import { generateAIResponse } from '../services/ai/aiService.js';
import { buildContext } from '../services/rag/contextBuilder.js';
import { retrieve } from '../services/rag/retrievalLayer.js';
import { injectMetadata } from '../services/rag/metadataInjector.js';
import { sanitizeInput, cleanAIJSON } from '../utils/promptSanitizer.js';
import { success, error, send } from '../utils/responseFormatter.js';

export async function generateRecipes(req, res) {
  try {
    const {
      ingredients, userProfile,
      riskAnalysis = { suggestedSubstitutions: [], problemIngredients: [] },
      userOverrode = false,
    } = req.body;

    // ── Validate ──
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return send(res, error('Missing or empty ingredients array', 400));
    }
    if (!userProfile) {
      return send(res, error('Missing userProfile', 400));
    }

    const userId = req.user?.uid || 'anonymous';
    const { suggestedSubstitutions, problemIngredients } = riskAnalysis;

    // ── RAG hooks ──
    const context = await buildContext({ userId, type: 'recipe' });
    const retrievedDocs = await retrieve({ query: ingredients.join(', '), type: 'recipe' });

    // ── Build prompt (ported from recipeAIService.js) ──
    const substitutionText = suggestedSubstitutions.length > 0
      ? `\nSuggested healthier substitutions (USE these in recipes where possible):\n${suggestedSubstitutions.map((s) => `- ${s.original} → ${s.replacement} (${s.reason})`).join('\n')}`
      : '';

    const warningText = userOverrode
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
Age: ${userProfile.age}
Gender: ${userProfile.gender}
Height: ${userProfile.height} cm
Weight: ${userProfile.weight} kg
BMI: ${userProfile.bmi}
BMI Category: ${userProfile.bmiCategory}
Health Conditions: ${sanitizeInput(userProfile.conditions || 'None')}
Allergies: ${sanitizeInput(userProfile.allergies || 'None')}
Goal: ${userProfile.goal}
Daily Calorie Target: ${userProfile.calories} kcal

=== AVAILABLE INGREDIENTS ===
${ingredients.map((i) => sanitizeInput(i)).join(', ')}
${substitutionText}
${warningText}

=== RECIPE REQUIREMENTS ===

Generate EXACTLY 4 different healthy recipes.

Each recipe must be:
- Healthy and nutritionally balanced
- Simple to cook (beginner-friendly)
- Affordable and practical for Pakistani households
- Using ingredients commonly available in Pakistan
- Following halal dietary rules strictly
- Written in simple, clear English that Pakistani users can understand
- Roughly fitting the user's daily calorie target (each recipe = ~1/3 to 1/4 of daily calories)

Prefer healthy cooking methods:
- Grilling, baking, steaming, boiling, air frying
- Avoid deep frying where possible

=== NUTRITION BALANCING ===
Consider:
- Adequate protein intake
- Appropriate carbohydrate level for the goal
- Healthy fats
- Fiber content
- Avoid excessive sugar, salt, and saturated fat

=== INGREDIENT SUBSTITUTION ===
If any user ingredient is unhealthy for their condition, automatically substitute:
- white rice → brown rice
- butter → olive oil
- fried chicken → grilled chicken
- cream → yogurt
- maida (white flour) → whole wheat flour (atta)
- full cream milk → low fat milk
- sugar → stevia or small amount of honey

=== OUTPUT FORMAT ===

Return ONLY a JSON object (no markdown fences, no extra text):
{
  "recipes": [
    {
      "name": "Simple clear recipe name",
      "cookingTime": "30 minutes",
      "difficulty": "Easy",
      "servings": 2,
      "caloriesPerServing": 380,
      "ingredients": [
        {"item": "chicken breast", "quantity": "150g"}
      ],
      "instructions": [
        "Step 1...",
        "Step 2..."
      ],
      "macronutrients": {
        "protein": "28g",
        "carbohydrates": "45g",
        "fats": "10g",
        "fiber": "3g"
      },
      "healthNote": "..."
    }
  ],
  "healthierAlternatives": [
    {"original": "white rice", "healthier": "brown rice", "benefit": "More fiber and slower digestion"}
  ],
  "disclaimer": "This suggestion is for informational purposes only and does not replace professional medical advice."
}

Generate exactly 4 recipes. Make each recipe different in style (e.g., one curry, one salad/side, one rice dish, one soup/stew).`;

    const prompt = injectMetadata({ prompt: rawPrompt, context, retrievedDocs });

    // ── Call AI ──
    const aiResponse = await generateAIResponse({
      prompt,
      type: 'recipe',
      userId,
      options: { maxTokens: 4000 },
    });

    if (!aiResponse?.success) {
      return send(res, success({
        recipes: [],
        healthierAlternatives: [],
        disclaimer: 'AI service temporarily unavailable. Please try again later.',
      }));
    }

    // ── Parse response ──
    const cleaned = cleanAIJSON(aiResponse.content);
    if (!cleaned) {
      return send(res, success({
        recipes: [],
        healthierAlternatives: [],
        disclaimer: 'Failed to parse AI response. Please try again.',
      }));
    }

    try {
      const parsed = JSON.parse(cleaned);

      return send(res, success({
        recipes: parsed.recipes || [],
        healthierAlternatives: parsed.healthierAlternatives || [],
        disclaimer: parsed.disclaimer || 'This suggestion is for informational purposes only.',
      }));
    } catch (parseErr) {
      console.warn('[recipe] JSON parse failed:', parseErr.message);
      return send(res, success({
        recipes: [],
        healthierAlternatives: [],
        disclaimer: 'Failed to parse recipe data. Please try again.',
      }));
    }
  } catch (err) {
    console.error('[recipe] Unhandled error:', err);
    return send(res, error('Failed to generate recipes. Please try again later.'));
  }
}
