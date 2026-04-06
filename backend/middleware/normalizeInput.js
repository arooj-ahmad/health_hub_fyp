/**
 * Input Normalization Middleware
 * ─────────────────────────────────────────────────────────────────────────────
 * Standardizes ALL user inputs BEFORE controller logic runs.
 *
 * Purpose:
 *   - Eliminate variant spellings (e.g. "veryActive" → "very_active")
 *   - Canonicalize health conditions (e.g. "type 2 diabetes" → "type2_diabetes")
 *   - Ensure numeric fields are actual numbers
 *   - Trim/lowercase strings where appropriate
 *   - Produce a clean, predictable structure for AI prompts
 *
 * The normalized data is stored on req.normalizedBody so the original
 * req.body remains untouched (important for snapshot logging).
 *
 * RAG-READY: Consistent normalization ensures embedding similarity
 * works correctly when comparing historical inputs.
 */

// ── Activity Level Map ──────────────────────────────────────────────────────
// Maps every known variant to a canonical value.

const ACTIVITY_LEVEL_MAP = {
  // sedentary variants
  'sedentary': 'sedentary',
  'inactive': 'sedentary',
  'not active': 'sedentary',
  'none': 'sedentary',
  'no activity': 'sedentary',

  // lightly active variants
  'light': 'lightly_active',
  'lightly active': 'lightly_active',
  'lightly_active': 'lightly_active',
  'lightlyactive': 'lightly_active',
  'light active': 'lightly_active',
  'slightly active': 'lightly_active',

  // moderately active variants
  'moderate': 'moderately_active',
  'moderately active': 'moderately_active',
  'moderately_active': 'moderately_active',
  'moderatelyactive': 'moderately_active',
  'moderate active': 'moderately_active',
  'average': 'moderately_active',

  // active variants
  'active': 'active',
  'very active': 'active',
  'veryactive': 'active',
  'very_active': 'active',
  'highly active': 'active',
  'high': 'active',

  // extra active variants
  'extra active': 'extra_active',
  'extraactive': 'extra_active',
  'extra_active': 'extra_active',
  'athlete': 'extra_active',
  'professional athlete': 'extra_active',
  'intense': 'extra_active',
};

// ── Health Conditions Map ───────────────────────────────────────────────────

const CONDITION_MAP = {
  // Diabetes variants
  'diabetes': 'type2_diabetes',
  'diabetic': 'type2_diabetes',
  'type 2 diabetes': 'type2_diabetes',
  'type2 diabetes': 'type2_diabetes',
  'type 2': 'type2_diabetes',
  'type2': 'type2_diabetes',
  't2d': 'type2_diabetes',
  'type 1 diabetes': 'type1_diabetes',
  'type1 diabetes': 'type1_diabetes',
  'type 1': 'type1_diabetes',
  'type1': 'type1_diabetes',
  't1d': 'type1_diabetes',
  'gestational diabetes': 'gestational_diabetes',
  'sugar': 'type2_diabetes',
  'sugar problem': 'type2_diabetes',

  // Hypertension variants
  'hypertension': 'hypertension',
  'high blood pressure': 'hypertension',
  'high bp': 'hypertension',
  'bp high': 'hypertension',
  'hbp': 'hypertension',
  'blood pressure': 'hypertension',

  // Cholesterol variants
  'high cholesterol': 'hyperlipidemia',
  'cholesterol': 'hyperlipidemia',
  'hyperlipidemia': 'hyperlipidemia',
  'dyslipidemia': 'hyperlipidemia',
  'lipid disorder': 'hyperlipidemia',

  // Heart variants
  'heart disease': 'cardiovascular',
  'heart condition': 'cardiovascular',
  'cardiac': 'cardiovascular',
  'cardiovascular': 'cardiovascular',
  'heart problem': 'cardiovascular',

  // Kidney variants
  'kidney disease': 'kidney_disease',
  'ckd': 'kidney_disease',
  'renal': 'kidney_disease',
  'kidney problem': 'kidney_disease',

  // Thyroid variants
  'thyroid': 'hypothyroidism',
  'hypothyroid': 'hypothyroidism',
  'hypothyroidism': 'hypothyroidism',
  'hyperthyroid': 'hyperthyroidism',
  'hyperthyroidism': 'hyperthyroidism',

  // PCOS
  'pcos': 'pcos',
  'polycystic ovary': 'pcos',
  'polycystic ovarian syndrome': 'pcos',

  // Anemia
  'anemia': 'anemia',
  'anaemia': 'anemia',
  'iron deficiency': 'anemia',
  'low iron': 'anemia',

  // Celiac
  'celiac': 'celiac_disease',
  'celiac disease': 'celiac_disease',
  'gluten intolerance': 'celiac_disease',

  // Gout
  'gout': 'gout',
  'uric acid': 'gout',
  'high uric acid': 'gout',
};

