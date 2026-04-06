/**
 * Nutrition Analysis Service
 *
 * Step 3: AI health-risk analysis
 * Step 4/5: Safety decision helpers
 */

import { generateAIResponse } from '@/services/aiService';
import { HALAL_VIOLATIONS } from '../utils/ingredientHelpers';

// ============================================================================
// STEP 3 — AI HEALTH RISK ANALYSIS
// ============================================================================

/**
 * Analyse health risks for given ingredients against user profile.
 */
export const analyzeHealthRisks = async (normalizedIngredients, userProfile, restrictedIngredients) => {
  const prompt = `You are a nutrition health risk analyzer for a Pakistani cooking health app.

IMPORTANT: You must analyze health risks ONLY. Do NOT generate recipes.

User Health Profile:
- Age: ${userProfile.age}
- Gender: ${userProfile.gender}
- Height: ${userProfile.height} cm
- Weight: ${userProfile.weight} kg
- BMI: ${userProfile.bmi} (${userProfile.bmiCategory})
- Health Conditions: ${userProfile.conditions || 'None'}
- Allergies: ${userProfile.allergies || 'None'}
- Goal: ${userProfile.goal}
- Daily Calorie Target: ${userProfile.calories} kcal

Ingredients to analyze:
${normalizedIngredients.join(', ')}

System-restricted ingredients:
${restrictedIngredients.length > 0 ? restrictedIngredients.join(', ') : 'None'}

Analyze each ingredient for:
1. Allergy conflicts (CRITICAL)
2. Medical condition conflicts (e.g., sugar for diabetes, salt for hypertension)
3. Cooking method risks (deep fried → cholesterol/heart risk)
4. Nutritional concerns for BMI category
5. Halal compliance (pork, alcohol = CRITICAL)

Classify as:
- CRITICAL: allergens, halal violations, severe medical conflicts
- WARNING: moderate health concerns that can be mitigated with cooking methods or substitution
- SAFE: no significant risk

Return ONLY a JSON object (no markdown, no explanation):
{
  "safeIngredients": ["ingredient1", "ingredient2"],
  "problemIngredients": [
    {"ingredient": "ingredient_name", "reason": "clear simple explanation", "severity": "CRITICAL or WARNING"}
  ],
  "riskExplanation": "Brief overall summary in simple English for Pakistani users",
  "hasCriticalRisk": true/false,
  "suggestedSubstitutions": [
    {"original": "unhealthy_item", "replacement": "healthier_item", "reason": "why this is better"}
  ]
}`;

  try {
    const response = await generateAIResponse(prompt);
    
    // Check if AI response was successful
    if (!response?.success) {
      console.warn('AI health risk analysis skipped, using local fallback:', response?.error);
      return localHealthCheck(normalizedIngredients, userProfile, restrictedIngredients);
    }
    
    const cleaned = response.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      safeIngredients: parsed.safeIngredients || normalizedIngredients,
      problemIngredients: parsed.problemIngredients || [],
      riskExplanation: parsed.riskExplanation || '',
      hasCriticalRisk: parsed.hasCriticalRisk || false,
      suggestedSubstitutions: parsed.suggestedSubstitutions || [],
    };
  } catch (error) {
    console.warn('Health risk analysis failed, using local fallback:', error.message);
    return localHealthCheck(normalizedIngredients, userProfile, restrictedIngredients);
  }
};

// ============================================================================
// LOCAL FALLBACK HEALTH CHECK
// ============================================================================

export function localHealthCheck(ingredients, profile, restricted) {
  const problems = [];
  const safe = [];
  const conditions = (profile.conditions || '').toLowerCase();
  const allergies = (profile.allergies || '').toLowerCase();

  for (const ing of ingredients) {
    const lower = ing.toLowerCase();
    let flagged = false;

    // Halal check
    if (HALAL_VIOLATIONS.some((h) => lower.includes(h))) {
      problems.push({ ingredient: ing, reason: 'Not halal - cannot be used', severity: 'CRITICAL' });
      flagged = true;
    }

    // Allergy check
    if (allergies && allergies !== 'none') {
      const allergyList = allergies.split(',').map((a) => a.trim().toLowerCase());
      for (const allergy of allergyList) {
        if (allergy && lower.includes(allergy)) {
          problems.push({ ingredient: ing, reason: `Matches your allergy: ${allergy}`, severity: 'CRITICAL' });
          flagged = true;
        }
      }
    }

    // Restricted check
    if (restricted.some((r) => lower.includes(r.toLowerCase()) || r.toLowerCase().includes(lower))) {
      problems.push({ ingredient: ing, reason: 'This ingredient is restricted for your health condition', severity: 'WARNING' });
      flagged = true;
    }

    // Condition checks
    if (conditions.includes('diabetes') && ['sugar', 'cheeni', 'jaggery', 'honey', 'maida'].includes(lower)) {
      problems.push({ ingredient: ing, reason: 'May spike blood sugar levels (diabetes concern)', severity: 'WARNING' });
      flagged = true;
    }
    if ((conditions.includes('blood pressure') || conditions.includes('hypertension')) && ['salt', 'namak', 'pickle', 'achar'].includes(lower)) {
      problems.push({ ingredient: ing, reason: 'High sodium can raise blood pressure', severity: 'WARNING' });
      flagged = true;
    }

    if (!flagged) safe.push(ing);
  }

  const hasCritical = problems.some((p) => p.severity === 'CRITICAL');
  return {
    safeIngredients: safe,
    problemIngredients: problems,
    riskExplanation:
      problems.length > 0
        ? 'Some ingredients may not be suitable for your health conditions. Please review the warnings below.'
        : 'All ingredients appear safe for your health profile.',
    hasCriticalRisk: hasCritical,
    suggestedSubstitutions: [],
  };
}
