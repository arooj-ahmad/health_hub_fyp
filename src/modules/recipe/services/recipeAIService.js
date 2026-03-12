/**
 * Recipe AI Service
 *
 * Steps 7-10: Healthy recipe generation with halal rules, nutrition balancing,
 * ingredient substitution, and Pakistani cooking context.
 *
 * Uses the existing shared aiService (which supports Groq, Gemini, OpenAI, Anthropic).
 */

import { generateAIResponse } from '@/services/aiService';

// ============================================================================
// STEP 7-10 — RECIPE GENERATION
// ============================================================================

/**
 * Generate exactly 4 healthy recipes using AI.
 */
export const generateHealthyRecipes = async (ingredients, userProfile, riskAnalysis, userOverrode = false) => {
  const { suggestedSubstitutions, problemIngredients } = riskAnalysis;

  const substitutionText =
    suggestedSubstitutions.length > 0
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

  const prompt = `You are an advanced AI Recipe Generator for SmartNutrition, a Pakistani health-focused cooking app.

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
Health Conditions: ${userProfile.conditions || 'None'}
Allergies: ${userProfile.allergies || 'None'}
Goal: ${userProfile.goal}
Daily Calorie Target: ${userProfile.calories} kcal

=== AVAILABLE INGREDIENTS ===
${ingredients.join(', ')}
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
        {"item": "chicken breast", "quantity": "150g"},
        {"item": "rice", "quantity": "1 cup"},
        {"item": "tomato", "quantity": "1 medium"},
        {"item": "oil", "quantity": "1 tablespoon"}
      ],
      "instructions": [
        "Wash the rice and soak for 10 minutes.",
        "Heat oil in a pan on medium heat.",
        "Add chicken pieces and cook for 5 minutes until light brown.",
        "Add chopped tomato and cook until soft.",
        "Add rice, water, and salt. Cook on low heat until rice is done."
      ],
      "macronutrients": {
        "protein": "28g",
        "carbohydrates": "45g",
        "fats": "10g",
        "fiber": "3g"
      },
      "healthNote": "This recipe uses grilled chicken and vegetables, providing protein and fiber while keeping calories moderate for your weight loss goal."
    }
  ],
  "healthierAlternatives": [
    {"original": "white rice", "healthier": "brown rice", "benefit": "More fiber and slower digestion"},
    {"original": "butter", "healthier": "olive oil", "benefit": "Heart-healthy unsaturated fats"}
  ],
  "disclaimer": "This suggestion is for informational purposes only and does not replace professional medical advice."
}

Generate exactly 4 recipes. Make each recipe different in style (e.g., one curry, one salad/side, one rice dish, one soup/stew).`;

  try {
    const response = await generateAIResponse(prompt);
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      recipes: parsed.recipes || [],
      healthierAlternatives: parsed.healthierAlternatives || [],
      disclaimer: parsed.disclaimer || 'This suggestion is for informational purposes only and does not replace professional medical advice.',
    };
  } catch (error) {
    console.error('Recipe generation failed:', error);
    throw new Error('Failed to generate recipes. Please try again.');
  }
};