// ── Gender normalization ────────────────────────────────────────────────────

const GENDER_MAP = {
  'male': 'male',
  'm': 'male',
  'man': 'male',
  'boy': 'male',
  'female': 'female',
  'f': 'female',
  'woman': 'female',
  'girl': 'female',
  'other': 'other',
  'non-binary': 'other',
  'nonbinary': 'other',
};

// ── Goal normalization ──────────────────────────────────────────────────────

const GOAL_MAP = {
  'weight loss': 'Weight Loss',
  'lose weight': 'Weight Loss',
  'lose': 'Weight Loss',
  'loss': 'Weight Loss',
  'reduce weight': 'Weight Loss',
  'slim down': 'Weight Loss',
  'weight gain': 'Weight Gain',
  'gain weight': 'Weight Gain',
  'gain': 'Weight Gain',
  'bulk': 'Weight Gain',
  'bulk up': 'Weight Gain',
  'increase weight': 'Weight Gain',
  'maintain': 'Maintain',
  'maintenance': 'Maintain',
  'maintain weight': 'Maintain',
  'stay same': 'Maintain',
};

// ═════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Normalize a string value using a lookup map.
 * @param {string} value
 * @param {object} map
 * @param {string} [fallback]
 * @returns {string}
 */
export function normalizeFromMap(value, map, fallback = '') {
  if (!value || typeof value !== 'string') return fallback;
  const key = value.trim().toLowerCase().replace(/[-_\s]+/g, ' ');
  return map[key] || fallback || value.trim();
}

/**
 * Normalize activity level to a canonical value.
 */
export function normalizeActivityLevel(raw) {
  return normalizeFromMap(raw, ACTIVITY_LEVEL_MAP, 'moderately_active');
}

/**
 * Normalize a comma-separated conditions string into canonical IDs.
 * Returns both the normalized array and a joined string.
 */
