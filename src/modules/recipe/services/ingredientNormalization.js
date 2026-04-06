/**
 * Ingredient Normalization Service
 *
 * Steps 1 & 2: Smart ingredient normalisation (spelling, Urdu→English, dupes)
 * and Pakistani context mapping.
 */

import { generateAIResponse } from '@/services/aiService';
import { mapPakistaniContext } from '../utils/ingredientHelpers';

// ============================================================================
// STEP 1 — AI-powered normalisation
// ============================================================================

/**
 * Normalize raw user ingredient input using AI.
 * Fixes spelling, Urdu→English, abbreviations, duplicates.
 * @param {string} rawInput - e.g. "chkn, potatos, tmato, anda, chawal"
 * @returns {Promise<{normalized: string[], original: string}>}
 */
export const normalizeIngredients = async (rawInput) => {
  const prompt = `You are a smart ingredient normalizer for a Pakistani cooking app.

The user typed these ingredients (may contain spelling mistakes, Urdu words, abbreviations, duplicates):

"${rawInput}"

Tasks:
1. Fix all spelling mistakes
2. Convert Urdu/informal names to standard English ingredient names
3. Detect variations and map to single name
4. Remove duplicates

Common mappings:
- chkn / chiken → chicken
- anda / anday → egg
- chawal → rice
- aloo / aaloo → potato
- tmato / tamatar → tomato
- dahi → yogurt
- roti / chapati → whole wheat flatbread
- sabzi → vegetables
- gosht → meat
- pyaz → onion
- lehsan → garlic
- adrak → ginger
- mirch → chili pepper
- haldi → turmeric
- zeera → cumin
- dhaniya → coriander
- palak → spinach
- bhindi → okra
- gobi → cauliflower
- matar → peas
- dal / daal → lentils
- maida → white flour
- atta → whole wheat flour
- ghee → clarified butter
- tel → oil
- namak → salt
- cheeni → sugar

Return ONLY a JSON object in this exact format (no markdown, no explanation):
{"normalized": ["ingredient1", "ingredient2", "ingredient3"]}`;

  try {
    const response = await generateAIResponse(prompt);
    
    // Check if AI response was successful
    if (!response?.success) {
      console.warn('AI ingredient normalization skipped:', response?.error);
      // Fallback: simple split and trim
      const fallback = rawInput
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      return { normalized: [...new Set(fallback)], original: rawInput };
    }
    
    const cleaned = response.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      normalized: parsed.normalized || [],
      original: rawInput,
    };
  } catch (error) {
    console.warn('Ingredient normalization failed:', error.message);
    // Fallback: simple split and trim
    const fallback = rawInput
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    return { normalized: [...new Set(fallback)], original: rawInput };
  }
};

// Re-export context mapping from utils so callers can import from same place
export { mapPakistaniContext };