export function normalizeConditions(raw) {
  if (!raw || typeof raw !== 'string') return { array: [], string: '' };

  const parts = raw.split(/[,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  const normalized = parts.map((p) => CONDITION_MAP[p] || p.replace(/\s+/g, '_'));
  const unique = [...new Set(normalized)];

  return {
    array: unique,
    string: unique.join(', '),
  };
}

/**
 * Normalize gender string.
 */
export function normalizeGender(raw) {
  return normalizeFromMap(raw, GENDER_MAP, 'male');
}

/**
 * Normalize goal string.
 */
export function normalizeGoal(raw) {
  return normalizeFromMap(raw, GOAL_MAP, 'Maintain');
}

/**
 * Ensure a value is a positive number, with a fallback.
 */
export function ensureNumber(value, fallback = 0) {
  const num = parseFloat(value);
  return isNaN(num) || num < 0 ? fallback : num;
}

/**
 * Normalize a health profile object.
 * Used by diet, recipe, and lab controllers.
 */
export function normalizeProfile(profile = {}) {
  return {
    age: Math.round(ensureNumber(profile.age, 25)),
    gender: normalizeGender(profile.gender),
    height: ensureNumber(profile.height, 170),
    weight: ensureNumber(profile.weight, 70),
    activityLevel: normalizeActivityLevel(profile.activityLevel),
  };
}

/**
 * Normalize allergies string — trim, lowercase, deduplicate.
 */
export function normalizeAllergies(raw) {
  if (!raw || typeof raw !== 'string') return { array: [], string: '' };
  const parts = raw.split(/[,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  const unique = [...new Set(parts)];
  return { array: unique, string: unique.join(', ') };
}

/**
 * Normalize an array of ingredient strings.
 */
export function normalizeIngredients(ingredients) {
  if (!Array.isArray(ingredients)) return [];
  return ingredients
    .map((i) => typeof i === 'string' ? i.trim().toLowerCase() : '')
    .filter(Boolean);
}

// ═════════════════════════════════════════════════════════════════════════════
// EXPRESS MIDDLEWARE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Express middleware that normalizes diet-related input.
 * Attaches req.normalizedBody (leaves req.body untouched for snapshots).
 */
export function normalizeDietInput(req, res, next) {
  const body = req.body || {};
  const profile = body.profile || {};
  const computed = body.computed || {};

  const normalizedProfile = normalizeProfile(profile);
  const normalizedConditions = normalizeConditions(body.conditions);
  const normalizedAllergies = normalizeAllergies(body.allergies);
  const normalizedGoal = normalizeGoal(body.selectedGoal || computed.goal);

  req.normalizedBody = {
    profile: normalizedProfile,
    computed: {
      bmi: ensureNumber(computed.bmi, 22),
      cat: computed.cat || 'Normal',
      goal: normalizedGoal,
      tw: ensureNumber(computed.tw, normalizedProfile.weight),
      cal: Math.round(ensureNumber(computed.cal, 2000)),
    },
    selectedGoal: normalizedGoal,
    durationDays: Math.min(Math.max(Math.round(ensureNumber(body.durationDays, 1)), 1), 30),
    conditions: normalizedConditions.string,
    conditionsArray: normalizedConditions.array,
    allergies: normalizedAllergies.string,
    allergiesArray: normalizedAllergies.array,
    conditionAdaptations: Array.isArray(body.conditionAdaptations) ? body.conditionAdaptations : [],
    exclusionList: Array.isArray(body.exclusionList) ? body.exclusionList : [],
  };

  next();
}

/**
 * Express middleware that normalizes recipe-related input.
 */
export function normalizeRecipeInput(req, res, next) {
  const body = req.body || {};
  const userProfile = body.userProfile || {};

  req.normalizedBody = {
    ingredients: normalizeIngredients(body.ingredients),
    userProfile: {
      ...normalizeProfile(userProfile),
      bmi: ensureNumber(userProfile.bmi, 22),
      bmiCategory: userProfile.bmiCategory || 'Normal',
      conditions: normalizeConditions(userProfile.conditions).string,
      allergies: normalizeAllergies(userProfile.allergies).string,
      goal: normalizeGoal(userProfile.goal),
      calories: Math.round(ensureNumber(userProfile.calories, 2000)),
    },
    riskAnalysis: {
      suggestedSubstitutions: Array.isArray(body.riskAnalysis?.suggestedSubstitutions) ? body.riskAnalysis.suggestedSubstitutions : [],
      problemIngredients: Array.isArray(body.riskAnalysis?.problemIngredients) ? body.riskAnalysis.problemIngredients : [],
    },
    userOverrode: Boolean(body.userOverrode),
  };

  next();
}

/**
 * Express middleware that normalizes chat input.
 */
export function normalizeChatInput(req, res, next) {
  const body = req.body || {};
  const messages = Array.isArray(body.messages) ? body.messages : [];

  req.normalizedBody = {
    messages: messages
      .filter((m) => m && typeof m.content === 'string' && m.content.trim())
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content.trim(),
      })),
  };

  next();
}

/**
 * Express middleware that normalizes lab input.
 */
export function normalizeLabInput(req, res, next) {
  const body = req.body || {};
  const hp = body.healthProfile || {};

  req.normalizedBody = {
    labMode: (body.labMode || '').toUpperCase() === 'PDF' ? 'PDF' : 'MANUAL',
    labValues: body.labValues || {},
    pdfText: typeof body.pdfText === 'string' ? body.pdfText.trim() : '',
    healthProfile: normalizeProfile(hp),
  };

  next();
}

export default {
  normalizeDietInput,
  normalizeRecipeInput,
  normalizeChatInput,
  normalizeLabInput,
  normalizeProfile,
  normalizeActivityLevel,
  normalizeConditions,
  normalizeGender,
  normalizeGoal,
  normalizeAllergies,
  normalizeIngredients,
  ensureNumber,
};
